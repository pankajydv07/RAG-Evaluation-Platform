"""Groq LLM provider implementation using the official groq Python SDK."""

import asyncio
import json
import re
import time
from typing import Any
from groq import AsyncGroq, APIConnectionError, APIStatusError, RateLimitError
from ragapp.providers.base import LLMProvider, LLMResponse

_decoder = json.JSONDecoder()


def extract_json_from_text(text: str) -> dict[str, Any]:
    """Extract the first valid JSON object from an LLM response string.

    Uses raw_decode so it stops at the end of the first complete JSON object
    and ignores any trailing text, duplicate objects, or markdown fences.
    """
    # Strip markdown code fences first
    fenced = re.search(r"```(?:json)?\s*(\{.*?)\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)

    text = text.strip()
    # Scan for the first '{' and try raw_decode from there
    for i, ch in enumerate(text):
        if ch == "{":
            try:
                obj, _ = _decoder.raw_decode(text, i)
                return obj  # type: ignore[return-value]
            except json.JSONDecodeError:
                continue
    raise json.JSONDecodeError("No valid JSON object found", text, 0)


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


class GroqProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        default_model: str = "openai/gpt-oss-120b",
    ):
        self.client = AsyncGroq(api_key=api_key)
        self.default_model = default_model

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.1,
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
        usage = response.usage

        return LLMResponse(
            content=choice.message.content or "",
            model=response.model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
            latency_ms=latency_ms,
            raw_response=response.model_dump(),
        )

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
