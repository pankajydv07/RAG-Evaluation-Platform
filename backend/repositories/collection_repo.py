"""Repository for Collection entity database operations."""

import uuid
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.storage.models import Collection


class CollectionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, name: str, description: str | None = None) -> Collection:
        collection = Collection(
            id=uuid.uuid4(),
            name=name,
            description=description,
        )
        self.session.add(collection)
        await self.session.flush()
        return collection

    async def get_by_id(self, collection_id: uuid.UUID) -> Collection | None:
        stmt = select(Collection).where(Collection.id == collection_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Collection | None:
        stmt = select(Collection).where(Collection.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, offset: int = 0, limit: int = 50) -> tuple[list[Collection], int]:
        count_stmt = select(func.count(Collection.id))
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = select(Collection).order_by(Collection.created_at.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def delete(self, collection_id: uuid.UUID) -> bool:
        stmt = delete(Collection).where(Collection.id == collection_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def increment_chunk_count(self, collection_id: uuid.UUID, delta: int) -> None:
        col = await self.get_by_id(collection_id)
        if col:
            col.chunk_count += delta
            await self.session.flush()
