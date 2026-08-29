"""RAG Service orchestrating dense retrieval, reranking, generation, and tracing."""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from ragapp.core.exceptions import ResourceNotFoundError
from ragapp.generation.generator import RAGGenerator
from ragapp.providers.base import LLMProvider, EmbeddingProvider
from ragapp.repositories.collection_repo import CollectionRepository
from ragapp.repositories.trace_repo import TraceRepository
from ragapp.repositories.vector_repo import VectorRepository
from ragapp.retrieval.reranker import PassageReranker
from ragapp.schemas.query import CitedChunk, QueryResponse


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

    async def answer_query(
        self,
        collection_name: str,
        query_text: str,
        top_k: int = 5,
        enable_reranker: bool = True,
        model_override: str | None = None,
    ) -> QueryResponse:
        # 1. Resolve Collection
        collection = await self.col_repo.get_by_name(collection_name)
        if not collection:
            raise ResourceNotFoundError("Collection", collection_name)

        # 2. Dense Vector Retrieval
        query_emb = await self.embedding_provider.embed_query(query_text)
        retrieval_limit = top_k * 3 if enable_reranker else top_k
        raw_results = await self.vec_repo.search_similar(
            collection_id=collection.id,
            query_embedding=query_emb,
            limit=retrieval_limit,
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

        # 4. Generate Grounded Answer
        gen_res = await self.generator.generate_answer(
            query=query_text,
            retrieved_passages=final_passages,
            model=model_override,
        )

        # 5. Log Query Trace
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

        # 6. Format Response
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
