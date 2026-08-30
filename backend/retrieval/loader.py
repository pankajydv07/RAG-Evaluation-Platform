"""Document loaders for plain text, markdown, PDF, and web pages."""

import hashlib
from typing import Literal
from bs4 import BeautifulSoup
import httpx
from pydantic import BaseModel
from pypdf import PdfReader


class LoadedDocument(BaseModel):
    source_uri: str
    content_hash: str
    text: str
    loader_type: Literal["text", "pdf", "web"]
    metadata: dict = {}


class DocumentLoader:
    """Multi-format document ingestion loader."""

    @staticmethod
    def _compute_hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @classmethod
    def load_text(cls, content: str, source_uri: str = "raw_text") -> LoadedDocument:
        cleaned_text = content.strip()
        return LoadedDocument(
            source_uri=source_uri,
            content_hash=cls._compute_hash(cleaned_text),
            text=cleaned_text,
            loader_type="text",
            metadata={"source": source_uri},
        )

    @classmethod
    def load_pdf(cls, file_path: str) -> LoadedDocument:
        reader = PdfReader(file_path)
        extracted_pages = []
        for i, page in enumerate(reader.pages):
            txt = page.extract_text() or ""
            if txt.strip():
                extracted_pages.append(txt.strip())

        full_text = "\n\n".join(extracted_pages)
        return LoadedDocument(
            source_uri=file_path,
            content_hash=cls._compute_hash(full_text),
            text=full_text,
            loader_type="pdf",
            metadata={"source": file_path, "page_count": len(reader.pages)},
        )

    @classmethod
    async def load_web(cls, url: str) -> LoadedDocument:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")
        # Remove script and style tags
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        # Collapse multiple newlines
        cleaned = "\n".join([line.strip() for line in text.splitlines() if line.strip()])

        return LoadedDocument(
            source_uri=url,
            content_hash=cls._compute_hash(cleaned),
            text=cleaned,
            loader_type="web",
            metadata={"source": url, "title": soup.title.string if soup.title else ""},
        )
