"""Local Embedding Provider using sentence-transformers."""

import asyncio
from sentence_transformers import SentenceTransformer
from ragapp.providers.base import EmbeddingProvider


class LocalEmbeddingProvider(EmbeddingProvider):
    """In-process dense embedding model running on CPU/GPU."""

    def __init__(self, model_name: str = "BAAI/bge-base-en-v1.5", dim: int = 768):
        self.model_name = model_name
        self._dim = dim
        self._model: SentenceTransformer | None = None

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        loop = asyncio.get_running_loop()
        # SentenceTransformer.encode is synchronous, run in executor
        embeddings = await loop.run_in_executor(
            None,
            lambda: self._get_model().encode(
                texts, normalize_embeddings=True, show_progress_bar=False
            ).tolist(),
        )
        return embeddings

    async def embed_query(self, query: str) -> list[float]:
        # BGE models benefit from instruction prefix for retrieval
        bge_query = f"Represent this sentence for searching relevant passages: {query}"
        loop = asyncio.get_running_loop()
        embedding = await loop.run_in_executor(
            None,
            lambda: self._get_model().encode(
                bge_query, normalize_embeddings=True, show_progress_bar=False
            ).tolist(),
        )
        return embedding

    @property
    def dimension(self) -> int:
        return self._dim
