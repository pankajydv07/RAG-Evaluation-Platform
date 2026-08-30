"""Service orchestrating document loading, chunking, embedding, and storage."""

import uuid
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.exceptions import ResourceNotFoundError, DuplicateResourceError
from backend.providers.base import EmbeddingProvider
from backend.repositories.collection_repo import CollectionRepository
from backend.repositories.document_repo import DocumentRepository
from backend.repositories.vector_repo import VectorRepository
from backend.retrieval.chunker import Chunker
from backend.retrieval.loader import DocumentLoader, LoadedDocument
from backend.schemas.document import IngestionSummary


class IngestionService:
    def __init__(
        self,
        session: AsyncSession,
        embedding_provider: EmbeddingProvider,
    ):
        self.session = session
        self.embedding_provider = embedding_provider
        self.col_repo = CollectionRepository(session)
        self.doc_repo = DocumentRepository(session)
        self.vec_repo = VectorRepository(session)

    async def ingest_document(
        self,
        collection_name: str,
        loaded_doc: LoadedDocument,
        chunking_strategy: Literal["sentence", "hierarchical", "sliding"] = "sentence",
        chunk_size: int = 256,
    ) -> IngestionSummary:
        # 1. Verify or create Collection
        collection = await self.col_repo.get_by_name(collection_name)
        if not collection:
            collection = await self.col_repo.create(name=collection_name)

        # 2. Check for duplicate document in this collection
        existing_doc = await self.doc_repo.get_by_hash(
            collection_id=collection.id, content_hash=loaded_doc.content_hash
        )
        if existing_doc:
            raise DuplicateResourceError("Document", loaded_doc.source_uri)

        # 3. Create Document record
        doc_record = await self.doc_repo.create(
            collection_id=collection.id,
            source_uri=loaded_doc.source_uri,
            content_hash=loaded_doc.content_hash,
            loader_type=loaded_doc.loader_type,
            chunking_strategy=chunking_strategy,
        )

        # 4. Chunk document text
        chunks = Chunker.split(
            text=loaded_doc.text,
            strategy=chunking_strategy,
            max_tokens=chunk_size,
        )

        if not chunks:
            return IngestionSummary(
                document_id=doc_record.id,
                collection_id=collection.id,
                collection_name=collection.name,
                chunks_created=0,
                source_uri=loaded_doc.source_uri,
                loader_type=loaded_doc.loader_type,
                status="empty_text",
            )

        # 5. Compute vector embeddings for all chunks in batch
        chunk_texts = [c.text for c in chunks]
        embeddings = await self.embedding_provider.embed_texts(chunk_texts)

        # 6. Prepare passage records
        passages_to_insert = []
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings, strict=False)):
            passages_to_insert.append({
                "id": uuid.uuid4(),
                "document_id": doc_record.id,
                "collection_id": collection.id,
                "chunk_index": idx,
                "text": chunk.text,
                "parent_text": chunk.parent_text,
                "token_count": chunk.token_count,
                "embedding": emb,
                "metadata": {
                    "source": loaded_doc.source_uri,
                    "loader_type": loaded_doc.loader_type,
                    "strategy": chunking_strategy,
                    **loaded_doc.metadata,
                },
            })

        # 7. Insert passages to pgvector and update counts
        await self.vec_repo.insert_passages(passages_to_insert)
        doc_record.chunk_count = len(passages_to_insert)
        await self.col_repo.increment_chunk_count(collection.id, len(passages_to_insert))

        return IngestionSummary(
            document_id=doc_record.id,
            collection_id=collection.id,
            collection_name=collection.name,
            chunks_created=len(passages_to_insert),
            source_uri=loaded_doc.source_uri,
            loader_type=loaded_doc.loader_type,
            status="ok",
        )
