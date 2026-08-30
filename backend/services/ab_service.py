"""Service for orchestrating concurrent model execution and A/B comparative evaluation."""

import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import ResourceNotFoundError
from backend.eval.ab_judge import ComparativeJudge
from backend.generation.generator import RAGGenerator
from backend.providers.base import EmbeddingProvider, LLMProvider
from backend.providers.factory import get_llm_provider
from backend.repositories.collection_repo import CollectionRepository
from backend.repositories.vector_repo import VectorRepository
from backend.retrieval.reranker import PassageReranker
from backend.schemas.ab_test import ABTestRequest, ABTestResponse, ModelOutput


class ABTestingService:
    def __init__(
        self,
        session: AsyncSession,
        embedding_provider: EmbeddingProvider,
        reranker: PassageReranker | None = None,
    ):
        self.session = session
        self.embedding_provider = embedding_provider
        self.reranker = reranker or PassageReranker()
        self.col_repo = CollectionRepository(session)
        self.vec_repo = VectorRepository(session)

    async def run_ab_test(self, req: ABTestRequest) -> ABTestResponse:
        # 1. Resolve collection
        collection = await self.col_repo.get_by_name(req.collection_name)
        if not collection:
            raise ResourceNotFoundError("Collection", req.collection_name)

        # 2. Retrieve passages
        query_emb = await self.embedding_provider.embed_query(req.query)
        raw_passages = await self.vec_repo.search_similar(
            collection_id=collection.id,
            query_embedding=query_emb,
            limit=req.top_k * 2,
        )

        # 3. Rerank
        if raw_passages:
            reranked = await self.reranker.rerank(
                query=req.query,
                results=raw_passages,
                top_k=req.top_k,
            )
            final_passages = [r.search_result for r in reranked]
        else:
            final_passages = raw_passages[:req.top_k]

        context_texts = [p.text for p in final_passages]

        # 4. Instantiate providers
        provider_a = get_llm_provider(role="generator") if req.provider_a == "groq" else get_llm_provider(role="generator")
        # Direct override if specified
        from backend.providers.groq_provider import GroqProvider
        from backend.providers.nebius_provider import NebiusLLMProvider
        from backend.core.config import get_settings

        cfg = get_settings()

        llm_a: LLMProvider = (
            GroqProvider(api_key=cfg.groq_api_key, default_model=req.model_a or cfg.groq_generator_model)
            if req.provider_a == "groq"
            else NebiusLLMProvider(api_key=cfg.nebius_api_key, base_url=cfg.nebius_base_url, default_model=req.model_a or cfg.nebius_generator_model)
        )

        llm_b: LLMProvider = (
            GroqProvider(api_key=cfg.groq_api_key, default_model=req.model_b or cfg.groq_generator_model)
            if req.provider_b == "groq"
            else NebiusLLMProvider(api_key=cfg.nebius_api_key, base_url=cfg.nebius_base_url, default_model=req.model_b or cfg.nebius_generator_model)
        )

        judge_llm: LLMProvider = (
            GroqProvider(api_key=cfg.groq_api_key, default_model=req.judge_model or cfg.groq_judge_model)
            if req.judge_provider == "groq"
            else NebiusLLMProvider(api_key=cfg.nebius_api_key, base_url=cfg.nebius_base_url, default_model=req.judge_model or cfg.nebius_generator_model)
        )

        gen_a = RAGGenerator(llm_a)
        gen_b = RAGGenerator(llm_b)

        # 5. Concurrent execution
        res_a, res_b = await asyncio.gather(
            gen_a.generate_answer(query=req.query, retrieved_passages=final_passages, model=req.model_a),
            gen_b.generate_answer(query=req.query, retrieved_passages=final_passages, model=req.model_b),
        )

        # 6. Comparative Judge Evaluation
        judge = ComparativeJudge(judge_llm)
        verdict = await judge.evaluate_pair(
            query=req.query,
            context_texts=context_texts,
            answer_a=res_a.answer,
            answer_b=res_b.answer,
            judge_model=req.judge_model,
        )

        return ABTestResponse(
            test_id=uuid.uuid4(),
            query=req.query,
            model_a_result=ModelOutput(
                provider=req.provider_a,
                model=res_a.model,
                answer=res_a.answer,
                latency_ms=res_a.latency_ms,
                prompt_tokens=res_a.prompt_tokens,
                completion_tokens=res_a.completion_tokens,
            ),
            model_b_result=ModelOutput(
                provider=req.provider_b,
                model=res_b.model,
                answer=res_b.answer,
                latency_ms=res_b.latency_ms,
                prompt_tokens=res_b.prompt_tokens,
                completion_tokens=res_b.completion_tokens,
            ),
            judge_evaluation=verdict,
        )
