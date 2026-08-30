"""Automated LLM-as-a-Judge Evaluation Engine."""

import time
from typing import Any
from pydantic import BaseModel, Field
from backend.providers.base import LLMProvider


class EvalScore(BaseModel):
    faithfulness: float = Field(ge=0.0, le=1.0, description="Is the answer faithful to the provided context?")
    answer_relevance: float = Field(ge=0.0, le=1.0, description="Does the answer directly address the question?")
    context_precision: float = Field(ge=0.0, le=1.0, description="Are the retrieved context snippets relevant?")
    critique: str = Field(description="Summary justification of the evaluation scores.")
    judge_model: str
    eval_latency_ms: float = 0.0


JUDGE_SYSTEM_PROMPT = """You are an expert evaluator assessing the performance of a Retrieval-Augmented Generation (RAG) system.
Given a user query, retrieved context passages, and the generated response, evaluate the response on three metrics (each on a continuous scale from 0.0 to 1.0):

1. **faithfulness** (0.0 to 1.0):
   - 1.0: All claims in the answer are strictly supported by the retrieved context. Zero hallucinations.
   - 0.0: The answer contradicts the context or introduces completely fabricated facts.

2. **answer_relevance** (0.0 to 1.0):
   - 1.0: The answer directly, clearly, and completely answers the user's prompt without rambling.
   - 0.0: The answer is off-topic or fails to answer the question.

3. **context_precision** (0.0 to 1.0):
   - 1.0: The retrieved passages are dense with information pertinent to answering the query.
   - 0.0: The retrieved passages are noisy and irrelevant to the query.

You must respond ONLY with a valid JSON object matching this structure:
{
  "faithfulness": <float between 0.0 and 1.0>,
  "answer_relevance": <float between 0.0 and 1.0>,
  "context_precision": <float between 0.0 and 1.0>,
  "critique": "<2-3 sentence justification>"
}"""


class LLMJudge:
    """Evaluates RAG query traces using an independent judge model."""

    def __init__(self, judge_provider: LLMProvider):
        self.judge_provider = judge_provider

    async def evaluate_trace(
        self,
        query: str,
        context_texts: list[str],
        generated_answer: str,
        model: str | None = None,
    ) -> EvalScore:
        formatted_context = "\n\n".join(
            [f"[Passage {i+1}]: {txt}" for i, txt in enumerate(context_texts)]
        )

        prompt = f"""--- USER QUERY ---
{query}

--- RETRIEVED CONTEXT ---
{formatted_context}

--- GENERATED ANSWER ---
{generated_answer}

Provide your evaluation in JSON format:"""

        start = time.perf_counter()
        raw_json = await self.judge_provider.generate_json(
            prompt=prompt,
            system_prompt=JUDGE_SYSTEM_PROMPT,
            temperature=0.0,
            model=model,
        )
        latency_ms = (time.perf_counter() - start) * 1000.0

        return EvalScore(
            faithfulness=float(raw_json.get("faithfulness", 0.0)),
            answer_relevance=float(raw_json.get("answer_relevance", 0.0)),
            context_precision=float(raw_json.get("context_precision", 0.0)),
            critique=str(raw_json.get("critique", "")),
            judge_model=model or "default_judge",
            eval_latency_ms=latency_ms,
        )
