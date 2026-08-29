"""Base abstractions for LLM and Embedding Providers."""

from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel, Field


class LLMResponse(BaseModel):
    """Standardized response from any LLM provider."""
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0
    raw_response: dict[str, Any] = Field(default_factory=dict)


class LLMProvider(ABC):
    """Abstract interface for LLM text and structured output generation."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        """Generate text completion."""
        pass

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        """Generate structured JSON output validated against JSON syntax."""
        pass


class EmbeddingProvider(ABC):
    """Abstract interface for dense vector embeddings."""

    @abstractmethod
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Compute vector embeddings for a list of document passages."""
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> list[float]:
        """Compute vector embedding for a single user query."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the vector dimensionality."""
        pass
