"""Pydantic schemas for RAG Queries, Citations, and Retrieval."""

import uuid
from typing import Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    collection_name: str
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    enable_reranker: bool = True
    enable_multi_query: bool = False
    enable_lost_in_middle_reorder: bool = True
    provider: str | None = None  # "groq" or "nebius" (defaults to app config)
    model: str | None = None


class CitedChunk(BaseModel):
    passage_id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    text: str
    parent_text: str | None = None
    similarity_score: float
    rerank_score: float | None = None
    metadata: dict[str, Any] = {}


class QueryResponse(BaseModel):
    trace_id: uuid.UUID
    query: str
    answer: str
    citations: list[CitedChunk]
    model: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
