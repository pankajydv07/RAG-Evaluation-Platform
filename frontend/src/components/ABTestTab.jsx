import React, { useState } from 'react';
import { Play, Sparkles, Trophy, CheckCircle2, Clock, Cpu, Scale } from 'lucide-react';
import { api } from '../api/client';

export function ABTestTab({ activeCollection }) {
  const [query, setQuery] = useState('What is consistent hashing and how does it prevent hot spots?');
  const [modelA, setModelA] = useState('openai/gpt-oss-120b');
  const [modelB, setModelB] = useState('qwen/qwen3.6-27b');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunAB = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.runABTest({
        collection_name: activeCollection || 'system-design',
        query: query.trim(),
        model_a: modelA,
        model_b: modelB,
        top_k: 5,
        enable_reranker: true,
      });
      setResult(res);
    } catch (err) {
      console.error('A/B Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '48px 0', background: 'var(--bg-canvas)', minHeight: 'calc(100vh - 56px)' }}>
      <div className="swiss-container">
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--hairline-heavy)', paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="index-num">SYSTEM // 04</span>
            <span className="meta-label">A/B HEAD-TO-HEAD BENCHMARK MATRIX</span>
          </div>
          <h2>MODEL ARBITRATION BENCHMARK</h2>
          <p style={{ color: 'var(--ink-secondary)', marginTop: 6, maxWidth: 640 }}>
            Execute identical retrieval passes against both Generator A and Generator B. An independent LLM-as-a-Judge arbitrates the responses and declares the superior synthesis.
          </p>
        </div>

        {/* Input Configuration */}
        <div className="swiss-card" style={{ marginBottom: 32 }}>
          <form onSubmit={handleRunAB} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="meta-label">BENCHMARK TEST QUERY</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field"
                style={{ marginTop: 6 }}
              />
            </div>

            <div className="swiss-grid-12">
              <div style={{ gridColumn: 'span 6' }}>
                <label className="meta-label">GENERATOR MODEL A</label>
                <input
                  type="text"
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  className="input-field"
                  style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                />
              </div>
              <div style={{ gridColumn: 'span 6' }}>
                <label className="meta-label">GENERATOR MODEL B</label>
                <input
                  type="text"
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  className="input-field"
                  style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading || !query.trim()} className="btn btn-swiss" style={{ alignSelf: 'flex-start' }}>
              {loading ? (
                <span>Arbitrating Models...</span>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Execute Head-to-Head Benchmark</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Matrix */}
        {result && (
          <div>
            {/* Winner Callout */}
            <div
              style={{
                border: '1px solid var(--hairline-heavy)',
                background: '#FFFFFF',
                padding: 24,
                marginBottom: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span className="index-num">JUDGE ARBITRATION RESULT</span>
                <h3 style={{ marginTop: 6, fontSize: 18 }}>
                  WINNER: <span style={{ color: 'var(--swiss-red)' }}>MODEL {result.winner.toUpperCase()}</span> ({result.winner === 'A' ? result.model_a : result.model_b})
                </h3>
                <p style={{ color: 'var(--ink-secondary)', marginTop: 4, fontSize: 13.5 }}>
                  {result.critique}
                </p>
              </div>
              <Trophy size={36} style={{ color: 'var(--swiss-red)', flexShrink: 0, marginLeft: 24 }} />
            </div>

            {/* Side by Side Comparison Grid */}
            <div className="swiss-grid-12">
              {/* Model A */}
              <div style={{ gridColumn: 'span 6' }}>
                <div className="swiss-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--hairline)', paddingBottom: 12 }}>
                    <div>
                      <span className="index-num">CANDIDATE A</span>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{result.model_a}</div>
                    </div>
                    <span className="swiss-chip">{(result.latency_a_ms / 1000).toFixed(2)}s</span>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-primary)', whiteSpace: 'pre-wrap' }}>
                    {result.response_a}
                  </div>
                </div>
              </div>

              {/* Model B */}
              <div style={{ gridColumn: 'span 6' }}>
                <div className="swiss-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--hairline)', paddingBottom: 12 }}>
                    <div>
                      <span className="index-num">CANDIDATE B</span>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{result.model_b}</div>
                    </div>
                    <span className="swiss-chip">{(result.latency_b_ms / 1000).toFixed(2)}s</span>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-primary)', whiteSpace: 'pre-wrap' }}>
                    {result.response_b}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
