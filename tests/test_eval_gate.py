"""Unit tests for CI/CD regression evaluation gate logic."""

import json
import pytest
from backend.eval.gate import run_evaluation_gate


@pytest.mark.asyncio
async def test_gate_missing_dataset():
    res = await run_evaluation_gate(dataset_path="non_existent_dataset.json")
    assert res is False


def test_golden_dataset_structure():
    with open("backend/eval/golden_dataset.json", "r", encoding="utf-8") as f:
        items = json.load(f)
    assert len(items) == 10

    for item in items:
        assert "question" in item
        assert "collection_name" in item
        assert "ground_truth_answer" in item
