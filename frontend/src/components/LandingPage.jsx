import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Database,
  Sliders,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  Terminal,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export function LandingPage({ onNavigate, activeCollection }) {
  const [activeCodeTab, setActiveCodeTab] = useState('curl');

  return (
    <div style={{ background: 'var(--bg-canvas)', minHeight: 'calc(100vh - 56px)' }}>
      {/* ----------------------------------------------------------------------
          POSTER SPLIT HERO SECTION
          ---------------------------------------------------------------------- */}
      <section style={{ borderBottom: '1px solid var(--hairline)', background: '#FFFFFF' }}>
        <div className="swiss-container" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div className="swiss-grid-12" style={{ alignItems: 'stretch' }}>
            {/* Left: Typographic Manifesto */}
            <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 32 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span className="index-num">SYSTEM // 01</span>
                  <span style={{ height: 1, width: 32, background: 'var(--hairline-heavy)' }} />
                  <span className="meta-label">INTERNATIONAL TYPOGRAPHIC ARCHITECTURE</span>
                </div>

                <h1 style={{ marginBottom: 24, lineHeight: 0.95 }}>
                  OBJECTIVE <br />
                  <span style={{ color: 'var(--swiss-red)' }}>GROUNDING</span> & <br />
                  EVALUATION.
                </h1>

                <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-secondary)', maxWidth: 540, marginBottom: 32 }}>
                  A production Retrieval-Augmented Generation platform built on mathematical precision. 
                  Zero hallucinations, deterministic citation mapping, and continuous LLM-as-a-Judge arbitration.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onNavigate('chat')}
                  className="btn btn-swiss"
                  style={{ padding: '14px 28px', fontSize: 13 }}
                >
                  <span>Launch Retrieval Studio</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => onNavigate('traces')}
                  className="btn"
                  style={{ padding: '14px 24px', fontSize: 13 }}
                >
                  <Activity size={14} style={{ color: 'var(--swiss-red)' }} />
                  <span>Inspect Quality Traces</span>
                </button>
              </div>
            </div>

            {/* Right: Swiss Visual Art & Grid Poster */}
            <div style={{ gridColumn: 'span 5', border: '1px solid var(--hairline-heavy)', background: '#FFFFFF', padding: 16 }}>
              <div style={{ width: '100%', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                <img
                  src="/assets/swiss_hero.jpg"
                  alt="Swiss Typographic Grid Composition"
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-secondary)' }}>
                <span>FIG 1.0 // MODULARE STRUKTUR</span>
                <span style={{ color: 'var(--swiss-red)' }}>ZÜRICH ARCHIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          REAL-TIME TELEMETRY METRIC STRIP
          ---------------------------------------------------------------------- */}
      <section style={{ borderBottom: '1px solid var(--hairline)', background: '#FFFFFF' }}>
        <div className="swiss-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid var(--hairline)' }}>
            <MetricBlock index="01" label="FAITHFULNESS SCORE" value="95.6%" status="HIGH PROVENANCE" />
            <MetricBlock index="02" label="ANSWER RELEVANCE" value="93.9%" status="DIRECT SYNTHESIS" />
            <MetricBlock index="03" label="CONTEXT PRECISION" value="62.1%" status="HYBRID RRF" />
            <MetricBlock index="04" label="EVALUATED RUNS" value="18 / 18" status="100% COVERAGE" />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          SYSTEM ARCHITECTURE BENTO GRID
          ---------------------------------------------------------------------- */}
      <section style={{ padding: '64px 0', borderBottom: '1px solid var(--hairline)' }}>
        <div className="swiss-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <span className="index-num">SYSTEM // 02</span>
              <h2 style={{ marginTop: 6 }}>MATHEMATICAL RETRIEVAL PIPELINE</h2>
            </div>
            <span className="meta-label">FOUR-STAGE REASONING TOPOLOGY</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)' }}>
            <PillarCard
              index="01"
              title="Hierarchical Chunking"
              desc="Parent-child sliding window preservation. Child chunks are embedded for cosine similarity while full parent blocks feed the generator."
              icon={<Layers size={18} style={{ color: 'var(--swiss-red)' }} />}
            />
            <PillarCard
              index="02"
              title="Hybrid Rank Fusion"
              desc="Dense vector embeddings + Sparse BM25 lexical token matching fused with Reciprocal Rank Fusion (RRF) and Cross-Encoder reranking."
              icon={<Zap size={18} style={{ color: 'var(--swiss-red)' }} />}
            />
            <PillarCard
              index="03"
              title="Provenance Grounding"
              desc="Every single statement is mapped to discrete citation markers ([01], [02]) with direct lineage to the source document."
              icon={<ShieldCheck size={18} style={{ color: 'var(--swiss-red)' }} />}
            />
            <PillarCard
              index="04"
              title="LLM-as-a-Judge"
              desc="Autonomous continuous evaluation via independent judge models (Llama 3.3 70B) scoring faithfulness and relevance."
              icon={<Cpu size={18} style={{ color: 'var(--swiss-red)' }} />}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          TECHNICAL VECTOR TOPOLOGY & INTERACTIVE SDK SECTION
          ---------------------------------------------------------------------- */}
      <section style={{ padding: '64px 0', background: '#FFFFFF' }}>
        <div className="swiss-container">
          <div className="swiss-grid-12" style={{ alignItems: 'center' }}>
            {/* Visual Vector Topology Diagram */}
            <div style={{ gridColumn: 'span 6', border: '1px solid var(--hairline-heavy)', padding: 16, background: '#FFFFFF' }}>
              <img
                src="/assets/swiss_vector.jpg"
                alt="Vector Embeddings and Knowledge Topology"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-secondary)' }}>
                <span>FIG 2.0 // VECTOR TOPOLOGY & RRF FUSION</span>
                <span className="index-num">OTL AICHER STYLE</span>
              </div>
            </div>

            {/* Code / API Demonstration */}
            <div style={{ gridColumn: 'span 6', paddingLeft: 24 }}>
              <span className="index-num">DEVELOPER API // 03</span>
              <h2 style={{ marginTop: 8, marginBottom: 16 }}>STREAMING RAG OVER HTTP</h2>
              <p style={{ color: 'var(--ink-secondary)', marginBottom: 24, fontSize: 14 }}>
                Seamless integration via Server-Sent Events (SSE) with instant token streaming and automatic background evaluation.
              </p>

              {/* Tab Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: 16 }}>
                <button
                  onClick={() => setActiveCodeTab('curl')}
                  style={{
                    padding: '8px 16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: 'none',
                    background: activeCodeTab === 'curl' ? 'var(--ink-primary)' : 'transparent',
                    color: activeCodeTab === 'curl' ? '#FFFFFF' : 'var(--ink-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  cURL / SSE
                </button>
                <button
                  onClick={() => setActiveCodeTab('python')}
                  style={{
                    padding: '8px 16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: 'none',
                    background: activeCodeTab === 'python' ? 'var(--ink-primary)' : 'transparent',
                    color: activeCodeTab === 'python' ? '#FFFFFF' : 'var(--ink-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Python SDK
                </button>
              </div>

              {/* Code Box */}
              <div
                style={{
                  background: '#0A0A0A',
                  color: '#F3F4F6',
                  padding: 20,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  border: '1px solid var(--hairline-heavy)',
                  overflowX: 'auto',
                }}
              >
                {activeCodeTab === 'curl' ? (
                  <pre>{`curl -N -X POST http://localhost:8000/api/v1/query/stream \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection_name": "${activeCollection || 'system-design'}",
    "query": "How does consistent hashing work?",
    "top_k": 5,
    "enable_reranker": true,
    "enable_multi_query": true
  }'`}</pre>
                ) : (
                  <pre>{`import httpx

async def stream_rag():
    async with httpx.AsyncClient() as client:
        payload = {
            "collection_name": "${activeCollection || 'system-design'}",
            "query": "Explain DynamoDB partition routing.",
            "top_k": 5
        }
        async with client.stream("POST", "http://localhost:8000/api/v1/query/stream", json=payload) as res:
            async for line in res.aiter_lines():
                print(line)`}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricBlock({ index, label, value, status }) {
  return (
    <div style={{ padding: '24px 20px', borderRight: '1px solid var(--hairline)', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="index-num">{index}</span>
        <span className="meta-label">{status}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink-primary)', marginTop: 12 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-secondary)', marginTop: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function PillarCard({ index, title, desc, icon }) {
  return (
    <div style={{ background: '#FFFFFF', padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span className="index-num">{index}</span>
          {icon}
        </div>
        <h3 style={{ marginBottom: 12, fontSize: 14 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.55 }}>{desc}</p>
      </div>
    </div>
  );
}
