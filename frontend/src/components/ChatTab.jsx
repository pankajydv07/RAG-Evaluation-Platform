import React, { useState } from 'react';
import { Send, Bot, User, BookOpen, Clock, Zap, FileText, X, CheckCircle, Loader2, GitMerge, LayoutList } from 'lucide-react';
import { api } from '../api/client';

export function ChatTab({ activeCollection }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am ready to answer questions using grounded knowledge from collection "${activeCollection}". Ask me anything!`,
      citations: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [enableMultiQuery, setEnableMultiQuery] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: userQuery, multiQuery: enableMultiQuery }]);

    const assistantIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        citations: [],
        streaming: true,
        evalStatus: 'pending',
        multiQuery: enableMultiQuery,
      },
    ]);

    setLoading(true);

    try {
      await api.streamQueryRAG(
        activeCollection,
        userQuery,
        (citations) => {
          setMessages((prev) =>
            prev.map((msg, i) => (i === assistantIndex ? { ...msg, citations } : msg))
          );
        },
        (token) => {
          setMessages((prev) =>
            prev.map((msg, i) =>
              i === assistantIndex ? { ...msg, content: msg.content + token } : msg
            )
          );
        },
        (doneData) => {
          setMessages((prev) =>
            prev.map((msg, i) =>
              i === assistantIndex
                ? {
                    ...msg,
                    streaming: false,
                    latency: doneData.latency_ms,
                    traceId: doneData.trace_id,
                    evalStatus: 'evaluating',
                  }
                : msg
            )
          );
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((msg, i) =>
                i === assistantIndex ? { ...msg, evalStatus: 'done' } : msg
              )
            );
          }, 3000);
        },
        5,
        null,
        enableMultiQuery,
        true
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === assistantIndex
            ? { ...msg, content: `⚠️ Error: ${err.message}`, streaming: false }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto p-4 gap-4">
      {/* Chat Conversation Pane */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden border border-slate-800">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[75%] rounded-2xl p-4.5 shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-none'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {/* Multi-query badge on user messages */}
                {msg.role === 'user' && msg.multiQuery && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] text-indigo-200 font-mono">
                    <GitMerge className="w-3 h-3" /> Multi-Query Fusion
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content || (msg.streaming && <span className="inline-flex gap-1 items-center"><span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce delay-100" /><span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce delay-200" /></span>)}</div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-accent-cyan" /> Citations:
                    </span>
                    {msg.citations.map((c, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => setSelectedCitation(c)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 transition-colors flex items-center gap-1.5"
                      >
                        [{cIdx + 1}]
                        <span className="text-[10px] text-slate-400 font-sans">
                          ({(c.similarity_score * 100).toFixed(0)}%)
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Meta + Eval badge */}
                {msg.role === 'assistant' && !msg.streaming && msg.latency && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      {msg.multiQuery && (
                        <span className="flex items-center gap-1 text-indigo-400">
                          <GitMerge className="w-3 h-3" /> RAG-Fusion
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <LayoutList className="w-3 h-3 text-emerald-400" /> Reordered
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {(msg.latency / 1000).toFixed(2)}s
                      </span>
                    </div>

                    {msg.evalStatus === 'evaluating' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Evaluating...
                      </span>
                    )}
                    {msg.evalStatus === 'done' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Async Evaluated
                      </span>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800 bg-slate-950/60">
          {/* Toolbar row */}
          <div className="px-4 pt-3 pb-1 flex items-center gap-3">
            <button
              id="toggle-multi-query"
              type="button"
              onClick={() => setEnableMultiQuery((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                enableMultiQuery
                  ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
              title="Enable Multi-Query RAG-Fusion: generate 3 query variations and merge results via RRF"
            >
              <GitMerge className="w-3.5 h-3.5" />
              Multi-Query Fusion
              {enableMultiQuery && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </button>
            <span className="text-[10px] text-slate-600">
              {enableMultiQuery
                ? 'Generates 3 query variations → RRF fusion → Lost-in-the-Middle reorder'
                : 'Standard dense retrieval + reranking + Lost-in-the-Middle reorder'}
            </span>
          </div>

          <form onSubmit={handleSend} className="p-4 pt-2 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question based on "${activeCollection}"...`}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-5 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary-600/20"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Citation Detail Drawer */}
      {selectedCitation && (
        <div className="w-96 glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col animate-in fade-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-accent-cyan font-semibold text-sm">
              <FileText className="w-4 h-4" />
              <span>Retrieved Passage Context</span>
            </div>
            <button
              onClick={() => setSelectedCitation(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="my-4 space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Similarity Score:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {(selectedCitation.similarity_score * 100).toFixed(2)}%
              </span>
            </div>
            {selectedCitation.rerank_score !== undefined && selectedCitation.rerank_score !== null && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Rerank Score:</span>
                <span className="font-mono text-primary-400 font-semibold">
                  {selectedCitation.rerank_score.toFixed(3)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-400">
              <span>Source URI:</span>
              <span className="truncate max-w-[200px] text-slate-300 font-mono">
                {selectedCitation.metadata?.source || 'Document'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed">
            {selectedCitation.text}
          </div>
        </div>
      )}
    </div>
  );
}
