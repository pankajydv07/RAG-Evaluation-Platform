"""Configuration management for RAG Evaluation Platform."""

from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    environment: str = "development"
    log_level: str = "INFO"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Storage & DB (Supabase / Postgres with pgvector)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ragapp"
    supabase_url: str | None = None
    supabase_key: str | None = None

    # LLM Providers: Groq
    groq_api_key: str | None = None
    groq_generator_model: str = "llama-3.3-70b-versatile"
    groq_judge_model: str = "qwen-qwq-32b"
    groq_fast_model: str = "llama3-8b-8192"

    # LLM & Embedding Provider: Nebius AI Token Factory (OpenAI-compatible)
    # Docs: https://tokenfactory.nebius.com/endpoints
    nebius_api_key: str | None = None
    nebius_base_url: str = "https://api.studio.nebius.ai/v1"
    nebius_generator_model: str = "meta-llama/Llama-3.3-70B-Instruct"
    nebius_embedding_model: str = "BAAI/bge-en-v1.5"

    # Active Provider Selections
    primary_llm_provider: Literal["groq", "nebius"] = "groq"
    judge_llm_provider: Literal["groq", "nebius"] = "groq"
    embedding_provider: Literal["local", "nebius"] = "local"

    # Local Embeddings & Reranking
    local_embedding_model: str = "BAAI/bge-base-en-v1.5"
    embedding_dim: int = 768
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    top_k_retrieval: int = 20
    top_k_reranked: int = 5


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
