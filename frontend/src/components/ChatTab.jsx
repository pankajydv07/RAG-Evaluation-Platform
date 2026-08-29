import React, { useState } from 'react';
import { Send, Bot, User, BookOpen, Clock, Zap, FileText, ChevronRight, X } from 'lucide-react';
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const res = await api.queryRAG(activeCollection, userQuery, 5);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          citations: res.citations || [],
          model: res.model,
          latency: res.latency_ms,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error executing query: ${err.message}`,
          citations: [],
        },
      ]);
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
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations bar */}
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

                {/* Meta details */}
                {msg.model && (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-3 font-mono">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" /> {msg.model.split('/').pop()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {msg.latency ? `${(msg.latency / 1000).toFixed(1)}s` : ''}
                    </span>
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

          {loading && (
            <div className="flex gap-4 justify-start items-center">
              <div className="w-8 h-8 rounded-lg bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-400">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-accent-violet animate-bounce delay-200" />
                <span>Retrieving passages & generating grounded response...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/60 flex gap-3">
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
