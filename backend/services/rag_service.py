"""RAG Service orchestrating dense retrieval, multi-query fusion, reranking, generation, and tracing."""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import ResourceNotFoundError
from backend.generation.generator import RAGGenerator
from backend.providers.base import LLMProvider, EmbeddingProvider
from backend.repositories.collection_repo import CollectionRepository
from backend.repositories.trace_repo import TraceRepository
from backend.repositories.vector_repo import VectorRepository
from backend.retrieval.fusion import reciprocal_rank_fusion, reorder_lost_in_middle
from backend.retrieval.reranker import PassageReranker
from backend.schemas.query import CitedChunk, QueryResponse
from backend.storage.vector_store import SearchResult


class RAGService:
    def __init__(
        self,
        session: AsyncSession,
        embedding_provider: EmbeddingProvider,
        llm_provider: LLMProvider,
        reranker: PassageReranker | None = None,
    ):
        self.session = session
        self.embedding_provider = embedding_provider
        self.llm_provider = llm_provider
        self.reranker = reranker or PassageReranker()
        self.col_repo = CollectionRepository(session)
        self.vec_repo = VectorRepository(session)
        self.trace_repo = TraceRepository(session)
        self.generator = RAGGenerator(llm_provider)

    async def generate_query_variations(self, query: str) -> list[str]:
        """Generate 3 alternative rephrasings of the input query for RAG-Fusion."""
        prompt = (
            f'Generate 3 distinct alternative search queries for the same underlying question.\n'
            f'Return ONLY a JSON array of 3 strings, nothing else.\n'
            f'Example: ["alternative query 1", "alternative query 2", "alternative query 3"]\n\n'
            f'Original Query: {query}'
        )
        try:
            json_res = await self.llm_provider.generate_json(
                prompt=prompt,
                system_prompt="You are a query expansion assistant. Always respond with a JSON array.",
                temperature=0.7,
            )
            # Handle list directly
            if isinstance(json_res, list):
                variations = [str(q) for q in json_res if q and str(q) != query][:3]
                if variations:
                    return variations
            # Handle dict like {"queries": [...]} or {"variations": [...]}
            elif isinstance(json_res, dict):
                for key in ("queries", "variations", "alternatives", "rephrasing"):
                    val = json_res.get(key)
                    if isinstance(val, list):
                        variations = [str(q) for q in val if q and str(q) != query][:3]
                        if variations:
                            return variations
        except Exception:
            pass
        # Graceful fallback: return just the original query if nothing parsed
        return [query]

    async def _retrieve_passages(
        self,
        collection_id: uuid.UUID,
        query_text: str,
        retrieval_limit: int,
        enable_multi_query: bool = False,
    ) -> list[SearchResult]:
        """Retrieve passages using single dense query or Multi-Query RAG-Fusion."""
        if not enable_multi_query:
            query_emb = await self.embedding_provider.embed_query(query_text)
            return await self.vec_repo.search_similar(
                collection_id=collection_id,
                query_embedding=query_emb,
                limit=retrieval_limit,
            )

        # Multi-Query Expansion
        sub_queries = await self.generate_query_variations(query_text)
        all_queries = [query_text] + [q for q in sub_queries if q != query_text]

        ranking_streams: list[list[tuple[uuid.UUID, float]]] = []
        passage_map: dict[uuid.UUID, SearchResult] = {}

        for q in all_queries:
            q_emb = await self.embedding_provider.embed_query(q)
            results = await self.vec_repo.search_similar(
                collection_id=collection_id,
                query_embedding=q_emb,
                limit=retrieval_limit,
            )
            stream: list[tuple[uuid.UUID, float]] = []
            for r in results:
                stream.append((r.passage_id, r.similarity_score))
                passage_map[r.passage_id] = r
            ranking_streams.append(stream)

        fused = reciprocal_rank_fusion(ranking_streams)
        fused_passages: list[SearchResult] = []
        for passage_id, rrf_score in fused[:retrieval_limit]:
            item = passage_map[passage_id]
            # Attach fused RRF score
            item.similarity_score = float(rrf_score)
            fused_passages.append(item)

        return fused_passages

    async def answer_query(
        self,
        collection_name: str,
        query_text: str,
        top_k: int = 5,
        enable_reranker: bool = True,
        enable_multi_query: bool = False,
        enable_lost_in_middle_reorder: bool = True,
        model_override: str | None = None,
    ) -> QueryResponse:
        # 1. Resolve Collection
        collection = await self.col_repo.get_by_name(collection_name)
        if not collection:
            raise ResourceNotFoundError("Collection", collection_name)

        # 2. Dense Vector Retrieval / Multi-Query Fusion
        retrieval_limit = top_k * 3 if enable_reranker else top_k
        raw_results = await self._retrieve_passages(
            collection_id=collection.id,
            query_text=query_text,
            retrieval_limit=retrieval_limit,
            enable_multi_query=enable_multi_query,
        )

        # 3. Optional Precision Reranking
        final_passages = raw_results
        rerank_scores: dict[uuid.UUID, float] = {}

        if enable_reranker and raw_results:
            reranked = await self.reranker.rerank(
                query=query_text,
                results=raw_results,
                top_k=top_k,
            )
            final_passages = [r.search_result for r in reranked]
            rerank_scores = {r.search_result.passage_id: r.rerank_score for r in reranked}
        else:
            final_passages = raw_results[:top_k]

        # 4. Lost-in-the-Middle Context Reordering
        if enable_lost_in_middle_reorder and final_passages:
            final_passages = reorder_lost_in_middle(final_passages)

        # 5. Generate Grounded Answer
        gen_res = await self.generator.generate_answer(
            query=query_text,
            retrieved_passages=final_passages,
            model=model_override,
        )

        # 6. Log Query Trace
        passage_ids = [p.passage_id for p in final_passages]
        trace = await self.trace_repo.create_trace(
            collection_id=collection.id,
            query_text=query_text,
            retrieved_passage_ids=passage_ids,
            prompt_used=None,
            generated_answer=gen_res.answer,
            confidence_score=None,
            generator_model=gen_res.model,
            latency_ms=gen_res.latency_ms,
        )

        # 7. Format Response
        citations = [
            CitedChunk(
                passage_id=p.passage_id,
                document_id=p.document_id,
                chunk_index=p.chunk_index,
                text=p.text,
                parent_text=p.parent_text,
                similarity_score=p.similarity_score,
                rerank_score=rerank_scores.get(p.passage_id),
                metadata=p.metadata,
            )
            for p in final_passages
        ]

        return QueryResponse(
            trace_id=trace.id,
            query=query_text,
            answer=gen_res.answer,
            citations=citations,
            model=gen_res.model,
            latency_ms=gen_res.latency_ms,
            prompt_tokens=gen_res.prompt_tokens,
            completion_tokens=gen_res.completion_tokens,
        )

    async def answer_query_stream(
        self,
        collection_name: str,
        query_text: str,
        top_k: int = 5,
        enable_reranker: bool = True,
        enable_multi_query: bool = False,
        enable_lost_in_middle_reorder: bool = True,
        model_override: str | None = None,
    ):
        """Yield retrieval citations first, then stream LLM answer tokens, and yield final trace metadata."""
        import time
        from backend.generation.generator import SYSTEM_PROMPT

        collection = await self.col_repo.get_by_name(collection_name)
        if not collection:
            cols, _ = await self.col_repo.list_all(limit=1)
            if cols:
                collection = cols[0]
            else:
                yield {"type": "citations", "citations": []}
                yield {"type": "token", "token": "No indexed document collections found in the database. Please ingest a PDF or text document via the Ingestion tab first."}
                yield {"type": "done", "trace_id": str(uuid.uuid4()), "latency_ms": 0, "generated_answer": "No collections found."}
                return

        retrieval_limit = top_k * 3 if enable_reranker else top_k
        raw_results = await self._retrieve_passages(
            collection_id=collection.id,
            query_text=query_text,
            retrieval_limit=retrieval_limit,
            enable_multi_query=enable_multi_query,
        )

        rerank_scores: dict[uuid.UUID, float] = {}
        if enable_reranker and raw_results:
            reranked = await self.reranker.rerank(
                query=query_text,
                results=raw_results,
                top_k=top_k,
            )
            final_passages = [r.search_result for r in reranked]
            rerank_scores = {r.search_result.passage_id: r.rerank_score for r in reranked}
        else:
            final_passages = raw_results[:top_k]

        if not final_passages:
            yield {"type": "citations", "citations": []}
            yield {"type": "token", "token": f"No relevant content found in collection '{collection.name}' for your query. Try uploading relevant documents or asking another question."}
            trace = await self.trace_repo.create_trace(
                collection_id=collection.id,
                query_text=query_text,
                retrieved_passage_ids=[],
                generated_answer="No relevant content found.",
                generator_model=model_override or getattr(self.llm_provider, "default_model", "default"),
                latency_ms=0,
            )
            yield {"type": "done", "trace_id": str(trace.id), "latency_ms": 0, "generated_answer": "No relevant content found."}
            return

        if enable_lost_in_middle_reorder and final_passages:
            final_passages = reorder_lost_in_middle(final_passages)

        citations = [
            CitedChunk(
                passage_id=p.passage_id,
                document_id=p.document_id,
                chunk_index=p.chunk_index,
                text=p.text,
                parent_text=p.parent_text,
                similarity_score=p.similarity_score,
                rerank_score=rerank_scores.get(p.passage_id),
                metadata=p.metadata,
            )
            for p in final_passages
        ]

        yield {"type": "citations", "citations": [c.model_dump(mode="json") for c in citations]}

        context_str = self.generator._build_context_prompt(final_passages)
        user_prompt = f"Context:\n{context_str}\n\nQuestion: {query_text}\n\nAnswer (with citations):"

        start_time = time.perf_counter()
        full_text = []

        async for token in self.llm_provider.generate_stream(
            prompt=user_prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=0.0,
            model=model_override,
        ):
            full_text.append(token)
            yield {"type": "token", "token": token}

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        generated_answer = "".join(full_text)

        passage_ids = [p.passage_id for p in final_passages]
        trace = await self.trace_repo.create_trace(
            collection_id=collection.id,
            query_text=query_text,
            retrieved_passage_ids=passage_ids,
            prompt_used=None,
            generated_answer=generated_answer,
            confidence_score=None,
            generator_model=model_override or getattr(self.llm_provider, "default_model", "default"),
            latency_ms=elapsed_ms,
        )

        yield {
            "type": "done",
            "trace_id": str(trace.id),
            "generated_answer": generated_answer,
            "context_texts": [p.text for p in final_passages],
            "latency_ms": elapsed_ms,
        }
