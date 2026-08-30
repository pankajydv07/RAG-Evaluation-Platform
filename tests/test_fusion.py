"""Unit tests for Reciprocal Rank Fusion (RRF)."""

import uuid
from backend.retrieval.fusion import reciprocal_rank_fusion


def test_reciprocal_rank_fusion():
    id1 = uuid.uuid4()
    id2 = uuid.uuid4()
    id3 = uuid.uuid4()

    # Ranking list 1: dense vector
    dense_ranking = [(id1, 0.95), (id2, 0.85), (id3, 0.70)]
    # Ranking list 2: sparse BM25
    sparse_ranking = [(id2, 12.5), (id1, 8.2), (id3, 4.1)]

    fused = reciprocal_rank_fusion([dense_ranking, sparse_ranking], k=60)

    assert len(fused) == 3
    # Both id1 and id2 are in top 2 for both rankings, so their RRF score must be highest
    top_ids = [item[0] for item in fused]
    assert id1 in top_ids[:2]
    assert id2 in top_ids[:2]
    assert top_ids[-1] == id3  # id3 is ranked 3rd in both
