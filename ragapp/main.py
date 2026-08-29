"""FastAPI Application Entrypoint for RAG Evaluation Platform."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from ragapp.api.router import api_router
from ragapp.core.config import get_settings
from ragapp.core.database import Base, get_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown hooks."""
    settings = get_settings()
    engine = get_engine()

    # Create tables if needed on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Clean up engine pool
    await engine.dispose()


def create_application() -> FastAPI:
    """Application factory for FastAPI app."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="Production RAG and Evaluation Platform with Supabase/pgvector, Groq, and Nebius AI",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API Routers
    app.include_router(api_router)

    @app.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "healthy",
            "environment": settings.environment,
            "primary_llm": settings.primary_llm_provider,
            "embedding_provider": settings.embedding_provider,
        }

    # Mount static frontend build if it exists
    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
    if os.path.exists(frontend_dist):
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

    return app


app = create_application()
