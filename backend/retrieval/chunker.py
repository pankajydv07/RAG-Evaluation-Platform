"""Text chunking strategies for document ingestion."""

import re
from typing import Literal
from pydantic import BaseModel


class Chunk(BaseModel):
    chunk_index: int
    text: str
    parent_text: str | None = None
    token_count: int = 0
    strategy: str


def count_tokens_approx(text: str) -> int:
    """Fast approximation of token count (~4 chars/token)."""
    return max(1, len(text) // 4)


class Chunker:
    """Multi-strategy document chunker."""

    @staticmethod
    def chunk_by_sentence(
        text: str, max_chunk_tokens: int = 256, overlap_tokens: int = 32
    ) -> list[Chunk]:
        """Sentence-based chunking with token limit and overlap."""
        # Split by punctuation followed by whitespace
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks: list[Chunk] = []
        current_sentences: list[str] = []
        current_tokens = 0
        chunk_idx = 0

        for sent in sentences:
            sent_tokens = count_tokens_approx(sent)
            if current_tokens + sent_tokens > max_chunk_tokens and current_sentences:
                chunk_text = " ".join(current_sentences)
                chunks.append(
                    Chunk(
                        chunk_index=chunk_idx,
                        text=chunk_text,
                        token_count=current_tokens,
                        strategy="sentence",
                    )
                )
                chunk_idx += 1

                # Keep overlap sentences from the end
                overlap_acc: list[str] = []
                overlap_tok = 0
                for s in reversed(current_sentences):
                    t = count_tokens_approx(s)
                    if overlap_tok + t <= overlap_tokens:
                        overlap_acc.insert(0, s)
                        overlap_tok += t
                    else:
                        break
                current_sentences = overlap_acc
                current_tokens = overlap_tok

            current_sentences.append(sent)
            current_tokens += sent_tokens

        if current_sentences:
            chunk_text = " ".join(current_sentences)
            chunks.append(
                Chunk(
                    chunk_index=chunk_idx,
                    text=chunk_text,
                    token_count=current_tokens,
                    strategy="sentence",
                )
            )

        return chunks

    @staticmethod
    def chunk_hierarchical(
        text: str, parent_tokens: int = 512, child_tokens: int = 128
    ) -> list[Chunk]:
        """Hierarchical chunking with parent context attached to each smaller child chunk."""
        parent_chunks = Chunker.chunk_by_sentence(
            text, max_chunk_tokens=parent_tokens, overlap_tokens=0
        )
        all_child_chunks: list[Chunk] = []
        global_idx = 0

        for parent in parent_chunks:
            children = Chunker.chunk_by_sentence(
                parent.text, max_chunk_tokens=child_tokens, overlap_tokens=16
            )
            for child in children:
                all_child_chunks.append(
                    Chunk(
                        chunk_index=global_idx,
                        text=child.text,
                        parent_text=parent.text,
                        token_count=child.token_count,
                        strategy="hierarchical",
                    )
                )
                global_idx += 1

        return all_child_chunks

    @classmethod
    def split(
        cls,
        text: str,
        strategy: Literal["sentence", "hierarchical", "sliding"] = "sentence",
        max_tokens: int = 256,
    ) -> list[Chunk]:
        if strategy == "hierarchical":
            return cls.chunk_hierarchical(text, parent_tokens=max_tokens * 2, child_tokens=max_tokens)
        return cls.chunk_by_sentence(text, max_chunk_tokens=max_tokens)
