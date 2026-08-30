import React from 'react';
import { Database, Activity } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, collections = [], activeCollection, setActiveCollection }) {
  const navItems = [
    { id: 'overview', index: '01', label: 'Overview' },
    { id: 'chat', index: '02', label: 'Retrieval' },
    { id: 'ingestion', index: '03', label: 'Ingestion' },
    { id: 'ab_test', index: '04', label: 'A/B Benchmark' },
    { id: 'traces', index: '05', label: 'Observatory' },
  ];

  return (
    <header className="swiss-nav">
      <div className="swiss-container swiss-nav-inner">
        {/* Brand Mark */}
        <div className="nav-brand" onClick={() => setActiveTab('overview')}>
          <div className="nav-brand-mark">
            <span>+</span>
          </div>
          <div>
            <div className="nav-brand-title">ZÜRICH // RAG</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-tertiary)', letterSpacing: '0.06em' }}>
              INTERNATIONAL TYPOGRAPHIC SYSTEM
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <span className="index-num">{item.index}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Collection Selector & Status */}
        <div className="nav-actions">
          <div className="collection-badge">
            <Database size={12} style={{ color: 'var(--swiss-red)' }} />
            <select
              value={activeCollection}
              onChange={(e) => setActiveCollection(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--ink-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {collections.map((col) => (
                <option key={col.id || col.name} value={col.name}>
                  {col.name} ({col.chunk_count || 0} chunks)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal-green)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-secondary)' }}>
              ONLINE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
