import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Layers,
  Database,
  FileText,
  Clock,
  ChevronRight,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Bot,
  User,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api/client';
import { SwissProgressBar, SwissPulseDots } from './SwissLoader';

export function ChatLayout({ activeCollection }) {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('ragapp_swiss_sessions');
      return saved ? JSON.parse(saved) : [{ id: 'default', title: 'Session #01', messages: [], createdAt: new Date().toISOString() }];
    } catch {
      return [{ id: 'default', title: 'Session #01', messages: [], createdAt: new Date().toISOString() }];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState('default');
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [enableMultiQuery, setEnableMultiQuery] = useState(false);
  const [enableReranker, setEnableReranker] = useState(true);
  const [topK, setTopK] = useState(5);

  const messagesEndRef = useRef(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    try {
      localStorage.setItem('ragapp_swiss_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save chat sessions', e);
    }
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isStreaming]);

  const handleCreateSession = () => {
    const newSession = {
      id: `session_${Date.now()}`,
      title: `Session #${String(sessions.length + 1).padStart(2, '0')}`,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      setSessions([{ id: 'default', title: 'Session #01', messages: [], createdAt: new Date().toISOString() }]);
      setActiveSessionId('default');
      return;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const handleSend = async () => {
    if (!inputQuery.trim() || isStreaming) return;

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputQuery.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantPlaceholder = {
      id: `msg_asst_${Date.now()}`,
      role: 'assistant',
      content: '',
      citations: [],
      latencyMs: null,
      traceId: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...activeSession.messages, userMessage, assistantPlaceholder];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: s.messages.length === 0 ? userMessage.content.slice(0, 32) : s.title,
              messages: updatedMessages,
            }
          : s
      )
    );

    const queryToSend = inputQuery.trim();
    setInputQuery('');
    setIsStreaming(true);

    const currentSessionId = activeSessionId;
    const targetCol = activeCollection || 'system-design';

    try {
      await api.streamQueryRAG(
        targetCol,
        queryToSend,
        (citations) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantPlaceholder.id ? { ...m, citations: citations || [] } : m
                    ),
                  }
                : s
            )
          );
        },
        (token) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantPlaceholder.id ? { ...m, content: (m.content || '') + token } : m
                    ),
                  }
                : s
            )
          );
        },
        (donePayload) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantPlaceholder.id
                        ? {
                            ...m,
                            latencyMs: donePayload?.latency_ms,
                            traceId: donePayload?.trace_id,
                          }
                        : m
                    ),
                  }
                : s
            )
          );
        },
        topK,
        null,
        enableMultiQuery,
        true
      );
    } catch (err) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantPlaceholder.id
                    ? { ...m, content: `Error: ${err.message || 'Execution failed.'}` }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const renderContentWithCitations = (content, citations = []) => {
    if (!content) return null;
    const parts = content.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = parseInt(match[1], 10);
        const citationData = citations[citationNum - 1];

        return (
          <button
            key={index}
            className="citation-pill"
            onClick={() => setSelectedCitation(citationData || { chunk_index: citationNum, text: 'No expanded text.' })}
          >
            [{String(citationNum).padStart(2, '0')}]
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: 'var(--bg-canvas)' }} className="swiss-fade-in">
      {isStreaming && <SwissProgressBar />}
      {/* ----------------------------------------------------------------------
          LEFT SESSION DIRECTORY
          ---------------------------------------------------------------------- */}
      <aside style={{ width: 280, borderRight: '1px solid var(--hairline)', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="index-num">SESSION LOG</span>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>RETRIEVAL AUDIT</div>
          </div>
          <button onClick={handleCreateSession} className="btn" style={{ padding: '6px 10px', fontSize: 11 }}>
            <Plus size={13} />
            <span>New</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--hairline)',
                background: s.id === activeSessionId ? 'var(--bg-subtle)' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="index-num">#{String(sessions.length - idx).padStart(2, '0')}</span>
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-tertiary)', cursor: 'pointer' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Query Controls Footer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--hairline)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <SlidersHorizontal size={13} style={{ color: 'var(--swiss-red)' }} />
            <span className="meta-label">RETRIEVAL PARAMS</span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={enableMultiQuery}
              onChange={(e) => setEnableMultiQuery(e.target.checked)}
            />
            <span>Multi-Query Expansion</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enableReranker}
              onChange={(e) => setEnableReranker(e.target.checked)}
            />
            <span>Cross-Encoder Reranker</span>
          </label>
        </div>
      </aside>

      {/* ----------------------------------------------------------------------
          CENTER CONVERSATIONAL STAGE
          ---------------------------------------------------------------------- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
        {/* Stage Header */}
        <div style={{ height: 48, borderBottom: '1px solid var(--hairline)', background: '#FFFFFF', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="index-num">ACTIVE STAGE</span>
            <span className="meta-label">CORPUS: {activeCollection || 'SYSTEM-DESIGN'}</span>
          </div>
          <span className="meta-label">TOP-K: {topK} // HYBRID RRF</span>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {activeSession.messages.length === 0 ? (
              <div style={{ padding: 48, border: '1px solid var(--hairline-heavy)', background: '#FFFFFF', textAlign: 'left' }}>
                <span className="index-num">READY // 01</span>
                <h2 style={{ marginTop: 8, marginBottom: 12 }}>GROUNDED RETRIEVAL STAGE</h2>
                <p style={{ color: 'var(--ink-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 600 }}>
                  Enter a technical prompt to execute dense vector search, lexical BM25 matching, reciprocal rank fusion, and verified citation synthesis.
                </p>
              </div>
            ) : (
              activeSession.messages.map((msg) => (
                <article
                  key={msg.id}
                  style={{
                    border: '1px solid var(--hairline)',
                    background: msg.role === 'user' ? '#FFFFFF' : '#FFFFFF',
                    padding: 24,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--hairline)', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={msg.role === 'user' ? 'index-num' : 'swiss-chip swiss-chip-red'}>
                        {msg.role === 'user' ? 'USER QUERY' : 'GROUNDED SYNTHESIS'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-tertiary)' }}>
                      {msg.latencyMs && <span>LATENCY: {(msg.latencyMs / 1000).toFixed(2)}s</span>}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-primary)', whiteSpace: 'pre-wrap' }}>
                    {msg.role === 'assistant'
                      ? (msg.content
                          ? renderContentWithCitations(msg.content, msg.citations)
                          : isStreaming && msg.id === activeSession.messages.at(-1)?.id
                            ? <SwissPulseDots />
                            : null)
                      : msg.content}
                  </div>

                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <FileText size={12} style={{ color: 'var(--swiss-red)' }} />
                        <span className="meta-label">RETRIEVED CITATIONS ({msg.citations.length})</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {msg.citations.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedCitation(c)}
                            className="swiss-chip"
                            style={{ cursor: 'pointer', background: '#FAFAFA' }}
                          >
                            <span style={{ color: 'var(--swiss-red)', fontWeight: 700 }}>[{String(i + 1).padStart(2, '0')}]</span>
                            <span>Score: {(c.similarity_score * 100).toFixed(0)}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Dock */}
        <div style={{ padding: '16px 24px', background: '#FFFFFF', borderTop: '1px solid var(--hairline)' }}>
          <div style={{ maxWidth: 840, margin: '0 auto' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{ display: 'flex', gap: 12 }}
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask a technical question against indexed documents..."
                className="input-field"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isStreaming}
                className="btn btn-swiss"
                style={{ padding: '0 24px', flexShrink: 0 }}
              >
                {isStreaming ? (
                  <span>Synthesizing...</span>
                ) : (
                  <>
                    <span>Submit</span>
                    <Send size={13} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* ----------------------------------------------------------------------
          RIGHT CITATION INSPECTOR DRAWER
          ---------------------------------------------------------------------- */}
      <AnimatePresence>
        {selectedCitation && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{
              borderLeft: '1px solid var(--hairline)',
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="index-num">CITATION PROVENANCE</span>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>CHUNK INSPECTOR</div>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span className="swiss-chip swiss-chip-red">
                  Sim: {selectedCitation.similarity_score ? `${(selectedCitation.similarity_score * 100).toFixed(1)}%` : 'N/A'}
                </span>
                {selectedCitation.rerank_score && (
                  <span className="swiss-chip swiss-chip-blue">
                    Rerank: {selectedCitation.rerank_score.toFixed(3)}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <span className="meta-label">SOURCE PASSAGE TEXT</span>
                <div
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid var(--hairline)',
                    padding: 16,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--ink-primary)',
                    marginTop: 6,
                  }}
                >
                  {selectedCitation.text}
                </div>
              </div>

              {selectedCitation.parent_text && (
                <div>
                  <span className="meta-label">PARENT CONTEXT BLOCK</span>
                  <div
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid var(--hairline)',
                      padding: 16,
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: 'var(--ink-secondary)',
                      marginTop: 6,
                    }}
                  >
                    {selectedCitation.parent_text}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
