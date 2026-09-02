"""API endpoints for multi-format document ingestion."""

import os
import tempfile
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db_session
from backend.core.exceptions import DomainException, to_http_exception
from backend.providers.factory import get_embedding_provider
from backend.retrieval.loader import DocumentLoader
from backend.schemas.document import DocumentTextIngest, DocumentWebIngest, IngestionSummary
from backend.services.ingestion_service import IngestionService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/text", response_model=IngestionSummary, status_code=status.HTTP_201_CREATED)
async def ingest_text_document(
    payload: DocumentTextIngest,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        embedding_provider = get_embedding_provider()
        service = IngestionService(session, embedding_provider)
        loaded_doc = DocumentLoader.load_text(
            content=payload.text, source_uri=payload.source_uri
        )
        return await service.ingest_document(
            collection_name=payload.collection_name,
            loaded_doc=loaded_doc,
            chunking_strategy=payload.chunking_strategy,
            chunk_size=payload.chunk_size,
        )
    except DomainException as exc:
        raise to_http_exception(exc)


@router.post("/web", response_model=IngestionSummary, status_code=status.HTTP_201_CREATED)
async def ingest_web_document(
    payload: DocumentWebIngest,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        embedding_provider = get_embedding_provider()
        service = IngestionService(session, embedding_provider)
        loaded_doc = await DocumentLoader.load_web(url=payload.url)
        return await service.ingest_document(
            collection_name=payload.collection_name,
            loaded_doc=loaded_doc,
            chunking_strategy=payload.chunking_strategy,
            chunk_size=payload.chunk_size,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except DomainException as exc:
        raise to_http_exception(exc)


@router.post("/pdf", response_model=IngestionSummary, status_code=status.HTTP_201_CREATED)
async def ingest_pdf_document(
    collection_name: str = Form(...),
    chunking_strategy: str = Form("sentence"),
    chunk_size: int = Form(256),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported."
        )

    # Save to temporary file to read via pypdf
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        loaded_doc = DocumentLoader.load_pdf(tmp_path)
        loaded_doc.source_uri = file.filename
        embedding_provider = get_embedding_provider()
        service = IngestionService(session, embedding_provider)
        return await service.ingest_document(
            collection_name=collection_name,
            loaded_doc=loaded_doc,
            chunking_strategy=chunking_strategy,  # type: ignore
            chunk_size=chunk_size,
        )
    except DomainException as exc:
        raise to_http_exception(exc)
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").exception(f"Failed to ingest PDF '{file.filename}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(exc)}",
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
