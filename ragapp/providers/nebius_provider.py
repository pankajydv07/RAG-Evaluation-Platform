"""Nebius AI Token Factory provider implementation.

Uses OpenAI-compatible client connecting to https://api.studio.nebius.ai/v1.
Reference: https://tokenfactory.nebius.com/endpoints
"""

import asyncio
import json
import re
import time
from typing import Any
from openai import AsyncOpenAI, APIConnectionError, APIStatusError, RateLimitError
from ragapp.providers.base import EmbeddingProvider, LLMProvider, LLMResponse

_decoder = json.JSONDecoder()


def extract_json_from_text(text: str) -> dict[str, Any] | list:
    """Extract the first valid JSON value (object or array) from an LLM response string.

    Uses raw_decode so it stops at the end of the first complete JSON value
    and ignores any trailing text, duplicate objects, or markdown fences.
    """
    fenced = re.search(r"```(?:json)?\s*([\[\{].*?)[\]\}]\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(0).split('```', 1)[-1].lstrip('json').strip().rstrip('```').strip()

    text = text.strip()
    for i, ch in enumerate(text):
        if ch in ('{', '['):
            try:
                obj, _ = _decoder.raw_decode(text, i)
                return obj  # type: ignore[return-value]
            except json.JSONDecodeError:
                continue
    raise json.JSONDecodeError("No valid JSON object or array found", text, 0)


async def _with_retry(coro_fn, retries: int = 3, base_delay: float = 2.0):
    """Execute an async callable with exponential backoff retries."""
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            return await coro_fn()
        except (APIConnectionError, RateLimitError) as exc:
            last_exc = exc
            wait = base_delay * (2 ** attempt)
            await asyncio.sleep(wait)
        except APIStatusError as exc:
            if exc.status_code in (429, 500, 502, 503, 504):
                last_exc = exc
                wait = base_delay * (2 ** attempt)
                await asyncio.sleep(wait)
            else:
                raise
    raise last_exc  # type: ignore[misc]


class NebiusLLMProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.studio.nebius.ai/v1",
        default_model: str = "meta-llama/Llama-3.3-70B-Instruct",
    ):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.default_model = default_model

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
        model: str | None = None,
    ) -> LLMResponse:
        target_model = model or self.default_model
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()

        async def _call():
            return await self.client.chat.completions.create(
                model=target_model,
                messages=messages,  # type: ignore
                temperature=temperature,
                max_tokens=max_tokens,
            )

        response = await _with_retry(_call)
        latency_ms = (time.perf_counter() - start) * 1000.0

        choice = response.choices[0]
        content = choice.message.content or ""
        usage = response.usage

        return LLMResponse(
            content=content,
            model=target_model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            latency_ms=latency_ms,
            raw_response=response.model_dump(),
        )

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
        model: str | None = None,
    ):
        target_model = model or self.default_model
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=target_model,
            messages=messages,  # type: ignore
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.0,
        model: str | None = None,
    ) -> dict[str, Any]:
        target_model = model or self.default_model
        messages: list[dict[str, str]] = []
        sys = (
            (system_prompt + "\nReturn ONLY a valid JSON object. Do not include extra commentary.")
            if system_prompt
            else "Return ONLY a valid JSON object. Do not include extra commentary."
        )
        messages.append({"role": "system", "content": sys})
        messages.append({"role": "user", "content": prompt})

        # First attempt: with json_object response format
        try:
            async def _call_json():
                return await self.client.chat.completions.create(
                    model=target_model,
                    messages=messages,  # type: ignore
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )
            response = await _with_retry(_call_json)
            raw_text = response.choices[0].message.content or "{}"
            return extract_json_from_text(raw_text)
        except Exception:
            pass

        # Fallback: plain text + extract JSON manually
        async def _call_plain():
            return await self.client.chat.completions.create(
                model=target_model,
                messages=messages,  # type: ignore
                temperature=temperature,
            )
        response = await _with_retry(_call_plain)
        raw_text = response.choices[0].message.content or "{}"
        return extract_json_from_text(raw_text)


class NebiusEmbeddingProvider(EmbeddingProvider):
    """Nebius AI Embedding client using OpenAI-compatible API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.studio.nebius.ai/v1",
        model: str = "BAAI/bge-en-v1.5",
        dim: int = 768,
    ):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self._dim = dim

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        # Batch in chunks of 64
        batch_size = 64
        all_embeddings: list[list[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            async def _call(b=batch):
                return await self.client.embeddings.create(
                    model=self.model,
                    input=b,
                )

            response = await _with_retry(_call)
            batch_embs = [data.embedding for data in response.data]
            all_embeddings.extend(batch_embs)

        return all_embeddings

    async def embed_query(self, text: str) -> list[float]:
        async def _call():
            return await self.client.embeddings.create(
                model=self.model,
                input=text,
            )

        response = await _with_retry(_call)
        return response.data[0].embedding
