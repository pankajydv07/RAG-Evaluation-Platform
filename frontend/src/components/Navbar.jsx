import React from 'react';
import { Database, Activity, Sparkles, Layers, ShieldCheck } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, collections, activeCollection, setActiveCollection }) {
  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-accent-violet to-accent-cyan flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              RAG Platform
            </h1>
            <p className="text-xs text-slate-400">pgvector • Groq • Nebius AI</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/60 shadow-inner">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Chat & QA
          </button>

          <button
            onClick={() => setActiveTab('ingestion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ingestion'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Documents
          </button>

          <button
            onClick={() => setActiveTab('ab_test')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ab_test'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            A/B Testing
          </button>

          <button
            onClick={() => setActiveTab('traces')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'traces'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Eval & Traces
          </button>
        </nav>

        {/* Collection Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-sm">
          <Database className="w-4 h-4 text-accent-cyan" />
          <select
            value={activeCollection}
            onChange={(e) => setActiveCollection(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
          >
            {collections.map((c) => (
              <option key={c.id} value={c.name} className="bg-slate-900 text-slate-200">
                {c.name} ({c.chunk_count} chunks)
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
