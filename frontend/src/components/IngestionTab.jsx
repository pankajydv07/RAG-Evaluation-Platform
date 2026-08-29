import React, { useState } from 'react';
import { AlertCircle, AlignLeft, CheckCircle2, FileUp, Globe, Plus, UploadCloud, X } from 'lucide-react';
import { api } from '../api/client';

const ingestModes = [
  { id: 'pdf', label: 'PDF', Icon: FileUp },
  { id: 'text', label: 'Text', Icon: AlignLeft },
  { id: 'web', label: 'Web URL', Icon: Globe },
];

export function IngestionTab({ activeCollection, onRefreshCollections }) {
  const [ingestType, setIngestType] = useState('pdf');
  const [strategy, setStrategy] = useState('sentence');
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showNewCol, setShowNewCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  const handleCreateCollection = async (event) => {
    event.preventDefault();
    if (!newColName.trim()) return;
    try {
      await api.createCollection(newColName.trim());
      setNewColName('');
      setShowNewCol(false);
      onRefreshCollections();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleIngest = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let response;
      if (ingestType === 'pdf') {
        if (!file) throw new Error('Select a PDF file before starting ingestion.');
        response = await api.ingestPdf(activeCollection, file, strategy);
      } else if (ingestType === 'text') {
        if (!textInput.trim()) throw new Error('Enter text content before starting ingestion.');
        response = await api.ingestText(activeCollection, textInput, 'manual_text_input', strategy);
      } else {
        if (!urlInput.trim()) throw new Error('Enter a URL before starting ingestion.');
        response = await api.ingestWeb(activeCollection, urlInput.trim(), strategy);
      }
      setResult(response);
      onRefreshCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="app-page">
      <header className="page-head">
        <div>
          <h2>Build the knowledge base.</h2>
          <p>
            Add PDFs, markdown, notes, or web pages to the active collection:
            {' '}<span className="font-mono" style={{ color: 'var(--accent)' }}>{activeCollection}</span>
          </p>
        </div>
        <button className="btn" onClick={() => setShowNewCol(true)}>
          <Plus size={15} />
          New collection
        </button>
      </header>

      {showNewCol && (
        <form className="panel panel-pad form-stack fade-up" onSubmit={handleCreateCollection}>
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div>
              <h2 style={{ fontSize: '1.45rem' }}>Create collection</h2>
              <p>Name it after the corpus or product area it will hold.</p>
            </div>
            <button type="button" className="icon-button btn" onClick={() => setShowNewCol(false)} aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <div className="field">
            <label htmlFor="collection-name">Collection name</label>
            <input
              id="collection-name"
              className="input-base"
              value={newColName}
              onChange={(event) => setNewColName(event.target.value)}
              placeholder="system-design"
            />
          </div>
          <button type="submit" className="btn-primary">Save collection</button>
        </form>
      )}

      <form className="panel panel-pad form-stack" onSubmit={handleIngest}>
        <div className="segmented" aria-label="Ingestion type">
          {ingestModes.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              className={ingestType === id ? 'active' : ''}
              onClick={() => setIngestType(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="field">
          <span className="field-label">Chunking strategy</span>
          <div className="radio-grid">
            <label className="radio-option">
              <input
                type="radio"
                name="strategy"
                value="sentence"
                checked={strategy === 'sentence'}
                onChange={(event) => setStrategy(event.target.value)}
              />
              <span>Sentence chunks, 256 tokens</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="strategy"
                value="hierarchical"
                checked={strategy === 'hierarchical'}
                onChange={(event) => setStrategy(event.target.value)}
              />
              <span>Parent and child hierarchy</span>
            </label>
          </div>
        </div>

        {ingestType === 'pdf' && (
          <div className="upload-zone">
            <input
              type="file"
              accept=".pdf"
              id="pdf-upload"
              onChange={(event) => setFile(event.target.files[0])}
              className="hidden"
            />
            <label htmlFor="pdf-upload">
              <UploadCloud size={34} />
              <strong>{file ? file.name : 'Choose a PDF to index'}</strong>
              <span>Text extraction runs before chunking and embedding.</span>
            </label>
          </div>
        )}

        {ingestType === 'text' && (
          <div className="field">
            <label htmlFor="raw-text">Text content</label>
            <textarea
              id="raw-text"
              className="input-base font-mono"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="Paste documentation, notes, or markdown."
            />
          </div>
        )}

        {ingestType === 'web' && (
          <div className="field">
            <label htmlFor="web-url">Web page URL</label>
            <input
              id="web-url"
              type="url"
              className="input-base"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://example.com/docs/page"
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Indexing content' : 'Start ingestion'}
        </button>
      </form>

      {result && (
        <div className="status-box success fade-up">
          <CheckCircle2 size={18} />
          <div>
            <strong>Ingestion complete</strong>
            <p className="help-text">
              Created {result.chunks_created} chunks in {result.collection_name}.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="status-box error fade-up">
          <AlertCircle size={18} />
          <div>
            <strong>Ingestion failed</strong>
            <p className="help-text">{error}</p>
          </div>
        </div>
      )}
    </section>
  );
}
