/**
 * REST API client communicating with FastAPI backend
 */

const API_BASE = '/api/v1';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch('/health');
    return res.json();
  },

  // Collections
  async getCollections() {
    const res = await fetch(`${API_BASE}/collections`);
    if (!res.ok) throw new Error('Failed to load collections');
    return res.json();
  },

  async createCollection(name, description = '') {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create collection');
    }
    return res.json();
  },

  // Documents
  async ingestText(collectionName, text, sourceUri = 'web_text_input', strategy = 'sentence') {
    const res = await fetch(`${API_BASE}/documents/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_name: collectionName,
        text,
        source_uri: sourceUri,
        chunking_strategy: strategy,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to ingest text');
    }
    return res.json();
  },

  async ingestWeb(collectionName, url, strategy = 'sentence') {
    const res = await fetch(`${API_BASE}/documents/web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_name: collectionName,
        url,
        chunking_strategy: strategy,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to ingest URL');
    }
    return res.json();
  },

  async ingestPdf(collectionName, file, strategy = 'sentence') {
    const formData = new FormData();
    formData.append('collection_name', collectionName);
    formData.append('chunking_strategy', strategy);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/pdf`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to ingest PDF');
    }
    return res.json();
  },

  // Query & RAG
  async queryRAG(collectionName, query, topK = 5, model = null, provider = null) {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_name: collectionName,
        query,
        top_k: topK,
        model,
        provider,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },

  // Evaluation & Traces
  async getEvalSummary() {
    const res = await fetch(`${API_BASE}/eval/summary`);
    if (!res.ok) throw new Error('Failed to fetch eval summary');
    return res.json();
  },

  async getTraces() {
    const res = await fetch(`${API_BASE}/eval/traces`);
    if (!res.ok) throw new Error('Failed to fetch traces');
    return res.json();
  },

  // A/B Testing
  async runABTest(params) {
    const res = await fetch(`${API_BASE}/eval/ab-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'A/B Test execution failed');
    }
    return res.json();
  },
};
