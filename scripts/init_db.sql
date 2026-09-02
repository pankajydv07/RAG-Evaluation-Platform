-- =========================================================
-- Initial Database Script: Enable pgvector and create schemas
-- Compatible with PostgreSQL 16+ / Supabase
-- =========================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Collections Table (Logical group of ingested docs)
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chunk_count INTEGER NOT NULL DEFAULT 0
);

-- 3. Documents Table (Source documents ingested)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    source_uri TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    loader_type VARCHAR(20) NOT NULL,
    chunking_strategy VARCHAR(30) NOT NULL DEFAULT 'sentence',
    chunk_count INTEGER NOT NULL DEFAULT 0,
    load_status VARCHAR(20) NOT NULL DEFAULT 'ok',
    error_detail TEXT,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_collection_doc_hash UNIQUE (collection_id, content_hash)
);

-- 4. Passages / Chunks Table (Vector + Hybrid Search Store)
CREATE TABLE IF NOT EXISTS passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    parent_text TEXT,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding vector,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid vector similarity & metadata queries
CREATE INDEX IF NOT EXISTS idx_passages_collection_id ON passages(collection_id);
CREATE INDEX IF NOT EXISTS idx_passages_document_id ON passages(document_id);
CREATE INDEX IF NOT EXISTS idx_passages_metadata_gin ON passages USING GIN(metadata);

-- 5. Query Traces & Evaluation Logs
CREATE TABLE IF NOT EXISTS query_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    retrieved_passage_ids UUID[] DEFAULT '{}',
    prompt_used TEXT,
    generated_answer TEXT,
    confidence_score DOUBLE PRECISION,
    generator_model VARCHAR(100),
    latency_ms DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID REFERENCES query_traces(id) ON DELETE CASCADE,
    judge_model VARCHAR(100) NOT NULL,
    faithfulness DOUBLE PRECISION,
    answer_relevance DOUBLE PRECISION,
    context_precision DOUBLE PRECISION,
    context_recall DOUBLE PRECISION,
    judge_critique TEXT,
    eval_latency_ms DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
