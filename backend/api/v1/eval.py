"""API endpoints for fetching evaluation traces and metrics summary."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db_session
from backend.providers.factory import get_llm_provider
from backend.schemas.eval import AggregateEvalMetrics, QueryTraceResponse
from backend.services.eval_service import EvalService

router = APIRouter(prefix="/eval", tags=["Evaluation"])


@router.get("/summary", response_model=AggregateEvalMetrics)
async def get_evaluation_summary(
    session: AsyncSession = Depends(get_db_session),
):
    judge_provider = get_llm_provider(role="judge")
    service = EvalService(session, judge_provider)
    return await service.get_metrics_summary()


@router.get("/traces", response_model=list[QueryTraceResponse])
async def list_evaluation_traces(
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_db_session),
):
    judge_provider = get_llm_provider(role="judge")
    service = EvalService(session, judge_provider)
    traces, _ = await service.list_traces(offset=offset, limit=limit)
    return traces


@router.post("/evaluate-pending")
async def evaluate_pending_traces(
    limit: int = 10,
    session: AsyncSession = Depends(get_db_session),
):
    """Trigger background or on-demand judge evaluations for unevaluated traces."""
    judge_provider = get_llm_provider(role="judge")
    service = EvalService(session, judge_provider)
    count = await service.evaluate_all_pending_traces(limit=limit)
    return {"status": "ok", "evaluated_count": count}


