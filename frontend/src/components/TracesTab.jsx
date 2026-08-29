import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, BarChart3, Clock, Cpu, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '../api/client';

export function TracesTab() {
  const [summary, setSummary] = useState(null);
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, traceRes] = await Promise.all([api.getEvalSummary(), api.getTraces()]);
      setSummary(sumRes);
      setTraces(traceRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Evaluation Metrics & Query Traces</h2>
          <p className="text-xs text-slate-400">Observability and automated LLM-as-a-judge quality scorecards</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Aggregate Scorecards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Faithfulness (Mean)</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">
              {(summary.mean_faithfulness * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-500">Zero-hallucination support score</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Answer Relevance</p>
            <p className="text-2xl font-bold text-accent-cyan font-mono">
              {(summary.mean_answer_relevance * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-500">Question answering accuracy</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Context Precision</p>
            <p className="text-2xl font-bold text-primary-400 font-mono">
              {(summary.mean_context_precision * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-500">Top-k retrieval relevance</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Total Traces / Avg Latency</p>
            <p className="text-2xl font-bold text-slate-200 font-mono">
              {summary.total_traces} <span className="text-xs font-sans text-slate-400">({(summary.avg_query_latency_ms / 1000).toFixed(1)}s)</span>
            </p>
            <p className="text-[10px] text-slate-500">Evaluated runs: {summary.evaluated_traces}</p>
          </div>
        </div>
      )}

      {/* Traces List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-sm font-semibold text-slate-200">Historical Query Traces</h3>
        </div>

        <div className="divide-y divide-slate-800/60">
          {traces.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No query traces recorded yet. Submit queries in the Chat tab to view evaluations.
            </div>
          ) : (
            traces.map((trace) => {
              const isExpanded = expandedTrace === trace.id;
              const evalRun = trace.eval_runs && trace.eval_runs[0];

              return (
                <div key={trace.id} className="p-5 hover:bg-slate-800/30 transition-colors">
                  <div
                    onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="space-y-1 flex-1 pr-4">
                      <p className="text-sm font-medium text-slate-200">{trace.query_text}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-slate-500" /> {trace.generator_model || 'Model'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {trace.latency_ms ? `${(trace.latency_ms / 1000).toFixed(2)}s` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Scores preview */}
                    <div className="flex items-center gap-3">
                      {evalRun ? (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                            F: {(evalRun.faithfulness * 100).toFixed(0)}%
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                            R: {(evalRun.answer_relevance * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 rounded">
                          eval in progress...
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Generated Answer:</span>
                        <div className="mt-1 p-3 rounded-xl bg-slate-900 text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {trace.generated_answer}
                        </div>
                      </div>

                      {evalRun && (
                        <div>
                          <span className="text-slate-400 font-medium">Judge Critique ({evalRun.judge_model}):</span>
                          <div className="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed">
                            {evalRun.judge_critique}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
