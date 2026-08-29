"""Evaluation Service orchestrating LLM-as-a-judge scoring and quality reports."""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from ragapp.core.exceptions import ResourceNotFoundError
from ragapp.evaluation.judge import LLMJudge
from ragapp.providers.base import LLMProvider
from ragapp.repositories.trace_repo import TraceRepository
from ragapp.schemas.eval import AggregateEvalMetrics, EvalRunResponse, QueryTraceResponse


class EvalService:
    def __init__(
        self,
        session: AsyncSession,
        judge_provider: LLMProvider,
    ):
        self.session = session
        self.judge_provider = judge_provider
        self.trace_repo = TraceRepository(session)
        self.judge = LLMJudge(judge_provider)

    async def evaluate_trace_async(
        self,
        trace_id: uuid.UUID,
        context_texts: list[str],
        query_text: str,
        generated_answer: str,
        judge_model: str | None = None,
    ) -> EvalRunResponse:
        score = await self.judge.evaluate_trace(
            query=query_text,
            context_texts=context_texts,
            generated_answer=generated_answer,
            model=judge_model,
        )

        eval_run = await self.trace_repo.add_eval_run(
            trace_id=trace_id,
            judge_model=score.judge_model,
            faithfulness=score.faithfulness,
            answer_relevance=score.answer_relevance,
            context_precision=score.context_precision,
            context_recall=None,
            judge_critique=score.critique,
            eval_latency_ms=score.eval_latency_ms,
        )

        return EvalRunResponse.model_validate(eval_run)

    async def get_metrics_summary(self) -> AggregateEvalMetrics:
        stats = await self.trace_repo.get_mean_eval_metrics()
        return AggregateEvalMetrics(**stats)

    async def evaluate_all_pending_traces(self, limit: int = 10) -> int:
        from sqlalchemy import select
        from ragapp.storage.models import Passage
        
        pending_traces = await self.trace_repo.get_unevaluated_traces(limit=limit)
        evaluated_count = 0
        for trace in pending_traces:
            try:
                # Resolve context texts from passage IDs
                passage_ids = [uuid.UUID(str(pid)) for pid in (trace.retrieved_passage_ids or [])]
                if passage_ids:
                    stmt = select(Passage.text).where(Passage.id.in_(passage_ids))
                    res = await self.session.execute(stmt)
                    context_texts = list(res.scalars().all())
                else:
                    context_texts = []

                await self.evaluate_trace_async(
                    trace_id=trace.id,
                    context_texts=context_texts,
                    query_text=trace.query_text,
                    generated_answer=trace.generated_answer or "",
                )
                evaluated_count += 1
            except Exception as e:
                await self.session.rollback()
                print(f"[EVAL PENDING ERROR] Failed on trace {getattr(trace, 'id', 'unknown')}: {e}")
        
        try:
            await self.session.commit()
        except Exception:
            await self.session.rollback()
        return evaluated_count


    async def list_traces(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[list[QueryTraceResponse], int]:
        traces = await self.trace_repo.list_traces(offset=offset, limit=limit)
        return [QueryTraceResponse.model_validate(t) for t in traces], len(traces)

