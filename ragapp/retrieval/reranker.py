"""CrossEncoder reranking for precision-filtering top retrieved passages."""

import asyncio
from pydantic import BaseModel
from sentence_transformers import CrossEncoder
from ragapp.storage.vector_store import SearchResult


class RerankedResult(BaseModel):
    search_result: SearchResult
    rerank_score: float


class PassageReranker:
    """Reranks (query, passage) pairs using a local cross-encoder model."""

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model: CrossEncoder | None = None

    def _get_model(self) -> CrossEncoder:
        if self._model is None:
            self._model = CrossEncoder(self.model_name)
        return self._model

    async def rerank(
        self,
        query: str,
        results: list[SearchResult],
        top_k: int = 5,
    ) -> list[RerankedResult]:
        """Score each retrieved passage against the query and return the top-k highest scoring passages."""
        if not results:
            return []

        # Prepare pairs for CrossEncoder
        pairs = [[query, r.text] for r in results]

        loop = asyncio.get_running_loop()
        scores = await loop.run_in_executor(
            None,
            lambda: self._get_model().predict(pairs, show_progress_bar=False).tolist(),
        )

        reranked = [
            RerankedResult(search_result=res, rerank_score=float(score))
            for res, score in zip(results, scores, strict=False)
        ]

        reranked.sort(key=lambda x: x.rerank_score, reverse=True)
        return reranked[:top_k]
