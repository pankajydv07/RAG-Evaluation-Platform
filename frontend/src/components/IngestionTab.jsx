import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Link2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Layers,
  RefreshCw,
  Plus,
  Database,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';

export function IngestionTab({ collections, activeCollection, onCollectionChange }) {
  // ── Collection target ──────────────────────────────────────────────────────
  const [collectionMode, setCollectionMode] = useState('existing'); // 'existing' | 'new'
  const [selectedCollection, setSelectedCollection] = useState(activeCollection || '');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  // ── Ingestion form ──────────────────────────────────────────────────────────
  const [ingestMode, setIngestMode] = useState('pdf');
  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [chunkStrategy, setChunkStrategy] = useState('hierarchical');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── Documents list ──────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Keep selectedCollection in sync when activeCollection changes from Navbar
  useEffect(() => {
    if (activeCollection && collectionMode === 'existing') {
      setSelectedCollection(activeCollection);
    }
  }, [activeCollection]);

  const effectiveCollection = collectionMode === 'existing' ? selectedCollection : null;

  const fetchDocuments = async (col) => {
    const target = col || effectiveCollection;
    if (!target) return;
    setLoadingDocs(true);
    try {
      const docs = await api.getDocuments(target);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (effectiveCollection) fetchDocuments(effectiveCollection);
    else setDocuments([]);
  }, [effectiveCollection]);

  // ── Create new collection ───────────────────────────────────────────────────
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setCreatingCollection(true);
    setStatusMessage(null);
    try {
      await api.createCollection(newCollectionName.trim(), newCollectionDesc.trim());
      setStatusMessage({ type: 'success', text: `Collection "${newCollectionName.trim()}" created.` });
      if (onCollectionChange) await onCollectionChange();
      // switch to existing mode with the newly created collection selected
      setSelectedCollection(newCollectionName.trim());
      setCollectionMode('existing');
      setNewCollectionName('');
      setNewCollectionDesc('');
      await fetchDocuments(newCollectionName.trim());
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create collection.' });
    } finally {
      setCreatingCollection(false);
    }
  };

  // ── Ingestion helpers ───────────────────────────────────────────────────────
  const targetCollection = collectionMode === 'existing' ? selectedCollection : null;

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !targetCollection) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.ingestPdf(targetCollection, selectedFile, chunkStrategy);
      setStatusMessage({ type: 'success', text: `Ingested ${res.chunks_created} chunks from "${selectedFile.name}"` });
      setSelectedFile(null);
      await fetchDocuments(targetCollection);
      if (onCollectionChange) onCollectionChange();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'PDF ingestion failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextUpload = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !textTitle.trim() || !targetCollection) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.ingestText(targetCollection, textTitle, textInput, chunkStrategy);
      setStatusMessage({ type: 'success', text: `Ingested ${res.chunks_created} chunks from "${textTitle}"` });
      setTextInput('');
      setTextTitle('');
      await fetchDocuments(targetCollection);
      if (onCollectionChange) onCollectionChange();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Text ingestion failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async (e) => {
    e.preventDefault();
    if (!urlInput.trim() || !targetCollection) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.ingestUrl(targetCollection, urlInput, chunkStrategy);
      setStatusMessage({ type: 'success', text: `Ingested ${res.chunks_created} chunks from ${urlInput}` });
      setUrlInput('');
      await fetchDocuments(targetCollection);
      if (onCollectionChange) onCollectionChange();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'URL ingestion failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const canIngest = collectionMode === 'existing' && selectedCollection;

  return (
    <div style={{ padding: '48px 0', background: 'var(--bg-canvas)', minHeight: 'calc(100vh - 56px)' }}>
      <div className="swiss-container">

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--hairline-heavy)', paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="index-num">SYSTEM // 03</span>
            <span className="meta-label">CORPUS INGESTION & VECTOR INDEXING</span>
          </div>
          <h2>DOCUMENT INDEXING PIPELINE</h2>
          <p style={{ color: 'var(--ink-secondary)', marginTop: 6, maxWidth: 640 }}>
            Select or create a collection, then ingest PDFs, raw text, or web pages.
            Text is chunked and embedded for vector similarity search.
          </p>
        </div>

        {/* Status Banner */}
        {statusMessage && (
          <div
            style={{
              padding: '14px 20px',
              border: '1px solid',
              borderColor: statusMessage.type === 'success' ? 'var(--signal-green)' : 'var(--swiss-red)',
              background: statusMessage.type === 'success' ? 'var(--signal-green-light)' : 'var(--swiss-red-light)',
              color: statusMessage.type === 'success' ? 'var(--signal-green)' : 'var(--swiss-red)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 28,
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1 }}
            >×</button>
          </div>
        )}

        {/* ── Step 1: Collection Selector ─────────────────────────────────────── */}
        <div
          style={{
            border: '1px solid var(--hairline-heavy)',
            background: '#FFFFFF',
            marginBottom: 28,
          }}
        >
          {/* Section Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--hairline)',
              background: '#FAFAFA',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Database size={14} style={{ color: 'var(--swiss-red)' }} />
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              STEP 01 — TARGET COLLECTION
            </span>
          </div>

          <div style={{ padding: 24 }}>
            {/* Toggle */}
            <div style={{ display: 'flex', gap: 1, background: 'var(--hairline)', marginBottom: 20, width: 'fit-content' }}>
              <button
                onClick={() => { setCollectionMode('existing'); setStatusMessage(null); }}
                style={{
                  padding: '8px 20px',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  border: 'none',
                  cursor: 'pointer',
                  background: collectionMode === 'existing' ? 'var(--swiss-red)' : '#FFFFFF',
                  color: collectionMode === 'existing' ? '#FFFFFF' : 'var(--ink-secondary)',
                  transition: 'background 150ms',
                }}
              >
                USE EXISTING
              </button>
              <button
                onClick={() => { setCollectionMode('new'); setStatusMessage(null); }}
                style={{
                  padding: '8px 20px',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  border: 'none',
                  cursor: 'pointer',
                  background: collectionMode === 'new' ? 'var(--swiss-red)' : '#FFFFFF',
                  color: collectionMode === 'new' ? '#FFFFFF' : 'var(--ink-secondary)',
                  transition: 'background 150ms',
                }}
              >
                <Plus size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                CREATE NEW
              </button>
            </div>

            {/* Existing collection dropdown */}
            {collectionMode === 'existing' && (
              <div style={{ maxWidth: 480 }}>
                <label className="meta-label">SELECT COLLECTION</label>
                <div style={{ position: 'relative', marginTop: 8 }}>
                  <select
                    value={selectedCollection}
                    onChange={(e) => {
                      setSelectedCollection(e.target.value);
                      setDocuments([]);
                    }}
                    className="input-field"
                    style={{ paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— choose a collection —</option>
                    {(collections || []).map((c) => (
                      <option key={c.id} value={c.name}>{c.name}{c.description ? ` — ${c.description}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)', pointerEvents: 'none',
                      color: 'var(--ink-tertiary)',
                    }}
                  />
                </div>
                {!selectedCollection && (
                  <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    No collection selected — or{' '}
                    <button
                      onClick={() => setCollectionMode('new')}
                      style={{ background: 'none', border: 'none', color: 'var(--swiss-red)', cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: 0 }}
                    >
                      create a new one
                    </button>.
                  </p>
                )}
                {selectedCollection && (
                  <p style={{ marginTop: 8, fontSize: 12, color: 'var(--signal-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ✓ TARGETING: {selectedCollection.toUpperCase()}
                  </p>
                )}
              </div>
            )}

            {/* New collection form */}
            {collectionMode === 'new' && (
              <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="meta-label">COLLECTION NAME <span style={{ color: 'var(--swiss-red)' }}>*</span></label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g., system-design"
                    className="input-field"
                    style={{ marginTop: 6 }}
                  />
                </div>
                <div>
                  <label className="meta-label">DESCRIPTION (optional)</label>
                  <input
                    type="text"
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    placeholder="Short description of this knowledge base"
                    className="input-field"
                    style={{ marginTop: 6 }}
                  />
                </div>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || creatingCollection}
                  className="btn btn-swiss"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {creatingCollection ? 'Creating...' : (
                    <><Plus size={13} /><span>Create Collection</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 2: Ingestion + Docs Panel (only shown when collection is selected) ── */}
        {canIngest ? (
          <div className="swiss-grid-12">
            {/* Left: Ingestion Controls */}
            <div style={{ gridColumn: 'span 7' }}>
              <div className="swiss-card" style={{ marginBottom: 24 }}>

                {/* Step label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--hairline)' }}>
                  <FileText size={14} style={{ color: 'var(--swiss-red)' }} />
                  <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    STEP 02 — INGEST INTO: <span style={{ color: 'var(--swiss-red)' }}>{selectedCollection.toUpperCase()}</span>
                  </span>
                </div>

                {/* Ingestion Mode Toggle */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: 24 }}>
                  {[
                    { mode: 'pdf', icon: <FileText size={13} />, label: 'PDF Document' },
                    { mode: 'text', icon: <Layers size={13} />, label: 'Raw Text' },
                    { mode: 'url', icon: <Link2 size={13} />, label: 'Web Scraping' },
                  ].map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setIngestMode(mode)}
                      className={`nav-item ${ingestMode === mode ? 'active' : ''}`}
                      style={{ height: 42, padding: '0 20px' }}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Chunking Strategy */}
                <div style={{ marginBottom: 24, padding: 16, background: '#FAFAFA', border: '1px solid var(--hairline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="meta-label">CHUNKING STRATEGY</span>
                    <span className="index-num">{chunkStrategy === 'hierarchical' ? 'PARENT-CHILD TREE' : 'SENTENCE WINDOW'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[
                      { value: 'hierarchical', label: 'Hierarchical (Context Tree)' },
                      { value: 'sentence', label: 'Sentence Boundary' },
                    ].map(({ value, label }) => (
                      <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="strategy"
                          value={value}
                          checked={chunkStrategy === value}
                          onChange={(e) => setChunkStrategy(e.target.value)}
                        />
                        <strong>{label}</strong>
                      </label>
                    ))}
                  </div>
                </div>

                {/* PDF Form */}
                {ingestMode === 'pdf' && (
                  <form onSubmit={handlePdfUpload}>
                    <div
                      style={{
                        border: '2px dashed var(--hairline-heavy)',
                        padding: 48,
                        textAlign: 'center',
                        background: selectedFile ? 'var(--signal-green-light)' : '#FAFAFA',
                        cursor: 'pointer',
                        marginBottom: 20,
                      }}
                      onClick={() => document.getElementById('pdf-input').click()}
                    >
                      <Upload size={28} style={{ color: 'var(--swiss-red)', marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {selectedFile ? selectedFile.name : 'Select or Drop PDF File'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 4 }}>
                        {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max 50MB — text is parsed and embedded.'}
                      </div>
                      <input
                        id="pdf-input"
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                    </div>
                    <button type="submit" disabled={!selectedFile || isUploading} className="btn btn-swiss" style={{ width: '100%' }}>
                      {isUploading ? 'Parsing & Vectorizing Chunks...' : 'Ingest PDF into Corpus'}
                    </button>
                  </form>
                )}

                {/* Text Form */}
                {ingestMode === 'text' && (
                  <form onSubmit={handleTextUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label className="meta-label">DOCUMENT TITLE / IDENTIFIER</label>
                      <input
                        type="text"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="e.g., Architecture RFC 042"
                        className="input-field"
                        style={{ marginTop: 6 }}
                      />
                    </div>
                    <div>
                      <label className="meta-label">RAW TEXT CONTENT</label>
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Paste markdown or raw document text here..."
                        rows={8}
                        className="input-field"
                        style={{ marginTop: 6, resize: 'vertical' }}
                      />
                    </div>
                    <button type="submit" disabled={!textTitle.trim() || !textInput.trim() || isUploading} className="btn btn-swiss">
                      {isUploading ? 'Processing Text...' : 'Ingest Raw Text Document'}
                    </button>
                  </form>
                )}

                {/* URL Form */}
                {ingestMode === 'url' && (
                  <form onSubmit={handleUrlUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label className="meta-label">WEB TARGET URL</label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://docs.example.com/system-spec"
                        className="input-field"
                        style={{ marginTop: 6 }}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', margin: 0 }}>
                      Some sites (Cloudflare, heavy SPAs) may block scraping — use Raw Text as a fallback.
                    </p>
                    <button type="submit" disabled={!urlInput.trim() || isUploading} className="btn btn-swiss">
                      {isUploading ? 'Scraping and Ingesting...' : 'Fetch and Ingest URL'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Document Index */}
            <div style={{ gridColumn: 'span 5' }}>
              <div className="swiss-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <span className="index-num">CORPUS REGISTRY</span>
                    <h3 style={{ marginTop: 4 }}>INDEXED SOURCES ({documents.length})</h3>
                  </div>
                  <button onClick={() => fetchDocuments(targetCollection)} className="btn" style={{ padding: '6px 10px', fontSize: 11 }}>
                    <RefreshCw size={12} className={loadingDocs ? 'animate-spin' : ''} />
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div style={{ padding: 32, border: '1px solid var(--hairline)', background: '#FAFAFA', textAlign: 'center' }}>
                    <FolderOpen size={24} style={{ color: 'var(--ink-tertiary)', marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>No documents indexed yet</div>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-secondary)', marginTop: 4 }}>
                      Upload a PDF, paste text, or scrape a URL to build the vector index.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--hairline)' }}>
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: 16,
                          background: '#FFFFFF',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ minWidth: 0, paddingRight: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.source_uri}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)' }}>
                            <span>{doc.loader_type.toUpperCase()}</span>
                            <span>•</span>
                            <span>{doc.chunking_strategy}</span>
                            <span>•</span>
                            <span>{new Date(doc.loaded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className="swiss-chip swiss-chip-red" style={{ flexShrink: 0 }}>
                          {doc.chunk_count} Chunks
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Locked state — no collection selected yet */
          collectionMode === 'existing' && (
            <div
              style={{
                padding: 40,
                border: '1px dashed var(--hairline-heavy)',
                background: '#FAFAFA',
                textAlign: 'center',
              }}
            >
              <Database size={28} style={{ color: 'var(--ink-tertiary)', marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Select or create a collection above to begin ingesting documents.
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
