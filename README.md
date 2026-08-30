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
   - Version-controlled Golden QA Dataset (`backend/eval/golden_dataset.json`).
   - Threshold enforcement (`eval/thresholds.yml`) blocking PRs/builds if quality regresses.

---

## 🐳 Docker Deployment (Full Stack)

To run the entire platform (Postgres with `pgvector`, FastAPI backend, and Nginx-served frontend) in Docker:

```bash
# 1. Ensure your .env file is populated with API keys
cp .env.example .env

# 2. Launch the entire container stack
docker compose up -d --build
```
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`
- **PostgreSQL (`pgvector`)**: `localhost:5432`

---

## 🚀 Local Development Quickstart

### 1. Configure API Keys & Database
```bash
cp .env.example .env
# Fill in GROQ_API_KEY, NEBIUS_API_KEY, and DATABASE_URL in .env
```

### 2. Start PostgreSQL with pgvector (Optional)
```bash
docker compose up -d postgres
```

### 3. Run Backend API Server
```bash
uv run python -m backend.cli serve --port 8000
```

### 4. Run Frontend Development Server
```bash
cd frontend && npm run dev
```

---

## 🛠️ CLI Commands

```bash
# 1. Ingest a PDF into a collection
uv run python -m backend.cli ingest --collection "system-design" --file "SystemDesignInterview.pdf"

# 2. Query RAG with citations
uv run python -m backend.cli query --collection "system-design" --query "How does consistent hashing work?"

# 3. Run Head-to-Head Model A/B Test
uv run python -m backend.cli ab-test --collection "system-design" --query "What is database sharding?"

# 4. Run CI/CD Quality Regression Gate
uv run python -m backend.cli eval-gate

# 5. View Evaluation Summary Table
uv run python -m backend.cli eval-summary
```

---

## 🧪 Running Automated Tests

```bash
uv run pytest
```

