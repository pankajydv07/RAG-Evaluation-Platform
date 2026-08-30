"""Vector and Hybrid Store querying using pgvector and SQLAlchemy."""

import uuid
from typing import Any
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.storage.models import Passage


class SearchResult(BaseModel):
    passage_id: uuid.UUID
    document_id: uuid.UUID
    collection_id: uuid.UUID
    chunk_index: int
    text: str
    parent_text: str | None = None
    similarity_score: float
    metadata: dict[str, Any] = {}


class PgVectorStore:
    """Async pgvector repository for document passages."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_passages(
        self,
        passages: list[dict[str, Any]],
    ) -> list[uuid.UUID]:
        """Insert a batch of passages with embeddings."""
        created_ids = []
        for p in passages:
            passage = Passage(
                id=p.get("id", uuid.uuid4()),
                document_id=p["document_id"],
                collection_id=p["collection_id"],
                chunk_index=p["chunk_index"],
                text=p["text"],
                parent_text=p.get("parent_text"),
                token_count=p.get("token_count", 0),
                embedding=p.get("embedding"),
                metadata_=p.get("metadata", {}),
            )
            self.session.add(passage)
            created_ids.append(passage.id)
        await self.session.flush()
        return created_ids

    async def search_vector(
        self,
        collection_id: uuid.UUID,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[SearchResult]:
        """Perform cosine distance vector search over passages in a collection."""
        # cosine_distance: 0 means identical, 2 means opposite.
        # similarity = 1 - cosine_distance (or 1 / (1 + distance))
        distance_col = Passage.embedding.cosine_distance(query_embedding)
        stmt = (
            select(
                Passage.id,
                Passage.document_id,
                Passage.collection_id,
                Passage.chunk_index,
                Passage.text,
                Passage.parent_text,
                distance_col.label("distance"),
                Passage.metadata_,
            )
            .where(Passage.collection_id == collection_id)
            .where(Passage.embedding.is_not(None))
            .order_by(distance_col)
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        results: list[SearchResult] = []
        for row in rows:
            # Cosine similarity calculation: 1.0 - distance
            similarity = max(0.0, 1.0 - float(row.distance))
            results.append(
                SearchResult(
                    passage_id=row.id,
                    document_id=row.document_id,
                    collection_id=row.collection_id,
                    chunk_index=row.chunk_index,
                    text=row.text,
                    parent_text=row.parent_text,
                    similarity_score=similarity,
                    metadata=row.metadata_ or {},
                )
            )
        return results
