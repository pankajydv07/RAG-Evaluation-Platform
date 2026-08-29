"""Main API router combining all versioned sub-routers."""

from fastapi import APIRouter
from ragapp.api.v1.collections import router as collections_router
from ragapp.api.v1.documents import router as documents_router
from ragapp.api.v1.query import router as query_router
from ragapp.api.v1.eval import router as eval_router
from ragapp.api.v1.ab_test import router as ab_test_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(collections_router)
api_router.include_router(documents_router)
api_router.include_router(query_router)
api_router.include_router(eval_router)
api_router.include_router(ab_test_router)
