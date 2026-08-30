"""Pydantic schemas for Collection resources."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Unique collection name")
    description: str | None = Field(default=None, description="Optional collection description")


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    chunk_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionListResponse(BaseModel):
    items: list[CollectionResponse]
    total: int
