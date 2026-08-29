import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  ChevronDown,
  Clock,
  Cpu,
  RefreshCw,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

export function TracesTab() {
  const [summary, setSummary] = useState(null);
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingPending, setEvaluatingPending] = useState(false);
  const [expandedTrace, setExpandedTrace] = useState(null);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, traceRes] = await Promise.all([api.getEvalSummary(), api.getTraces()]);
      setSummary(sumRes);
      setTraces(traceRes);
    } catch (err) {
      console.error('Error loading trace telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluatePending = async () => {
    setEvaluatingPending(true);
    setMessage(null);
    try {
      const res = await api.evaluatePendingTraces(10);
      setMessage(`Successfully ran evaluations on ${res.evaluated_count} pending trace(s).`);
      await loadData();
    } catch (err) {
      setMessage(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingPending(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unevaluatedCount = traces.filter(t => !t.eval_runs || t.eval_runs.length === 0).length;

  return (
    <section className="app-page wide">
      <header className="page-head">
        <div>
          <h2>Evaluation & Quality Traces</h2>
          <p>Inspect retrieval telemetry, end-to-end latency, and LLM-as-a-Judge scores from your queries.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {unevaluatedCount > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleEvaluatePending}
              disabled={evaluatingPending || loading}
              className="btn btn-primary"
              style={{ fontSize: 12.5 }}
            >
              {evaluatingPending ? (
                <>
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Judging {unevaluatedCount} trace(s)…
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Evaluate {unevaluatedCount} Pending
                </>
              )}
            </motion.button>
          )}

          <button onClick={loadData} disabled={loading} className="btn">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {message && (
        <div className="status-box success fade-up" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} />
          <div>{message}</div>
        </div>
      )}

      {/* Aggregate Metric Dials */}
      {summary && (
        <div className="metric-strip">
          <Metric
            label="Faithfulness"
            value={`${(summary.mean_faithfulness * 100).toFixed(1)}%`}
            color="var(--green)"
          />
          <Metric
            label="Answer Relevance"
            value={`${(summary.mean_answer_relevance * 100).toFixed(1)}%`}
            color="var(--blue)"
          />
          <Metric
            label="Context Precision"
            value={`${(summary.mean_context_precision * 100).toFixed(1)}%`}
            color="var(--amber)"
          />
          <Metric
            label="Total Runs"
            value={summary.total_traces}
            sub={`${summary.evaluated_traces} evaluated`}
          />
        </div>
      )}

      {/* Traces List */}
      <div className="panel trace-list" style={{ marginTop: '1.5rem' }}>
        {traces.length === 0 ? (
          <div className="status-box" style={{ margin: 24, border: 0 }}>
            <BarChart3 size={20} />
            <div>
              <strong>No traces logged yet</strong>
              <p className="help-text">Ask a question in the Chat studio to record retrieval traces.</p>
            </div>
          </div>
        ) : (
          traces.map((trace) => {
            const isExpanded = expandedTrace === trace.id;
            const evalRun = trace.eval_runs && trace.eval_runs[0];

            return (
              <article key={trace.id} className="trace-row">
                <button
                  className="trace-trigger"
                  onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, paddingRight: 16 }}>
                    <strong style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trace.query_text}
                    </strong>
                    <div className="trace-meta">
                      <span><Cpu size={11} /> {trace.generator_model || 'model'}</span>
                      <span><Clock size={11} /> {trace.latency_ms ? `${(trace.latency_ms / 1000).toFixed(2)}s` : 'pending'}</span>
                      <span>{new Date(trace.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="score-pair" style={{ flexShrink: 0 }}>
                    {evalRun ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="chip chip-green" style={{ fontSize: 11 }}>
                          Faith: {(evalRun.faithfulness * 100).toFixed(0)}%
                        </span>
                        <span className="chip chip-blue" style={{ fontSize: 11 }}>
                          Rel: {(evalRun.answer_relevance * 100).toFixed(0)}%
                        </span>
                        <span className="chip chip-amber" style={{ fontSize: 11 }}>
                          Prec: {(evalRun.context_precision * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="chip" style={{ color: 'var(--text-tertiary)' }}>
                        Pending Judge
                      </span>
                    )}
                    <ChevronDown size={15} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="trace-detail fade-up">
                    <div>
                      <span className="field-label">Generated Answer</span>
                      <div className="code-box" style={{ marginTop: 4 }}>{trace.generated_answer || 'No answer recorded.'}</div>
                    </div>

                    {evalRun ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span className="field-label" style={{ color: 'var(--green)' }}>
                            Judge Evaluation ({evalRun.judge_model})
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                            Judge latency: {evalRun.eval_latency_ms ? `${(evalRun.eval_latency_ms / 1000).toFixed(2)}s` : 'N/A'}
                          </span>
                        </div>
                        <div className="code-box" style={{ borderColor: 'rgba(0, 240, 168, 0.25)', background: 'var(--surface-1)' }}>
                          {evalRun.judge_critique || 'No critique provided.'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-1)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          This trace has not been evaluated by an LLM judge yet.
                        </span>
                        <button
                          onClick={handleEvaluatePending}
                          disabled={evaluatingPending}
                          className="btn btn-primary"
                          style={{ fontSize: 11.5, padding: '4px 10px' }}
                        >
                          Run Judge Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong style={{ color: color || 'var(--text-primary)' }}>{value}</strong>
      {sub && <p className="help-text" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</p>}
      {!sub && <Activity size={14} style={{ marginTop: '0.6rem', color: color || 'var(--accent)' }} />}
    </div>
  );
}
