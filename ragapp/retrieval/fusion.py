"""Reciprocal Rank Fusion (RRF) for combining dense vector and sparse lexical rankings."""

import uuid
from typing import TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class RankedItem(BaseModel):
    id: uuid.UUID
    score: float
    data: dict = {}


def reciprocal_rank_fusion(
    ranked_lists: list[list[tuple[uuid.UUID, float]]],
    k: int = 60,
    weights: list[float] | None = None,
) -> list[tuple[uuid.UUID, float]]:
    """Compute Reciprocal Rank Fusion (RRF) over multiple rankings.
    
    Formula: RRF_score(d) = SUM( w_i / (k + rank_i(d)) )
    
    Args:
        ranked_lists: List of ranked lists, where each list contains (item_id, original_score) tuples ordered from best to worst.
        k: Constant damping factor (default: 60).
        weights: Optional importance weight for each ranking stream.
    
    Returns:
        Combined list of (item_id, rrf_score) sorted descending by rrf_score.
    """
    if not ranked_lists:
        return []

    if weights is None:
        weights = [1.0] * len(ranked_lists)

    scores: dict[uuid.UUID, float] = {}

    for weight, ranked_list in zip(weights, ranked_lists, strict=False):
        for rank_zero_based, (item_id, _) in enumerate(ranked_list):
            rank = rank_zero_based + 1  # 1-indexed rank
            rrf_val = weight / (k + rank)
            scores[item_id] = scores.get(item_id, 0.0) + rrf_val

    # Sort descending by combined RRF score
    sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_items
