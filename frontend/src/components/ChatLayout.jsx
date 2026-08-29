import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, MessageSquare, Trash2, Bot, User,
  BookOpen, Clock, GitMerge, CheckCircle,
  Loader2, FileText, X, ArrowUp, Cpu,
} from 'lucide-react';
import { api } from '../api/client';

/* ─── Constants ──────────────────────────────────────────────────── */
const STORAGE_KEY = 'ragapp_v2_sessions';
const ACTIVE_KEY  = 'ragapp_v2_active';

/* ─── Helpers ────────────────────────────────────────────────────── */
function uid() { return crypto.randomUUID(); }

function newSession(collection) {
  return { id: uid(), title: 'New chat', collection, createdAt: Date.now(), messages: [] };
}

function trunc(str, n = 28) { return str.length > n ? str.slice(0, n) + '…' : str; }

function ageGroup(ts) {
  const d = Date.now() - ts;
  if (d < 86_400_000)      return 'Today';
  if (d < 172_800_000)     return 'Yesterday';
  if (d < 604_800_000)     return 'This week';
  return 'Older';
}

function groupSessions(list) {
  const keys = ['Today', 'Yesterday', 'This week', 'Older'];
  const m = Object.fromEntries(keys.map(k => [k, []]));
  list.forEach(s => m[ageGroup(s.createdAt)].push(s));
  return keys.map(label => ({ label, items: m[label] })).filter(g => g.items.length);
}

/* ─── localStorage hook ──────────────────────────────────────────── */
function useSessions(collection) {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  const active = sessions.find(s => s.id === activeId) || null;

  const create = useCallback(() => {
    const s = newSession(collection);
    setSessions(p => [s, ...p]);
    setActiveId(s.id);
  }, [collection]);

  const remove = useCallback((id) => {
    setSessions(p => {
      const next = p.filter(s => s.id !== id);
      if (activeId === id) setActiveId(next[0]?.id || null);
      return next;
    });
  }, [activeId]);

  const update = useCallback((id, fn) => {
    setSessions(p => p.map(s => s.id === id ? fn(s) : s));
  }, []);

  return { sessions, active, activeId, setActiveId, create, remove, update };
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
function Sidebar({ sessions, activeId, setActiveId, create, remove }) {
  const [hover, setHover] = useState(null);
  const groups = groupSessions(sessions);

  return (
    <aside style={{
      width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
      height: '100%', background: 'var(--surface-1)',
      borderRight: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid var(--border)' }}>
        <button
          id="new-chat-btn"
          className="btn"
          onClick={create}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <Plus size={12} strokeWidth={2} />
          New chat
        </button>
      </div>

      {/* Session list */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
        {groups.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.09em',
              color: 'var(--text-tertiary)',
              padding: '0 4px', marginBottom: 3,
            }}>{label}</p>

            {items.map(s => (
              <div
                key={s.id}
                className={`session-row ${s.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(s.id)}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
              >
                <MessageSquare
                  size={11} strokeWidth={1.5}
                  style={{ flexShrink: 0, color: s.id === activeId ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
                />
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: 12.5,
                  color: s.id === activeId ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {trunc(s.title)}
                </span>

                <AnimatePresence>
                  {hover === s.id && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.1 }}
                      onClick={e => { e.stopPropagation(); remove(s.id); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-tertiary)', padding: '2px 3px',
                        borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ))}

        {sessions.length === 0 && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
            No conversations yet
          </p>
        )}
      </nav>
    </aside>
  );
}

/* ─── Citation panel ─────────────────────────────────────────────── */
function CitationPanel({ citation, onClose }) {
  return (
    <AnimatePresence>
      {citation && (
        <motion.aside
          className="slide-in-right"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: 'var(--surface-1)', borderLeft: '1px solid var(--border)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <FileText size={11} strokeWidth={1.5} /> Source
            </div>
            <button
              onClick={onClose}
              className="btn"
              style={{ padding: '3px 5px', minWidth: 0 }}
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>

          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12 }}>
              <dt style={{ color: 'var(--text-tertiary)' }}>Similarity</dt>
              <dd style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 500 }}>
                {(citation.similarity_score * 100).toFixed(1)}%
              </dd>
              {citation.rerank_score != null && <>
                <dt style={{ color: 'var(--text-tertiary)' }}>Rerank</dt>
                <dd style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 500 }}>
                  {citation.rerank_score.toFixed(4)}
                </dd>
              </>}
              <dt style={{ color: 'var(--text-tertiary)' }}>Source</dt>
              <dd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                {citation.metadata?.source || 'Unknown'}
              </dd>
            </dl>
          </div>

          <div style={{
            flex: 1, overflow: 'auto', margin: '10px 10px 12px',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', padding: '10px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)',
            lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {citation.text}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ─── Message ────────────────────────────────────────────────────── */
function Message({ msg, idx, onCite }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        gap: 10,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-start',
      }}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div style={{
          width: 24, height: 24, borderRadius: 'var(--r-md)', flexShrink: 0,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 2,
        }}>
          <Cpu size={12} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}

      <div style={{ maxWidth: '73%', display: 'flex', flexDirection: 'column', gap: 5, alignItems: isUser ? 'flex-end' : 'flex-start', minWidth: 0 }}>

        {/* User: fusion tag */}
        {isUser && msg.multiQuery && (
          <span className="chip chip-active" style={{ fontSize: 10 }}>
            <GitMerge size={9} strokeWidth={1.5} /> fusion
          </span>
        )}

        {/* Bubble */}
        <div className={isUser ? 'msg-user' : 'msg-bot'}>
          {msg.streaming && !msg.content ? (
            <span style={{ display: 'flex', gap: 5, alignItems: 'center', height: 20 }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content}
            </div>
          )}

          {/* Citation chips */}
          {msg.citations && msg.citations.length > 0 && (
            <div style={{
              marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)',
              display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
            }}>
              <BookOpen size={10} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
              {msg.citations.map((c, i) => (
                <button
                  key={i}
                  onClick={() => onCite(c)}
                  className="chip chip-interactive"
                  style={{ background: 'none' }}
                >
                  [{i + 1}]
                  <span style={{ color: 'var(--text-tertiary)' }}> {(c.similarity_score * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bot: meta row */}
        {!isUser && !msg.streaming && msg.latency != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {msg.multiQuery && (
              <span className="chip chip-active"><GitMerge size={9} strokeWidth={1.5} /> rrf</span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={9} strokeWidth={1.5} /> {(msg.latency / 1000).toFixed(2)}s
            </span>
            {msg.evalStatus === 'evaluating' && (
              <span className="chip chip-amber">
                <Loader2 size={9} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} /> eval
              </span>
            )}
            {msg.evalStatus === 'done' && (
              <span className="chip chip-green"><CheckCircle size={9} strokeWidth={1.5} /> evaluated</span>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div style={{
          width: 24, height: 24, borderRadius: 'var(--r-md)', flexShrink: 0,
          background: 'var(--surface-3)', border: '1px solid var(--border-hi)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 2,
        }}>
          <User size={12} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────── */
function EmptyState({ collection }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ margin: 'auto', textAlign: 'center', padding: '0 24px' }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <Cpu size={18} strokeWidth={1.25} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
        Ask anything
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
        Querying{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
          {collection}
        </code>
        {' '}with hybrid search, cross-encoder rerank, and multi-query fusion.
      </p>
    </motion.div>
  );
}

/* ─── ChatWindow ─────────────────────────────────────────────────── */
function ChatWindow({ session, update, collection }) {
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [citation, setCitation] = useState(null);
  const [fusion, setFusion]     = useState(false);
  const textareaRef = useRef(null);
  const bottomRef   = useRef(null);
  const messages    = session?.messages || [];

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content?.length]);

  const patch = useCallback(fn => {
    update(session.id, s => ({ ...s, messages: fn(s.messages) }));
  }, [session?.id, update]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 168) + 'px';
  };

  const send = async () => {
    if (!input.trim() || loading || !session) return;
    const query = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';

    // Auto-title on first user message
    if (!messages.some(m => m.role === 'user')) {
      update(session.id, s => ({ ...s, title: trunc(query, 38) }));
    }

    const userMsg = { role: 'user', content: query, multiQuery: fusion };
    const botMsg  = { role: 'assistant', content: '', citations: [], streaming: true, evalStatus: null, multiQuery: fusion };
    const botIdx  = messages.length + 1;

    patch(p => [...p, userMsg, botMsg]);
    setLoading(true);

    try {
      await api.streamQueryRAG(
        collection, query,
        cits  => patch(p => p.map((m, i) => i === botIdx ? { ...m, citations: cits } : m)),
        token => patch(p => p.map((m, i) => i === botIdx ? { ...m, content: m.content + token } : m)),
        done  => {
          patch(p => p.map((m, i) => i === botIdx
            ? { ...m, streaming: false, latency: done.latency_ms, evalStatus: 'evaluating' }
            : m
          ));
          setTimeout(() => {
            patch(p => p.map((m, i) => i === botIdx ? { ...m, evalStatus: 'done' } : m));
          }, 3500);
        },
        5, null, fusion, true
      );
    } catch (err) {
      patch(p => p.map((m, i) => i === botIdx ? { ...m, content: `Error: ${err.message}`, streaming: false } : m));
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0)' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Select a conversation or create one</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--surface-0)' }}>
      {/* Thread area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Thread header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 44,
          padding: '0 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-0)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {session.title}
          </span>
          <span className="chip">{collection}</span>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 20px 8px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {messages.length === 0
            ? <EmptyState collection={collection} />
            : messages.map((m, i) => <Message key={i} msg={m} idx={i} onCite={setCitation} />)
          }
          <div ref={bottomRef} />
        </div>

        {/* Compose area */}
        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-0)', flexShrink: 0 }}>

          {/* Fusion toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              id="multi-query-toggle"
              className="btn"
              onClick={() => setFusion(v => !v)}
              style={fusion ? {
                borderColor: 'rgba(77,157,224,0.3)',
                color: 'var(--blue)',
                background: 'rgba(77,157,224,0.05)',
              } : {}}
            >
              <GitMerge size={11} strokeWidth={1.75} />
              Multi-Query Fusion
              {fusion && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }}
                />
              )}
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
              {fusion ? '4× retrieval + RRF + LitM reorder' : 'standard retrieval + rerank + LitM reorder'}
            </span>
          </div>

          {/* Input */}
          <div className="input-wrap">
            <textarea
              ref={textareaRef}
              className="input"
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question…"
              rows={1}
              style={{ minHeight: 36, maxHeight: 168, overflow: 'hidden', paddingTop: 6, paddingBottom: 4 }}
            />
            <motion.button
              className="btn-primary"
              onClick={send}
              disabled={!input.trim() || loading}
              whileTap={{ scale: 0.94 }}
              style={{ borderRadius: 'var(--r-md)', padding: '6px 8px', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 0, minWidth: 0, border: 'none', cursor: 'pointer' }}
            >
              {loading
                ? <Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                : <ArrowUp size={13} strokeWidth={2.5} />
              }
            </motion.button>
          </div>

          <p style={{ marginTop: 5, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}>
            ↵ send · ⇧↵ newline
          </p>
        </div>
      </div>

      {/* Citation panel */}
      <CitationPanel citation={citation} onClose={() => setCitation(null)} />
    </div>
  );
}

/* ─── ChatLayout (root) ──────────────────────────────────────────── */
export function ChatLayout({ activeCollection }) {
  const { sessions, active, activeId, setActiveId, create, remove, update } =
    useSessions(activeCollection);

  useEffect(() => {
    if (sessions.length === 0) create();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!activeId && sessions.length > 0) setActiveId(sessions[0].id);
  }, [activeId, sessions, setActiveId]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        setActiveId={setActiveId}
        create={create}
        remove={remove}
      />
      <ChatWindow
        session={active}
        update={update}
        collection={activeCollection}
      />
    </div>
  );
}
