"""API endpoints for Model A/B Testing and Comparative Evaluation."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db_session
from backend.core.exceptions import DomainException, to_http_exception
from backend.providers.factory import get_embedding_provider
from backend.schemas.ab_test import ABTestRequest, ABTestResponse
from backend.services.ab_service import ABTestingService

router = APIRouter(prefix="/eval/ab-test", tags=["A/B Testing & Evaluation"])


@router.post("", response_model=ABTestResponse, status_code=status.HTTP_200_OK)
async def run_ab_test_endpoint(
    payload: ABTestRequest,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        embedding_provider = get_embedding_provider()
        service = ABTestingService(session=session, embedding_provider=embedding_provider)
        return await service.run_ab_test(payload)
    except DomainException as exc:
        raise to_http_exception(exc)
