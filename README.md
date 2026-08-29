# Production RAG Platform & Evaluation Framework

A production-grade Retrieval-Augmented Generation (RAG) and LLM evaluation platform built with FastAPI, PostgreSQL (`pgvector`), Groq, Nebius AI Token Factory, and React + Vite.

---

## 🌟 Key Features

1. **Grounded RAG Pipeline**:
   - **Unified Storage**: PostgreSQL + `pgvector` with HNSW vector index (Docker / Supabase).
   - **Multi-Provider AI**: Nebius AI Token Factory (`meta-llama/Llama-3.3-70B-Instruct`) + Groq (`openai/gpt-oss-120b`, `qwen/qwen3.6-27b`) + Local SentenceTransformers (`BAAI/bge-base-en-v1.5`).
   - **Retrieval Engine**: Sentence & Hierarchical chunking, Reciprocal Rank Fusion (RRF), and CrossEncoder reranking.
   - **Citation Mapping**: Grounded factual answers with citation markers (`[1]`, `[2]`, etc.) mapped to original text snippets.

2. **Interactive React/Vite Dashboard (`frontend/`)**:
   - **Chat & QA**: Conversational UI with interactive citation drawers.
   - **Document Ingestion**: PDF drag-and-drop, text pasting, and web URL scraper.
   - **Traces & Scorecards**: Real-time evaluation gauges (Faithfulness, Relevance, Precision) and historical query traces.
   - **A/B Testing**: Side-by-side model comparison runner.

3. **Automated CI/CD Quality Regression Gate**:
   - Version-controlled Golden QA Dataset (`ragapp/eval/golden_dataset.json`).
   - Threshold enforcement (`eval/thresholds.yml`) blocking PRs/builds if quality regresses.

---

## 🚀 Quickstart

### 1. Configure API Keys & Database
```bash
cp .env.example .env
# Fill in GROQ_API_KEY, NEBIUS_API_KEY, and DATABASE_URL in .env
```

### 2. Start PostgreSQL with pgvector (via Docker)
```bash
docker compose up -d postgres redis
```

### 3. Run the Backend API & Frontend Dashboard
```bash
# Start backend (serves API on port 8000 and built React SPA on /)
uv run python -m ragapp.cli serve --port 8000
```
Open **`http://localhost:8000`** in your browser!

*(Optional: For frontend live reload during development)*:
```bash
cd frontend && npm run dev
# React Vite dev server runs on http://localhost:3000
```

---

## 🛠️ CLI Commands

```bash
# 1. Ingest a PDF into a collection
uv run python -m ragapp.cli ingest --collection "system-design" --file "SystemDesignInterview.pdf"

# 2. Query RAG with citations
uv run python -m ragapp.cli query --collection "system-design" --query "How does consistent hashing work?"

# 3. Run Head-to-Head Model A/B Test
uv run python -m ragapp.cli ab-test --collection "system-design" --query "What is database sharding?"

# 4. Run CI/CD Quality Regression Gate
uv run python -m ragapp.cli eval-gate

# 5. View Evaluation Summary Table
uv run python -m ragapp.cli eval-summary
```

---

## 🧪 Running Automated Tests

```bash
uv run pytest
```
