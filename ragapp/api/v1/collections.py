"""API endpoints for collection lifecycle management."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ragapp.core.database import get_db_session
from ragapp.core.exceptions import DuplicateResourceError, ResourceNotFoundError, to_http_exception
from ragapp.repositories.collection_repo import CollectionRepository
from ragapp.schemas.collection import CollectionCreate, CollectionResponse, CollectionListResponse

router = APIRouter(prefix="/collections", tags=["Collections"])


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    session: AsyncSession = Depends(get_db_session),
):
    repo = CollectionRepository(session)
    existing = await repo.get_by_name(payload.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Collection '{payload.name}' already exists.",
        )
    created = await repo.create(name=payload.name, description=payload.description)
    return CollectionResponse.model_validate(created)


@router.get("", response_model=CollectionListResponse)
async def list_collections(
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_db_session),
):
    repo = CollectionRepository(session)
    items, total = await repo.list_all(offset=offset, limit=limit)
    return CollectionListResponse(
        items=[CollectionResponse.model_validate(c) for c in items],
        total=total,
    )


@router.get("/{collection_name}", response_model=CollectionResponse)
async def get_collection(
    collection_name: str,
    session: AsyncSession = Depends(get_db_session),
):
    repo = CollectionRepository(session)
    col = await repo.get_by_name(collection_name)
    if not col:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection '{collection_name}' not found.",
        )
    return CollectionResponse.model_validate(col)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
):
    repo = CollectionRepository(session)
    deleted = await repo.delete(collection_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found.",
        )
