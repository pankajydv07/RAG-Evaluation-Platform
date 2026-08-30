"""Pydantic schemas for Head-to-Head Model A/B Testing."""

import uuid
from typing import Literal
from pydantic import BaseModel, Field


class ABTestRequest(BaseModel):
    collection_name: str
    query: str = Field(..., min_length=1)
    provider_a: Literal["groq", "nebius"] = "groq"
    model_a: str | None = None
    provider_b: Literal["groq", "nebius"] = "nebius"
    model_b: str | None = None
    judge_provider: Literal["groq", "nebius"] = "groq"
    judge_model: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class ModelOutput(BaseModel):
    provider: str
    model: str
    answer: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int


class JudgeVerdict(BaseModel):
    winner: Literal["A", "B", "tie"]
    judge_model: str
    model_a_score: float = Field(ge=0.0, le=1.0)
    model_b_score: float = Field(ge=0.0, le=1.0)
    critique: str
    eval_latency_ms: float = 0.0


class ABTestResponse(BaseModel):
    test_id: uuid.UUID
    query: str
    model_a_result: ModelOutput
    model_b_result: ModelOutput
    judge_evaluation: JudgeVerdict
