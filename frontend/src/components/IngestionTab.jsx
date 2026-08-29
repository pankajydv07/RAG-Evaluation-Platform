import React, { useState } from 'react';
import { Upload, FileUp, Globe, AlignLeft, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { api } from '../api/client';

export function IngestionTab({ collections, activeCollection, onRefreshCollections }) {
  const [ingestType, setIngestType] = useState('pdf'); // 'pdf' | 'text' | 'web'
  const [strategy, setStrategy] = useState('sentence');
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // New Collection modal
  const [showNewCol, setShowNewCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  const handleCreateCollection = async (e) => {
    e.preventDefault();
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

  const handleIngest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let res;
      if (ingestType === 'pdf') {
        if (!file) throw new Error('Please select a PDF file to upload.');
        res = await api.ingestPdf(activeCollection, file, strategy);
      } else if (ingestType === 'text') {
        if (!textInput.trim()) throw new Error('Please enter text content.');
        res = await api.ingestText(activeCollection, textInput, 'manual_text_input', strategy);
      } else if (ingestType === 'web') {
        if (!urlInput.trim()) throw new Error('Please enter a valid URL.');
        res = await api.ingestWeb(activeCollection, urlInput.trim(), strategy);
      }
      setResult(res);
      onRefreshCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Document Ingestion & Knowledge Base</h2>
          <p className="text-sm text-slate-400">
            Current Target Collection: <span className="text-accent-cyan font-mono font-semibold">{activeCollection}</span>
          </p>
        </div>
        <button
          onClick={() => setShowNewCol(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <Plus className="w-4 h-4 text-accent-cyan" />
          Create Collection
        </button>
      </div>

      {/* New Collection Modal */}
      {showNewCol && (
        <div className="glass-panel p-5 rounded-2xl border border-primary-500/30 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">Create a New Collection</h3>
          <form onSubmit={handleCreateCollection} className="flex gap-3">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="e.g. system-design, api-docs"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowNewCol(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Ingestion Type Tabs */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
        <div className="flex gap-3 border-b border-slate-800 pb-4">
          <button
            onClick={() => setIngestType('pdf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              ingestType === 'pdf'
                ? 'bg-primary-600/30 border border-primary-500/50 text-primary-300'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <FileUp className="w-4 h-4" />
            PDF Document
          </button>
          <button
            onClick={() => setIngestType('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              ingestType === 'text'
                ? 'bg-primary-600/30 border border-primary-500/50 text-primary-300'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            Raw Text / Markdown
          </button>
          <button
            onClick={() => setIngestType('web')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              ingestType === 'web'
                ? 'bg-primary-600/30 border border-primary-500/50 text-primary-300'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            Web URL Scraper
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleIngest} className="space-y-5">
          {/* Strategy selector */}
          <div className="flex items-center justify-between text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 font-medium">Chunking Strategy:</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="strategy"
                  value="sentence"
                  checked={strategy === 'sentence'}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="accent-primary-600"
                />
                Sentence (256 tokens)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="strategy"
                  value="hierarchical"
                  checked={strategy === 'hierarchical'}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="accent-primary-600"
                />
                Hierarchical (Parent + Child)
              </label>
            </div>
          </div>

          {/* Type specific input */}
          {ingestType === 'pdf' && (
            <div className="border-2 border-dashed border-slate-800 hover:border-primary-500/50 rounded-2xl p-8 text-center transition-colors">
              <input
                type="file"
                accept=".pdf"
                id="pdf-upload"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer space-y-2 block">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-200 font-medium">
                  {file ? file.name : 'Click to upload or drag and drop PDF'}
                </p>
                <p className="text-xs text-slate-500">Supports standard PDFs with text extraction</p>
              </label>
            </div>
          )}

          {ingestType === 'text' && (
            <textarea
              rows={6}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste article, documentation, or notes here..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary-500"
            />
          )}

          {ingestType === 'web' && (
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/documentation/page"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500"
            />
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-primary-600/20"
          >
            {loading ? 'Processing, chunking & generating embeddings...' : 'Start Ingestion into pgvector'}
          </button>
        </form>

        {/* Feedback banners */}
        {result && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Successfully Ingested!</p>
              <p className="text-emerald-400/80">
                Created <strong>{result.chunks_created}</strong> chunks indexed in collection <strong>{result.collection_name}</strong>.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Ingestion Failed</p>
              <p className="text-red-400/80">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
