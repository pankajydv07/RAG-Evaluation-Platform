import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Link2,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { api } from '../api/client';

export function IngestionTab({ activeCollection, onCollectionChange }) {
  const [ingestMode, setIngestMode] = useState('pdf');
  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [chunkStrategy, setChunkStrategy] = useState('hierarchical');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchDocuments = async () => {
    if (!activeCollection) return;
    setLoadingDocs(true);
    try {
      const docs = await api.getDocuments(activeCollection);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeCollection]);

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.ingestPdf(activeCollection || 'system-design', selectedFile, chunkStrategy);
      setStatusMessage({ type: 'success', text: `Ingested ${res.chunk_count} chunks from "${selectedFile.name}"` });
      setSelectedFile(null);
      await fetchDocuments();
      if (onCollectionChange) onCollectionChange();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'PDF ingestion failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextUpload = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !textTitle.trim()) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.ingestText(activeCollection || 'system-design', textTitle, textInput, chunkStrategy);
      setStatusMessage({ type: 'success', text: `Ingested ${res.chunk_count} chunks from "${textTitle}"` });
      setTextInput('');
      setTextTitle('');
      await fetchDocuments();
      if (onCollectionChange) onCollectionChange();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Text ingestion failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.ingestUrl(activeCollection || 'system-design', urlInput, chunkStrategy);
      setStatusMessage({ type: 'success', text: `Ingested ${res.chunk_count} chunks from ${urlInput}` });
      setUrlInput('');
      await fetchDocuments();
      if (onCollectionChange) onCollectionChange();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'URL ingestion failed.' });
    } finally {
      setIsUploading(false);
    }
  };

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
            Ingest structured knowledge documents. Text is partitioned using sliding sentence boundaries or hierarchical parent-child context trees and vectorized for similarity search.
          </p>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '16px 20px',
              border: '1px solid',
              borderColor: statusMessage.type === 'success' ? 'var(--signal-green)' : 'var(--swiss-red)',
              background: statusMessage.type === 'success' ? 'var(--signal-green-light)' : 'var(--swiss-red-light)',
              color: statusMessage.type === 'success' ? 'var(--signal-green)' : 'var(--swiss-red)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 32,
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="swiss-grid-12">
          {/* Left Ingestion Controls */}
          <div style={{ gridColumn: 'span 7' }}>
            <div className="swiss-card" style={{ marginBottom: 24 }}>
              {/* Ingestion Mode Toggle */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: 24 }}>
                <button
                  onClick={() => setIngestMode('pdf')}
                  className={`nav-item ${ingestMode === 'pdf' ? 'active' : ''}`}
                  style={{ height: 42, padding: '0 20px' }}
                >
                  <FileText size={13} />
                  <span>PDF Document</span>
                </button>
                <button
                  onClick={() => setIngestMode('text')}
                  className={`nav-item ${ingestMode === 'text' ? 'active' : ''}`}
                  style={{ height: 42, padding: '0 20px' }}
                >
                  <Layers size={13} />
                  <span>Raw Text</span>
                </button>
                <button
                  onClick={() => setIngestMode('url')}
                  className={`nav-item ${ingestMode === 'url' ? 'active' : ''}`}
                  style={{ height: 42, padding: '0 20px' }}
                >
                  <Link2 size={13} />
                  <span>Web Scraping</span>
                </button>
              </div>

              {/* Chunking Strategy Selector */}
              <div style={{ marginBottom: 24, padding: 16, background: '#FAFAFA', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="meta-label">CHUNKING STRATEGY</span>
                  <span className="index-num">{chunkStrategy === 'hierarchical' ? 'PARENT-CHILD TREE' : 'SENTENCE WINDOW'}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="strategy"
                      value="hierarchical"
                      checked={chunkStrategy === 'hierarchical'}
                      onChange={(e) => setChunkStrategy(e.target.value)}
                    />
                    <strong>Hierarchical (Context Tree)</strong>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="strategy"
                      value="sentence"
                      checked={chunkStrategy === 'sentence'}
                      onChange={(e) => setChunkStrategy(e.target.value)}
                    />
                    <strong>Sentence Boundary</strong>
                  </label>
                </div>
              </div>

              {/* Form by Ingestion Mode */}
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
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max 50MB. Text is parsed and embedded.'}
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
                  <button type="submit" disabled={!urlInput.trim() || isUploading} className="btn btn-swiss">
                    {isUploading ? 'Scraping and Ingesting...' : 'Fetch and Ingest URL'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Indexed Documents Table */}
          <div style={{ gridColumn: 'span 5' }}>
            <div className="swiss-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <span className="index-num">CORPUS REGISTRY</span>
                  <h3 style={{ marginTop: 4 }}>INDEXED SOURCES ({documents.length})</h3>
                </div>
                <button onClick={fetchDocuments} className="btn" style={{ padding: '6px 10px', fontSize: 11 }}>
                  <RefreshCw size={12} className={loadingDocs ? 'animate-spin' : ''} />
                </button>
              </div>

              {documents.length === 0 ? (
                <div style={{ padding: 32, border: '1px solid var(--hairline)', background: '#FAFAFA', textAlign: 'center' }}>
                  <FolderOpen size={24} style={{ color: 'var(--ink-tertiary)', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No documents in this collection</div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-secondary)', marginTop: 4 }}>
                    Upload a PDF or raw text to begin building the vector index.
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
      </div>
    </div>
  );
}
