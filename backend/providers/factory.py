"""Factory for creating LLM and Embedding provider instances."""

from backend.config import Settings, get_settings
from backend.providers.base import LLMProvider, EmbeddingProvider
from backend.providers.groq_provider import GroqProvider
from backend.providers.nebius_provider import NebiusLLMProvider, NebiusEmbeddingProvider
from backend.providers.local_embedding import LocalEmbeddingProvider


def get_llm_provider(role: str = "generator", settings: Settings | None = None) -> LLMProvider:
    """Instantiate the appropriate LLM provider for generator or judge."""
    cfg = settings or get_settings()

    provider_name = cfg.primary_llm_provider if role == "generator" else cfg.judge_llm_provider

    if provider_name == "groq":
        if not cfg.groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required for GroqProvider.")
        default_model = (
            cfg.groq_generator_model if role == "generator" else cfg.groq_judge_model
        )
        return GroqProvider(api_key=cfg.groq_api_key, default_model=default_model)

    elif provider_name == "nebius":
        if not cfg.nebius_api_key:
            raise ValueError("NEBIUS_API_KEY environment variable is required for NebiusLLMProvider.")
        return NebiusLLMProvider(
            api_key=cfg.nebius_api_key,
            base_url=cfg.nebius_base_url,
            default_model=cfg.nebius_generator_model,
        )

    raise ValueError(f"Unknown LLM provider: {provider_name}")


def get_embedding_provider(settings: Settings | None = None) -> EmbeddingProvider:
    """Instantiate the appropriate Embedding provider."""
    cfg = settings or get_settings()

    if cfg.embedding_provider == "nebius":
        if not cfg.nebius_api_key:
            raise ValueError("NEBIUS_API_KEY is required for NebiusEmbeddingProvider.")
        return NebiusEmbeddingProvider(
            api_key=cfg.nebius_api_key,
            base_url=cfg.nebius_base_url,
            model=cfg.nebius_embedding_model,
            dim=cfg.embedding_dim,
        )

    return LocalEmbeddingProvider(
        model_name=cfg.local_embedding_model,
        dim=cfg.embedding_dim,
    )
