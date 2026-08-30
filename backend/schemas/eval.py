"""Pydantic schemas for Evaluation traces, judge metrics, and quality reports."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class EvalRunResponse(BaseModel):
    id: uuid.UUID
    trace_id: uuid.UUID
    judge_model: str
    faithfulness: float | None
    answer_relevance: float | None
    context_precision: float | None
    context_recall: float | None
    judge_critique: str | None
    eval_latency_ms: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class QueryTraceResponse(BaseModel):
    id: uuid.UUID
    collection_id: uuid.UUID | None
    query_text: str
    generated_answer: str | None
    confidence_score: float | None
    generator_model: str | None
    latency_ms: float | None
    created_at: datetime
    eval_runs: list[EvalRunResponse] = []

    model_config = {"from_attributes": True}


class AggregateEvalMetrics(BaseModel):
    total_traces: int
    evaluated_traces: int
    mean_faithfulness: float
    mean_answer_relevance: float
    mean_context_precision: float
    avg_query_latency_ms: float
