"""Core configuration and environment settings."""

from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "RAG Evaluation Platform"
    environment: str = "development"
    log_level: str = "INFO"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Storage & Database (SQLite local default / PostgreSQL with pgvector / Supabase)
    database_url: str = "sqlite+aiosqlite:///./backend.db"
    supabase_url: str | None = None
    supabase_key: str | None = None

    # LLM Providers: Groq
    groq_api_key: str | None = None
    groq_generator_model: str = "openai/gpt-oss-120b"
    groq_judge_model: str = "qwen/qwen3.6-27b"
    groq_fast_model: str = "openai/gpt-oss-20b"

    # LLM & Embedding Providers: Nebius AI Token Factory
    nebius_api_key: str | None = None
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1/"
    nebius_generator_model: str = "meta-llama/Llama-3.3-70B-Instruct"
    nebius_embedding_model: str = "Qwen/Qwen3-Embedding-8B"

    # LLM & Embedding Providers: OpenAI
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_generator_model: str = "gpt-4o-mini"

    # Active Provider Selections
    primary_llm_provider: Literal["groq", "nebius", "openai"] = "groq"
    judge_llm_provider: Literal["groq", "nebius", "openai"] = "groq"
    embedding_provider: Literal["local", "nebius", "openai"] = "local"

    # Local Embeddings & Reranking Settings
    local_embedding_model: str = "BAAI/bge-base-en-v1.5"
    embedding_dim: int = 768
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    top_k_retrieval: int = 20
    top_k_reranked: int = 5


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
