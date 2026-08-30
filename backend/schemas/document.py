"""Pydantic schemas for Document ingestion and status."""

import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class DocumentTextIngest(BaseModel):
    collection_name: str
    text: str = Field(..., min_length=1)
    source_uri: str = Field(default="direct_text_input")
    chunking_strategy: Literal["sentence", "hierarchical", "sliding"] = "sentence"
    chunk_size: int = Field(default=256, ge=32, le=2048)


class DocumentWebIngest(BaseModel):
    collection_name: str
    url: str
    chunking_strategy: Literal["sentence", "hierarchical", "sliding"] = "sentence"
    chunk_size: int = Field(default=256, ge=32, le=2048)


class DocumentResponse(BaseModel):
    id: uuid.UUID
    collection_id: uuid.UUID
    source_uri: str
    content_hash: str
    loader_type: str
    chunking_strategy: str
    chunk_count: int
    load_status: str
    error_detail: str | None
    loaded_at: datetime

    model_config = {"from_attributes": True}


class IngestionSummary(BaseModel):
    document_id: uuid.UUID
    collection_id: uuid.UUID
    collection_name: str
    chunks_created: int
    source_uri: str
    loader_type: str
    status: str
