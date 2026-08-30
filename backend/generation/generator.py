"""RAG Generation orchestrator with citation mapping and token budgeting."""

from pydantic import BaseModel
from backend.providers.base import LLMProvider
from backend.storage.vector_store import SearchResult


class GenerationResult(BaseModel):
    query: str
    answer: str
    cited_passages: list[SearchResult]
    model: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int


SYSTEM_PROMPT = """You are an accurate, helpful AI assistant.
Answer the user's question using ONLY the provided context passages below.
For every claim or factual statement you make, cite the corresponding passage number using [1], [2], etc.
If the provided context does not contain enough information to answer the question, clearly state: "I cannot find sufficient information in the provided context to answer this question."
Do not make up facts or extrapolate beyond what is stated in the context."""


class RAGGenerator:
    """Combines retrieved context with LLM generation."""

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def _build_context_prompt(self, passages: list[SearchResult]) -> str:
        blocks = []
        for i, p in enumerate(passages, 1):
            text = p.parent_text or p.text
            blocks.append(f"--- Passage [{i}] ---\n{text.strip()}")
        return "\n\n".join(blocks)

    async def generate_answer(
        self,
        query: str,
        retrieved_passages: list[SearchResult],
        temperature: float = 0.0,
        model: str | None = None,
    ) -> GenerationResult:
        context_str = self._build_context_prompt(retrieved_passages)

        user_prompt = f"""Context:
{context_str}

Question: {query}

Answer (with citations):"""

        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=temperature,
            model=model,
        )

        return GenerationResult(
            query=query,
            answer=response.content,
            cited_passages=retrieved_passages,
            model=response.model,
            latency_ms=response.latency_ms,
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
        )
