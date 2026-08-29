"""API endpoints for executing grounded RAG queries."""

import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from ragapp.core.database import get_db_session, get_session_factory
from ragapp.core.exceptions import DomainException, to_http_exception
from ragapp.providers.factory import get_embedding_provider, get_llm_provider
from ragapp.schemas.query import QueryRequest, QueryResponse
from ragapp.services.eval_service import EvalService
from ragapp.services.rag_service import RAGService

router = APIRouter(prefix="/query", tags=["Query & RAG"])


async def run_background_eval(
    trace_id,
    query_text: str,
    context_texts: list[str],
    generated_answer: str,
):
    """Background task to run LLM-as-a-judge without blocking user response."""
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            judge_provider = get_llm_provider(role="judge")
            eval_service = EvalService(session, judge_provider)
            await eval_service.evaluate_trace_async(
                trace_id=trace_id,
                context_texts=context_texts,
                query_text=query_text,
                generated_answer=generated_answer,
            )
            await session.commit()
    except Exception as exc:
        # Avoid crashing app from background eval task
        print(f"Background evaluation error on trace {trace_id}: {exc}")


@router.post("", response_model=QueryResponse, status_code=status.HTTP_200_OK)
async def query_rag(
    payload: QueryRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        embedding_provider = get_embedding_provider()
        llm_provider = get_llm_provider(role="generator")
        service = RAGService(
            session=session,
            embedding_provider=embedding_provider,
            llm_provider=llm_provider,
        )

        response = await service.answer_query(
            collection_name=payload.collection_name,
            query_text=payload.query,
            top_k=payload.top_k,
            enable_reranker=payload.enable_reranker,
            model_override=payload.model,
        )

        # Trigger asynchronous evaluation in background
        context_texts = [c.text for c in response.citations]
        background_tasks.add_task(
            run_background_eval,
            response.trace_id,
            response.query,
            context_texts,
            response.answer,
        )

        return response
    except DomainException as exc:
        raise to_http_exception(exc)
