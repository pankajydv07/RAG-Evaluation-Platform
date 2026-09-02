/**
 * REST API client communicating with FastAPI backend
 */

const API_HOST = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_BASE = `${API_HOST}/api/v1`;

/**
 * Safely parse error response — handles both JSON (FastAPI detail) and
 * plain-text / HTML bodies (e.g. 500 Internal Server Error from proxy/nginx).
 */
async function extractError(res, fallback = 'Request failed') {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await res.json();
      return body.detail || body.message || fallback;
    }
    const text = await res.text();
    return text.slice(0, 200) || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status} ${res.statusText || fallback}`;
  }
}

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_HOST}/health`);
    return res.json();
  },

  // Collections
  async getCollections() {
    const res = await fetch(`${API_BASE}/collections`);
    if (!res.ok) throw new Error(await extractError(res, 'Failed to load collections'));
    return res.json();
  },

  async createCollection(name, description = '') {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error(await extractError(res, 'Failed to create collection'));
    return res.json();
  },

  // Documents
  // collectionName, sourceUri (title), text, strategy — matches IngestionTab call signature
  async ingestText(collectionName, sourceUri = 'web_text_input', text, strategy = 'sentence') {
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
    if (!res.ok) throw new Error(await extractError(res, 'Failed to ingest text'));
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
    if (!res.ok) throw new Error(await extractError(res, 'Failed to ingest URL'));
    return res.json();
  },

  // Alias used by IngestionTab
  async ingestUrl(collectionName, url, strategy = 'sentence') {
    return this.ingestWeb(collectionName, url, strategy);
  },

  // Documents list for a collection
  async getDocuments(collectionName) {
    const res = await fetch(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/documents`);
    if (res.status === 404) return []; // collection doesn't exist yet
    if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch documents'));
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
    if (!res.ok) throw new Error(await extractError(res, 'Failed to ingest PDF'));
    return res.json();
  },

  // Query & RAG
  async queryRAG(collectionName, query, topK = 5, model = null) {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_name: collectionName,
        query,
        top_k: topK,
        model,
      }),
    });
    if (!res.ok) throw new Error(await extractError(res, 'Query execution failed'));
    return res.json();
  },

  async streamQueryRAG(
    collectionName,
    query,
    onCitations,
    onToken,
    onDone,
    topK = 5,
    model = null,
    enableMultiQuery = false,
    enableLostInMiddleReorder = true
  ) {
    const res = await fetch(`${API_BASE}/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_name: collectionName,
        query,
        top_k: topK,
        model,
        enable_multi_query: enableMultiQuery,
        enable_lost_in_middle_reorder: enableLostInMiddleReorder,
      }),
    });
    if (!res.ok) throw new Error(await extractError(res, 'Streaming query execution failed'));

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;
        const lines = part.split('\n');
        let eventType = '';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.replace(/^event:\s*/, '').trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.replace(/^data:\s*/, '').trim();
          }
        }

        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            const type = eventType || data.type;
            if (type === 'citations' && onCitations) onCitations(data.citations || []);
            if (type === 'token' && onToken && data.token) onToken(data.token);
            if (type === 'error' && onToken) onToken(data.token || data.error || '\n\n[Query failed]');
            if (type === 'done' && onDone) onDone(data);
          } catch (e) {
            console.error('Error parsing SSE data:', e, 'Raw:', dataStr);
          }
        }
      }
    }
  },

  // Evaluation & Traces
  async getEvalSummary() {
    const res = await fetch(`${API_BASE}/eval/summary`);
    if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch eval summary'));
    return res.json();
  },

  async getTraces() {
    const res = await fetch(`${API_BASE}/eval/traces`);
    if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch traces'));
    return res.json();
  },

  async evaluatePendingTraces(limit = 10) {
    const res = await fetch(`${API_BASE}/eval/evaluate-pending?limit=${limit}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await extractError(res, 'Failed to run pending evaluations'));
    return res.json();
  },

  // A/B Testing
  async runABTest(params) {
    const res = await fetch(`${API_BASE}/eval/ab-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await extractError(res, 'A/B Test execution failed'));
    return res.json();
  },
};
