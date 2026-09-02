"""Repository for Passage storage and vector similarity search supporting pgvector and SQLite."""

import json
import uuid
from typing import Any
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.storage.models import Passage
from backend.storage.vector_store import SearchResult


def cosine_similarity(a: list[float], b: list[float]) -> float:
    arr_a = np.array(a, dtype=float)
    arr_b = np.array(b, dtype=float)
    dot = np.dot(arr_a, arr_b)
    norm_a = np.linalg.norm(arr_a)
    norm_b = np.linalg.norm(arr_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


class VectorRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def insert_passages(
        self,
        passages: list[dict[str, Any]],
    ) -> list[uuid.UUID]:
        ids = []
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
            ids.append(passage.id)
        await self.session.flush()
        return ids

    async def search_similar(
        self,
        collection_id: uuid.UUID,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[SearchResult]:
        bind = self.session.bind
        dialect_name = bind.dialect.name if bind else "sqlite"

        if dialect_name == "postgresql":
            distance_col = Passage.embedding.op("<=>")(query_embedding)
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
            for r in rows:
                similarity = max(0.0, 1.0 - float(r.distance))
                results.append(
                    SearchResult(
                        passage_id=r.id,
                        document_id=r.document_id,
                        collection_id=r.collection_id,
                        chunk_index=r.chunk_index,
                        text=r.text,
                        parent_text=r.parent_text,
                        similarity_score=similarity,
                        metadata=r.metadata_ or {},
                    )
                )
            return results

        else:
            # Fallback for SQLite: fetch candidate passages and compute cosine distance with numpy
            stmt = (
                select(Passage)
                .where(Passage.collection_id == collection_id)
                .where(Passage.embedding.is_not(None))
            )
            result = await self.session.execute(stmt)
            passages = result.scalars().all()

            scored: list[tuple[Passage, float]] = []
            for p in passages:
                emb = p.embedding
                if isinstance(emb, str):
                    emb = json.loads(emb)
                sim = cosine_similarity(query_embedding, emb)
                scored.append((p, sim))

            scored.sort(key=lambda x: x[1], reverse=True)
            top_passages = scored[:limit]

            results = []
            for p, score in top_passages:
                results.append(
                    SearchResult(
                        passage_id=p.id,
                        document_id=p.document_id,
                        collection_id=p.collection_id,
                        chunk_index=p.chunk_index,
                        text=p.text,
                        parent_text=p.parent_text,
                        similarity_score=score,
                        metadata=p.metadata_ or {},
                    )
                )
            return results
