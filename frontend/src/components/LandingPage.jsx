import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Database,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  GitMerge,
  Search,
  CheckCircle,
  BarChart3,
  Terminal,
  Activity,
  Code2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export function LandingPage({ collections, activeCollection, onNavigate }) {
  const [activeTabPreview, setActiveTabPreview] = useState('hybrid');
  const [copiedCode, setCopiedCode] = useState(false);

  const sampleSnippet = `from ragapp.engine import RAGPipeline

# Initialize production retrieval with RRF fusion
rag = RAGPipeline(
    collection="${activeCollection || 'system-design'}",
    enable_multi_query=True,
    enable_litm_reorder=True,
    similarity_top_k=5
)

# Stream grounded response with online judge scores
response = rag.query("How does consistent hashing minimize remapping?")
for chunk in response.stream():
    print(chunk.token, end="", flush=True)`;

  const copySnippet = () => {
    navigator.clipboard.writeText(sampleSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{ background: 'var(--surface-0)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      
      {/* ─── 1. HERO SECTION (Asymmetric Split with Live Terminal Preview) ─── */}
      <section style={{
        minHeight: 'calc(100dvh - 52px)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        padding: '48px 24px 64px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Subtle grid background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, #000 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, #000 70%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
            
            {/* Left Hero Column */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="chip chip-blue" style={{ fontSize: 11, padding: '3px 8px' }}>
                  <Zap size={10} strokeWidth={2} /> v2.4 Engine Active
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Hybrid Search + LitM + Judge
                </span>
              </div>

              <h1 style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 650,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                color: 'var(--text-primary)',
              }}>
                Grounded answers. Inspectable traces.
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.8vw, 17px)',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                maxWidth: '52ch',
              }}>
                Production retrieval engine combining dense vector search, BM25 sparse index, Reciprocal Rank Fusion, and real-time LLM-as-a-Judge evaluation.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  onClick={() => onNavigate('chat')}
                  style={{
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  Launch Interactive Chat
                  <ArrowRight size={14} strokeWidth={2} />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn"
                  onClick={() => onNavigate('ingestion')}
                  style={{
                    padding: '10px 16px',
                    fontSize: 14,
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <Database size={14} strokeWidth={1.5} />
                  Manage Knowledge Base
                </motion.button>
              </div>

              {/* Trust/Metric Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                paddingTop: 24,
                marginTop: 12,
                borderTop: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
                    &lt; 85ms
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>Retrieval latency</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--green)' }}>
                    94.2%
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>Faithfulness score</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--blue)' }}>
                    4x RRF
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>Multi-query fusion</div>
                </div>
              </div>
            </motion.div>

            {/* Right Hero Column: Interactive Engine Inspector */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                overflow: 'hidden',
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
              }}
            >
              {/* Window Title Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                    pipeline_trace.py
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setActiveTabPreview('hybrid')}
                    className={`chip ${activeTabPreview === 'hybrid' ? 'chip-active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    Flow
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('code')}
                    className={`chip ${activeTabPreview === 'code' ? 'chip-active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    SDK
                  </button>
                </div>
              </div>

              {/* Window Content */}
              {activeTabPreview === 'hybrid' ? (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Step 1: Query */}
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span className="chip" style={{ fontSize: 10 }}>01 · Inbound Query</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>316 tokens</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      "How does consistent hashing minimize remapping during node failure?"
                    </div>
                  </div>

                  {/* Step 2: Multi-Query Generation */}
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="chip chip-blue" style={{ fontSize: 10 }}>
                        <GitMerge size={9} /> 02 · RRF Multi-Query Fusion (4 Variations)
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)' }}>✓ dense + sparse</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <div>› 1. Hash ring partition redistribution mechanics</div>
                      <div>› 2. Virtual nodes impact on key remapping overhead</div>
                      <div>› 3. Node crash fault tolerance in distributed storage</div>
                    </div>
                  </div>

                  {/* Step 3: Reordered Context & Online Judge */}
                  <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-hi)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="chip chip-green" style={{ fontSize: 10 }}>
                        <CheckCircle size={9} /> 03 · Lost-In-The-Middle Context Reorder
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                        Score: 0.96 / 1.0
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Context chunks strategically positioned with primary citations at edge boundaries to prevent attention degradation in long prompts.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <pre style={{
                    margin: 0,
                    padding: 16,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                  }}>
                    <code>{sampleSnippet}</code>
                  </pre>
                  <button
                    onClick={copySnippet}
                    className="btn"
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      fontSize: 11,
                      padding: '3px 8px',
                    }}
                  >
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ─── 2. PIPELINE ARCHITECTURE BENTO GRID ─── */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '80px 24px', position: 'relative' }}>
        <div style={{ marginBottom: 40 }}>
          <span className="chip" style={{ marginBottom: 12 }}>Engine Architecture</span>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Engineered for retrieval precision.
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {/* Bento Cell 1: Hybrid Vector + BM25 */}
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 220,
          }}>
            <div>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Search size={16} strokeWidth={1.5} style={{ color: 'var(--blue)' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                Hybrid Dense + Sparse Search
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Combines high-dimensional semantic embeddings with BM25 exact keyword inverted index to ensure zero missed terminology.
              </p>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
              <span className="chip">HNSW Index</span>
              <span className="chip">BM25 Sparse</span>
            </div>
          </div>

          {/* Bento Cell 2: Cross-Encoder Reranker */}
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 220,
          }}>
            <div>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Layers size={16} strokeWidth={1.5} style={{ color: 'var(--green)' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                Cross-Encoder Reranking
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Second-stage reranking scores query-document pairs jointly with deep cross-attention, filtering out irrelevant semantic noise.
              </p>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
              <span className="chip">Cross-Attention</span>
              <span className="chip">Top-K Calibration</span>
            </div>
          </div>

          {/* Bento Cell 3: Context Reordering (Lost In The Middle) */}
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 220,
          }}>
            <div>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Cpu size={16} strokeWidth={1.5} style={{ color: 'var(--amber)' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                Lost-in-the-Middle Mitigation
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Alternating reorder places highest-relevance context at top and bottom of LLM prompt window where positional attention is strongest.
              </p>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
              <span className="chip">U-Shape Distribution</span>
              <span className="chip">Attention Priming</span>
            </div>
          </div>

          {/* Bento Cell 4: Online LLM Judge & Tracing (Wide) */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: 28,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            alignItems: 'center',
          }}>
            <div>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--green)' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                Online LLM-as-a-Judge Evaluation
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '55ch' }}>
                Every single query generation is scored asynchronously against Faithfulness, Answer Relevance, and Context Precision without blocking token streaming.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: 16,
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faithfulness</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--green)', marginTop: 4 }}>0.95</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relevance</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--blue)', marginTop: 4 }}>0.92</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precision</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--amber)', marginTop: 4 }}>0.98</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. WORKSPACE MODULES / NAVIGATION CALLOUTS ─── */}
      <section style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            
            <div
              onClick={() => onNavigate('chat')}
              style={{
                cursor: 'pointer',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                transition: 'border-color 150ms, transform 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Zap size={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Interactive Chat</h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Full session persistence with citation drawers, live token streaming, and multi-query toggle.
              </p>
            </div>

            <div
              onClick={() => onNavigate('ingestion')}
              style={{
                cursor: 'pointer',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                transition: 'border-color 150ms, transform 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Database size={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Knowledge Ingestion</h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Parse PDFs, text, and markdown files with customizable chunk sizes and overlap controls.
              </p>
            </div>

            <div
              onClick={() => onNavigate('ab_test')}
              style={{
                cursor: 'pointer',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                transition: 'border-color 150ms, transform 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <BarChart3 size={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>A/B Comparison Lab</h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Run simultaneous side-by-side model generations and evaluate win rates with LLM judges.
              </p>
            </div>

            <div
              onClick={() => onNavigate('traces')}
              style={{
                cursor: 'pointer',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                transition: 'border-color 150ms, transform 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Activity size={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Evaluation Traces</h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Deep-dive into granular trace timelines, token latencies, and judge critique telemetry.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 4. BOTTOM ACTION FOOTER ─── */}
      <footer style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Ready to explore your documents?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Active on collection <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{activeCollection || 'system-design'}</span> ({collections.length} total collections ready).
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            className="btn btn-primary"
            onClick={() => onNavigate('chat')}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500 }}
          >
            Open Chat Studio
            <ArrowRight size={14} />
          </motion.button>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}>
          <div>RAG Platform · Advanced Retrieval Lab</div>
          <div>Built with ChromaDB, FastEmbed, Groq & Nebius</div>
        </div>
      </footer>

    </div>
  );
}
