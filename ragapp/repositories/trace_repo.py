"""Repository for Query traces and Evaluation run results."""

import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ragapp.storage.models import QueryTrace, EvalRun


class TraceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_trace(
        self,
        collection_id: uuid.UUID | None,
        query_text: str,
        retrieved_passage_ids: list[uuid.UUID],
        prompt_used: str | None,
        generated_answer: str | None,
        confidence_score: float | None,
        generator_model: str | None,
        latency_ms: float | None,
    ) -> QueryTrace:
        str_ids = [str(u) for u in retrieved_passage_ids]
        trace = QueryTrace(
            id=uuid.uuid4(),
            collection_id=collection_id,
            query_text=query_text,
            retrieved_passage_ids=str_ids,
            prompt_used=prompt_used,
            generated_answer=generated_answer,
            confidence_score=confidence_score,
            generator_model=generator_model,
            latency_ms=latency_ms,
        )
        self.session.add(trace)
        await self.session.flush()
        return trace

    async def add_eval_run(
        self,
        trace_id: uuid.UUID,
        judge_model: str,
        faithfulness: float | None,
        answer_relevance: float | None,
        context_precision: float | None,
        context_recall: float | None,
        judge_critique: str | None,
        eval_latency_ms: float | None,
    ) -> EvalRun:
        eval_run = EvalRun(
            id=uuid.uuid4(),
            trace_id=trace_id,
            judge_model=judge_model,
            faithfulness=faithfulness,
            answer_relevance=answer_relevance,
            context_precision=context_precision,
            context_recall=context_recall,
            judge_critique=judge_critique,
            eval_latency_ms=eval_latency_ms,
        )
        self.session.add(eval_run)
        await self.session.flush()
        return eval_run

    async def list_traces(self, limit: int = 50, offset: int = 0) -> list[QueryTrace]:
        stmt = (
            select(QueryTrace)
            .options(selectinload(QueryTrace.eval_runs))
            .order_by(QueryTrace.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_unevaluated_traces(self, limit: int = 20) -> list[QueryTrace]:
        stmt = (
            select(QueryTrace)
            .options(selectinload(QueryTrace.eval_runs))
            .outerjoin(EvalRun, QueryTrace.id == EvalRun.trace_id)
            .where(EvalRun.id.is_(None))
            .where(QueryTrace.generated_answer.is_not(None))
            .order_by(QueryTrace.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


    async def get_mean_eval_metrics(self) -> dict[str, float]:
        stmt = select(
            func.count(QueryTrace.id).label("total_traces"),
            func.count(EvalRun.id).label("evaluated_traces"),
            func.avg(EvalRun.faithfulness).label("mean_faithfulness"),
            func.avg(EvalRun.answer_relevance).label("mean_answer_relevance"),
            func.avg(EvalRun.context_precision).label("mean_context_precision"),
            func.avg(EvalRun.context_recall).label("mean_context_recall"),
            func.avg(QueryTrace.latency_ms).label("avg_query_latency_ms"),
        ).select_from(QueryTrace).outerjoin(EvalRun, QueryTrace.id == EvalRun.trace_id)

        result = await self.session.execute(stmt)
        row = result.one()
        return {
            "total_traces": float(row.total_traces or 0),
            "evaluated_traces": float(row.evaluated_traces or 0),
            "mean_faithfulness": float(row.mean_faithfulness or 0.0),
            "mean_answer_relevance": float(row.mean_answer_relevance or 0.0),
            "mean_context_precision": float(row.mean_context_precision or 0.0),
            "mean_context_recall": float(row.mean_context_recall or 0.0),
            "avg_query_latency_ms": float(row.avg_query_latency_ms or 0.0),
        }
