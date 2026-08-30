import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  ChevronDown,
  Clock,
  Cpu,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
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
      setMessage(`Evaluated ${res.evaluated_count} pending trace(s).`);
      await loadData();
    } catch (err) {
      setMessage(`Evaluation error: ${err.message}`);
    } finally {
      setEvaluatingPending(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unevaluatedCount = traces.filter((t) => !t.eval_runs || t.eval_runs.length === 0).length;

  return (
    <div style={{ padding: '48px 0', background: 'var(--bg-canvas)', minHeight: 'calc(100vh - 56px)' }}>
      <div className="swiss-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--hairline-heavy)', paddingBottom: 24, marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="index-num">SYSTEM // 05</span>
              <span className="meta-label">LLM-AS-A-JUDGE OBSERVATORY</span>
            </div>
            <h2>EVALUATION & QUALITY TRACES</h2>
            <p style={{ color: 'var(--ink-secondary)', marginTop: 6, maxWidth: 640 }}>
              Continuous evaluation traces measuring Faithfulness, Answer Relevance, and Context Precision across every executed RAG query.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {unevaluatedCount > 0 && (
              <button
                onClick={handleEvaluatePending}
                disabled={evaluatingPending || loading}
                className="btn btn-swiss"
              >
                <Sparkles size={13} />
                <span>{evaluatingPending ? 'Judging Traces...' : `Evaluate ${unevaluatedCount} Pending`}</span>
              </button>
            )}
            <button onClick={loadData} disabled={loading} className="btn">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 16px',
              border: '1px solid var(--signal-green)',
              background: 'var(--signal-green-light)',
              color: 'var(--signal-green)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 24,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            <CheckCircle2 size={14} />
            <span>{message}</span>
          </div>
        )}

        {/* Metric Strip */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)', marginBottom: 32 }}>
            <div className="metric-tile">
              <div className="metric-tile-label">
                <span>01 // FAITHFULNESS</span>
                <Activity size={12} style={{ color: 'var(--swiss-red)' }} />
              </div>
              <div className="metric-tile-value" style={{ color: 'var(--swiss-red)' }}>
                {(summary.mean_faithfulness * 100).toFixed(1)}%
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)', marginTop: 8 }}>
                ZERO HALLUCINATIONS
              </div>
            </div>

            <div className="metric-tile">
              <div className="metric-tile-label">
                <span>02 // ANSWER RELEVANCE</span>
                <Activity size={12} style={{ color: 'var(--signal-blue)' }} />
              </div>
              <div className="metric-tile-value">
                {(summary.mean_answer_relevance * 100).toFixed(1)}%
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)', marginTop: 8 }}>
                DIRECT FACTUAL SYNTHESIS
              </div>
            </div>

            <div className="metric-tile">
              <div className="metric-tile-label">
                <span>03 // CONTEXT PRECISION</span>
                <Activity size={12} style={{ color: 'var(--signal-amber)' }} />
              </div>
              <div className="metric-tile-value">
                {(summary.mean_context_precision * 100).toFixed(1)}%
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)', marginTop: 8 }}>
                RETRIEVAL SIGNAL DENSITY
              </div>
            </div>

            <div className="metric-tile">
              <div className="metric-tile-label">
                <span>04 // EVALUATION RUNS</span>
                <Activity size={12} style={{ color: 'var(--signal-green)' }} />
              </div>
              <div className="metric-tile-value">
                {summary.total_traces}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)', marginTop: 8 }}>
                {summary.evaluated_traces} EVALUATED RUNS
              </div>
            </div>
          </div>
        )}

        {/* Traces Directory Table */}
        <div style={{ border: '1px solid var(--hairline)', background: '#FFFFFF' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="meta-label">QUERY TRACE LOG ({traces.length} ENTRIES)</span>
            <span className="meta-label">CRITIQUE & METRIC BREAKDOWN</span>
          </div>

          {traces.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <BarChart3 size={24} style={{ color: 'var(--ink-tertiary)', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>No telemetry traces recorded</div>
              <p style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 4 }}>
                Ask questions in the Retrieval Studio to log traces.
              </p>
            </div>
          ) : (
            traces.map((trace, idx) => {
              const isExpanded = expandedTrace === trace.id;
              const evalRun = trace.eval_runs && trace.eval_runs[0];

              return (
                <div key={trace.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <button
                    onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: isExpanded ? 'var(--bg-subtle)' : '#FFFFFF',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ minWidth: 0, paddingRight: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="index-num">#{String(traces.length - idx).padStart(2, '0')}</span>
                        <strong style={{ fontSize: 13.5, color: 'var(--ink-primary)' }}>{trace.query_text}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)' }}>
                        <span>MODEL: {trace.generator_model || 'default'}</span>
                        <span>•</span>
                        <span>LATENCY: {trace.latency_ms ? `${(trace.latency_ms / 1000).toFixed(2)}s` : 'N/A'}</span>
                        <span>•</span>
                        <span>{new Date(trace.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {evalRun ? (
                        <>
                          <span className="swiss-chip swiss-chip-red">Faith: {(evalRun.faithfulness * 100).toFixed(0)}%</span>
                          <span className="swiss-chip swiss-chip-blue">Rel: {(evalRun.answer_relevance * 100).toFixed(0)}%</span>
                          <span className="swiss-chip swiss-chip-amber">Prec: {(evalRun.context_precision * 100).toFixed(0)}%</span>
                        </>
                      ) : (
                        <span className="swiss-chip">PENDING JUDGE</span>
                      )}
                      <ChevronDown size={15} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: 24, background: '#FAFAFA', borderTop: '1px solid var(--hairline)' }}>
                      <div style={{ marginBottom: 20 }}>
                        <span className="meta-label">GENERATED ANSWER</span>
                        <div style={{ background: '#FFFFFF', border: '1px solid var(--hairline)', padding: 16, fontSize: 13, lineHeight: 1.65, marginTop: 6 }}>
                          {trace.generated_answer || 'No answer text recorded.'}
                        </div>
                      </div>

                      {evalRun ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span className="meta-label" style={{ color: 'var(--swiss-red)' }}>
                              JUDGE CRITIQUE ({evalRun.judge_model})
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)' }}>
                              EVAL LATENCY: {evalRun.eval_latency_ms ? `${(evalRun.eval_latency_ms / 1000).toFixed(2)}s` : 'N/A'}
                            </span>
                          </div>
                          <div style={{ background: '#FFFFFF', border: '1px solid var(--hairline)', padding: 16, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-secondary)' }}>
                            {evalRun.judge_critique || 'No critique recorded.'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 16, background: '#FFFFFF', border: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                            This trace has not been evaluated by an LLM judge yet.
                          </span>
                          <button onClick={handleEvaluatePending} disabled={evaluatingPending} className="btn btn-swiss" style={{ padding: '6px 12px', fontSize: 11 }}>
                            Run Judge Now
                          </button>
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
