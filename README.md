# RAG Evaluation Platform

A production-grade Retrieval-Augmented Generation (RAG) system and LLM-as-a-Judge quality evaluation platform. Built with **FastAPI**, **PostgreSQL + pgvector**, **SQLAlchemy (async)**, and multi-provider LLM support via **Groq** and **Nebius AI**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   FastAPI Application                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  /query  │ │ /ingest  │ │ /ab-test │ │ /eval  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │             │             │            │      │
│  ┌────▼─────────────▼─────────────▼────────────▼───┐ │
│  │              Service Layer                       │ │
│  │  RAGService │ IngestionService │ ABTestingService │ │
│  │                    EvalService                   │ │
│  └────┬────────────────────────────────────────────┘ │
│       │                                              │
│  ┌────▼─────────────────────────────────────────┐   │
│  │           Retrieval Engine                   │   │
│  │  Chunker → VectorStore → RRF Fusion          │   │
│  │  PassageReranker (Cross-Encoder)             │   │
│  └────┬─────────────────────────────────────────┘   │
│       │                                              │
│  ┌────▼──────────┐   ┌────────────────────────────┐  │
│  │  PostgreSQL   │   │   LLM Providers             │  │
│  │  + pgvector   │   │   Groq │ Nebius AI          │  │
│  │  (HNSW index) │   │   Local SentenceTransformers│  │
│  └───────────────┘   └────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Retrieval Engine (`backend/retrieval/`)

| Module | Description |
|---|---|
| `chunker.py` | Multi-strategy document chunker: **sentence-based** (256 token window, 32 token overlap) and **hierarchical parent-child** (512 token parents → 128 token children) |
| `fusion.py` | **Reciprocal Rank Fusion (RRF)** — merges ranked lists from multiple query vectors into a single fused ranking; includes **Lost-in-the-Middle reordering** to put high-relevance passages at context boundaries |
| `reranker.py` | **Cross-Encoder reranking** via `cross-encoder/ms-marco-MiniLM-L-6-v2` — scores each (query, passage) pair directly for precision-optimised shortlisting |
| `loader.py` | Document loader supporting **PDF** (`pypdf`), **plain text**, and **web scraping** (`beautifulsoup4`) |

### 2. RAG Service (`backend/services/rag_service.py`)

Full pipeline executed on each query:

```
Query
  │
  ├─ [Multi-Query Expansion] → LLM generates 3 query rephrases
  │                             → parallel dense vector search per rephrase
  │                             → RRF fusion across all result lists
  │
  ├─ [Standard Dense Search] → single embedding → pgvector cosine similarity
  │
  ├─ [Cross-Encoder Reranking] → re-scores top_k × 3 candidates → returns top_k
  │
  ├─ [Lost-in-the-Middle Reorder] → highest-scored passages at context edges
  │
  ├─ [Grounded Generation] → LLM synthesises answer with inline citation markers [1][2]
  │
  └─ [Trace Logging] → QueryTrace persisted to DB (model, latency, passage_ids, answer)
```

The `answer_query_stream()` method yields SSE events:
- `{ "type": "citations", "citations": [...] }` — emitted immediately before generation
- `{ "type": "token", "token": "..." }` — one event per LLM output token
- `{ "type": "done", "trace_id": "...", "latency_ms": ... }` — final trace metadata

### 3. LLM Provider Abstraction (`backend/providers/`)

All providers implement `LLMProvider` and `EmbeddingProvider` base interfaces:

| Provider | Role | Models |
|---|---|---|
| `GroqProvider` | Generator, Judge | `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, `qwen-qwq-32b` |
| `NebiusLLMProvider` | Generator, Embedding | `meta-llama/Llama-3.3-70B-Instruct`, `BAAI/bge-en-v1.5` |
| `LocalEmbeddingProvider` | Embedding only | `BAAI/bge-base-en-v1.5` (768-dim, via SentenceTransformers) |

The `factory.py` selects providers at runtime based on `EMBEDDING_PROVIDER` and `PRIMARY_LLM` environment variables.

### 4. LLM-as-a-Judge Evaluation (`backend/evaluation/` + `backend/eval/`)

- **`LLMJudge`** — evaluates a single trace on three metrics using the judge LLM:
  - **Faithfulness** — are all claims in the answer grounded in the retrieved context?
  - **Answer Relevance** — does the answer directly address the user's question?
  - **Context Precision** — what fraction of retrieved passages were actually useful?
- **`ComparativeJudge`** — scores two model outputs against the same context and declares a winner with critique (used by A/B testing).
- **`EvalGate`** — CI/CD regression gate: runs queries from `eval/golden_dataset.json`, checks scores against `eval/thresholds.yml`, exits non-zero if thresholds are breached.
- Background evaluation: after each streaming response, evaluation is triggered asynchronously via `asyncio.create_task` without blocking the client.

### 5. A/B Testing Service (`backend/services/ab_service.py`)

Runs two LLM providers **concurrently** (`asyncio.gather`) against the same retrieved and reranked context, then invokes the `ComparativeJudge` for a scored verdict.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/query/stream` | SSE streaming RAG response with citations |
| `POST` | `/api/v1/documents/ingest-pdf` | Upload and index a PDF |
| `POST` | `/api/v1/documents/ingest-text` | Ingest raw text or markdown |
| `POST` | `/api/v1/documents/ingest-url` | Scrape and index a web URL |
| `GET` | `/api/v1/collections` | List all collections |
| `POST` | `/api/v1/ab-test` | Run head-to-head model comparison |
| `GET` | `/api/v1/eval/summary` | Aggregate quality metrics |
| `GET` | `/api/v1/eval/traces` | Paginated query trace history |
| `POST` | `/api/v1/eval/evaluate-pending` | Batch-evaluate unevaluated traces |

**Interactive Swagger docs:** `http://localhost:8000/docs`

---

## Getting Started

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- API keys for Groq and/or Nebius AI

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env — set GROQ_API_KEY, NEBIUS_API_KEY, DATABASE_URL
```

Key environment variables:

```env
# LLM Providers
GROQ_API_KEY=...
GROQ_GENERATOR_MODEL=llama-3.3-70b-versatile
GROQ_JUDGE_MODEL=qwen-qwq-32b

NEBIUS_API_KEY=...
NEBIUS_BASE_URL=https://api.studio.nebius.ai/v1
NEBIUS_GENERATOR_MODEL=meta-llama/Llama-3.3-70B-Instruct

# Embedding (local or nebius)
EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

# Reranker
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
TOP_K_RETRIEVAL=20
TOP_K_RERANKED=5
```

### 2. Run with Docker (Recommended)

```bash
docker compose up -d
```

Starts four services:
- `ragapp_postgres` — PostgreSQL 16 + pgvector extension (`localhost:5432`)
- `ragapp_backend` — FastAPI/Uvicorn (`localhost:8000`)
- `ragapp_frontend` — Nginx-served React app (`localhost:3000`)

Rebuild backend image after code changes:
```bash
docker compose build backend
docker compose up -d
```

### 3. Run Locally (Development)

```bash
# Start only the database
docker compose up -d postgres

# Backend
uv run python -m backend.cli serve --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

---

## CLI Reference

```bash
# Start API server
uv run python -m backend.cli serve --port 8000 --reload

# Ingest a document
uv run python -m backend.cli ingest \
  --collection "system-design" \
  --file "SystemDesignInterview.pdf" \
  --strategy hierarchical           # sentence | hierarchical

# Query the RAG engine
uv run python -m backend.cli query \
  --collection "system-design" \
  --query "How does consistent hashing work?" \
  --top-k 5 \
  --multi-query                     # enables Multi-Query RAG-Fusion

# Run A/B model comparison
uv run python -m backend.cli ab-test \
  --collection "system-design" \
  --query "What is database sharding?" \
  --provider-a groq --model-a "openai/gpt-oss-120b" \
  --provider-b nebius --model-b "meta-llama/Llama-3.3-70B-Instruct"

# CI/CD quality regression gate
uv run python -m backend.cli eval-gate \
  --dataset eval/golden_dataset.json \
  --thresholds eval/thresholds.yml

# View aggregated evaluation metrics
uv run python -m backend.cli eval-summary
```

---

## Streaming API Usage

### cURL (SSE)

```bash
curl -N -X POST http://localhost:8000/api/v1/query/stream \
  -H "Content-Type: application/json" \
  -d '{
    "collection_name": "system-design",
    "query": "How does consistent hashing work?",
    "top_k": 5,
    "enable_reranker": true,
    "enable_multi_query": true
  }'
```

### Python

```python
import httpx, asyncio, json

async def stream_rag(collection: str, query: str):
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST",
            "http://localhost:8000/api/v1/query/stream",
            json={"collection_name": collection, "query": query, "top_k": 5}
        ) as res:
            async for line in res.aiter_lines():
                if line.startswith("data:"):
                    event = json.loads(line[5:])
                    if event["type"] == "token":
                        print(event["token"], end="", flush=True)
                    elif event["type"] == "done":
                        print(f"\n\nTrace ID: {event['trace_id']}")

asyncio.run(stream_rag("system-design", "How does consistent hashing work?"))
```

---

## Project Structure

```
RAGapp/
├── backend/
│   ├── api/v1/              # FastAPI route handlers (query, documents, eval, ab_test, collections)
│   ├── services/            # Business logic (RAGService, IngestionService, ABTestingService, EvalService)
│   ├── retrieval/           # Chunker, RRF fusion, Cross-Encoder reranker, document loader
│   ├── generation/          # RAGGenerator — prompt building & LLM call
│   ├── evaluation/          # LLMJudge (single trace scoring)
│   ├── eval/                # ComparativeJudge (A/B), EvalGate (CI/CD), golden dataset
│   ├── providers/           # GroqProvider, NebiusLLMProvider, LocalEmbeddingProvider, factory
│   ├── repositories/        # SQLAlchemy async repo layer (CollectionRepo, VectorRepo, TraceRepo)
│   ├── storage/             # ORM models, VectorStore abstraction
│   ├── schemas/             # Pydantic request/response schemas
│   ├── core/                # Config, DB init, exceptions
│   ├── cli.py               # Typer CLI
│   ├── main.py              # FastAPI app factory
│   └── Dockerfile
├── frontend/                # React + Vite dashboard
├── eval/                    # golden_dataset.json, thresholds.yml
├── tests/                   # pytest test suite
├── scripts/                 # init_db.sql
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```

---

## Testing

```bash
# Run full test suite
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/test_rag_service.py
```
