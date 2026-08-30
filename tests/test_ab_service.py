"""Unit tests for A/B Comparative Judge and Service."""

import pytest
from backend.eval.ab_judge import ComparativeJudge
from backend.providers.base import LLMProvider, LLMResponse


class MockJudgeProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.0, max_tokens: int = 2048) -> LLMResponse:
        return LLMResponse(content="{}", model="mock_judge")

    async def generate_json(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.0, model: str | None = None) -> dict:
        return {
            "winner": "2",
            "answer_1_score": 0.75,
            "answer_2_score": 0.95,
            "critique": "Answer 2 provided a significantly clearer explanation with grounded facts.",
        }


@pytest.mark.asyncio
async def test_comparative_judge():
    mock_provider = MockJudgeProvider()
    judge = ComparativeJudge(mock_provider)

    verdict = await judge.evaluate_pair(
        query="What is sharding?",
        context_texts=["Sharding is horizontal partitioning of databases."],
        answer_a="Sharding splits a database horizontally.",
        answer_b="Sharding is when you break a database into smaller chunks called shards.",
    )

    assert verdict.winner in ["A", "B", "tie"]
    assert verdict.model_a_score >= 0.0
    assert verdict.model_b_score >= 0.0
    assert len(verdict.critique) > 0
