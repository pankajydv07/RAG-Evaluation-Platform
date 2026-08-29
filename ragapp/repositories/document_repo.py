"""Repository for Document entity database operations."""

import uuid
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ragapp.storage.models import Document


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        collection_id: uuid.UUID,
        source_uri: str,
        content_hash: str,
        loader_type: str,
        chunking_strategy: str,
        chunk_count: int = 0,
        load_status: str = "ok",
        error_detail: str | None = None,
    ) -> Document:
        doc = Document(
            id=uuid.uuid4(),
            collection_id=collection_id,
            source_uri=source_uri,
            content_hash=content_hash,
            loader_type=loader_type,
            chunking_strategy=chunking_strategy,
            chunk_count=chunk_count,
            load_status=load_status,
            error_detail=error_detail,
        )
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def get_by_hash(
        self, collection_id: uuid.UUID, content_hash: str
    ) -> Document | None:
        stmt = (
            select(Document)
            .where(Document.collection_id == collection_id)
            .where(Document.content_hash == content_hash)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, document_id: uuid.UUID) -> Document | None:
        stmt = select(Document).where(Document.id == document_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, document_id: uuid.UUID) -> bool:
        stmt = delete(Document).where(Document.id == document_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0
