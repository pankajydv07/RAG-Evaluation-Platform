import React from 'react';
import { Sparkles, MessageSquare, Database, BarChart3, Activity } from 'lucide-react';

const NAV_TABS = [
  { id: 'home',      label: 'Overview',  Icon: Sparkles       },
  { id: 'chat',      label: 'Chat',      Icon: MessageSquare  },
  { id: 'ingestion', label: 'Documents', Icon: Database       },
  { id: 'ab_test',   label: 'A/B Lab',   Icon: BarChart3      },
  { id: 'traces',    label: 'Traces',    Icon: Activity       },
];

export function Navbar({ activeTab, setActiveTab, collections, activeCollection, setActiveCollection }) {
  return (
    <header style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      background: 'var(--surface-0)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 60,
      flexShrink: 0,
    }}>
      {/* Brand logo & mark */}
      <button
        onClick={() => setActiveTab('home')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginRight: 24,
          flexShrink: 0,
          outline: 'none',
        }}
      >
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 'var(--r-md)',
          background: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sparkles size={13} strokeWidth={2.5} style={{ color: 'var(--surface-0)' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 650,
          fontSize: 13.5,
          letterSpacing: '-0.025em',
          color: 'var(--text-primary)',
        }}>
          RAG Platform
        </span>
      </button>

      {/* Hairline divider */}
      <div style={{ width: 1, height: 16, background: 'var(--border)', marginRight: 16, flexShrink: 0 }} />

      {/* Navigation tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {NAV_TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12.5,
                fontWeight: active ? 550 : 400,
                background: active ? 'var(--surface-3)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'background 100ms, color 100ms',
                outline: 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <Icon size={13} strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Active collection selector dropdown */}
      {collections.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          flexShrink: 0,
        }}>
          <Database size={11} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <select
            value={activeCollection}
            onChange={e => setActiveCollection(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              maxWidth: 200,
            }}
          >
            {collections.map(c => (
              <option key={c.id} value={c.name} style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                {c.name} ({c.chunk_count} chunks)
              </option>
            ))}
          </select>
        </div>
      )}
    </header>
  );
}
