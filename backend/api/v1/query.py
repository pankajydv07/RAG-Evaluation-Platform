"""API endpoints for executing grounded RAG queries."""

import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db_session, get_session_factory
from backend.core.exceptions import DomainException, to_http_exception
from backend.providers.factory import get_embedding_provider, get_llm_provider
from backend.schemas.query import QueryRequest, QueryResponse
from backend.services.eval_service import EvalService
from backend.services.rag_service import RAGService

router = APIRouter(prefix="/query", tags=["Query & RAG"])


async def run_background_eval(
    trace_id,
    query_text: str,
    context_texts: list[str],
    generated_answer: str,
):
    """Background task to run LLM-as-a-judge without blocking user response."""
    import uuid as _uuid
    try:
        t_id = _uuid.UUID(str(trace_id)) if not isinstance(trace_id, _uuid.UUID) else trace_id
        session_factory = get_session_factory()
        async with session_factory() as session:
            judge_provider = get_llm_provider(role="judge")
            eval_service = EvalService(session, judge_provider)
            await eval_service.evaluate_trace_async(
                trace_id=t_id,
                context_texts=context_texts,
                query_text=query_text,
                generated_answer=generated_answer,
            )
            await session.commit()
            print(f"[EVAL SUCCESS] Evaluated trace {t_id}")
    except Exception as exc:
        print(f"[EVAL ERROR] Background evaluation error on trace {trace_id}: {exc}")



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
            enable_multi_query=payload.enable_multi_query,
            enable_lost_in_middle_reorder=payload.enable_lost_in_middle_reorder,
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


@router.post("/stream", status_code=status.HTTP_200_OK)
async def query_rag_stream(
    payload: QueryRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
):
    """Stream grounded answer tokens via Server-Sent Events (SSE) and trigger background evaluation on completion."""
    from fastapi.responses import StreamingResponse
    import json

    embedding_provider = get_embedding_provider()
    llm_provider = get_llm_provider(role="generator")
    service = RAGService(
        session=session,
        embedding_provider=embedding_provider,
        llm_provider=llm_provider,
    )

    async def event_generator():
        last_done_payload = None
        try:
            async for chunk in service.answer_query_stream(
                collection_name=payload.collection_name,
                query_text=payload.query,
                top_k=payload.top_k,
                enable_reranker=payload.enable_reranker,
                enable_multi_query=payload.enable_multi_query,
                enable_lost_in_middle_reorder=payload.enable_lost_in_middle_reorder,
                model_override=payload.model,
            ):
                if chunk["type"] == "done":
                    last_done_payload = chunk
                yield f"event: {chunk['type']}\ndata: {json.dumps(chunk)}\n\n"
        except Exception as exc:
            import logging
            logging.getLogger("uvicorn.error").exception(f"Error during query streaming: {exc}")
            err_chunk = {"type": "token", "token": f"\n\n[Error: {str(exc)}]"}
            yield f"event: token\ndata: {json.dumps(err_chunk)}\n\n"
            done_chunk = {"type": "done", "trace_id": "", "latency_ms": 0, "generated_answer": str(exc)}
            yield f"event: done\ndata: {json.dumps(done_chunk)}\n\n"
            return

        if last_done_payload and last_done_payload.get("trace_id"):
            asyncio.create_task(
                run_background_eval(
                    last_done_payload["trace_id"],
                    payload.query,
                    last_done_payload.get("context_texts", []),
                    last_done_payload.get("generated_answer", ""),
                )
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )

