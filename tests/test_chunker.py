"""Unit tests for document chunking strategies."""

from backend.retrieval.chunker import Chunker, count_tokens_approx


def test_count_tokens_approx():
    text = "Hello world! This is a test."
    tokens = count_tokens_approx(text)
    assert tokens > 0


def test_sentence_chunking():
    sample_text = (
        "Artificial Intelligence is transforming software development. "
        "Retrieval-Augmented Generation provides accurate facts. "
        "pgvector allows fast vector similarity in PostgreSQL. "
        "Groq provides ultra-fast inference speed."
    )
    chunks = Chunker.chunk_by_sentence(sample_text, max_chunk_tokens=20, overlap_tokens=5)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.strategy == "sentence"
        assert len(chunk.text) > 0


def test_hierarchical_chunking():
    sample_text = (
        "First major section with multiple details. Detail one is important. Detail two is critical. "
        "Second major section with more facts. Fact A is confirmed. Fact B is verified."
    )
    chunks = Chunker.chunk_hierarchical(sample_text, parent_tokens=30, child_tokens=15)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.strategy == "hierarchical"
        assert chunk.parent_text is not None
