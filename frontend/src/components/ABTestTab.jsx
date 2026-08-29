import React, { useState } from 'react';
import { Activity, Trophy, Zap, Clock, ArrowRight, Play, Check } from 'lucide-react';
import { api } from '../api/client';

export function ABTestTab({ activeCollection }) {
  const [query, setQuery] = useState('How does consistent hashing solve the rehashing problem in distributed caching?');
  const [providerA, setProviderA] = useState('groq');
  const [modelA, setModelA] = useState('openai/gpt-oss-120b');
  const [providerB, setProviderB] = useState('nebius');
  const [modelB, setModelB] = useState('meta-llama/Llama-3.3-70B-Instruct');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRunAB = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await api.runABTest({
        collection_name: activeCollection,
        query: query.trim(),
        provider_a: providerA,
        model_a: modelA,
        provider_b: providerB,
        model_b: modelB,
        judge_provider: 'groq',
        judge_model: 'qwen/qwen3.6-27b',
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Model A/B Comparison & Judge Evaluation</h2>
        <p className="text-xs text-slate-400">
          Run two models in parallel against the same retrieved context from <span className="text-accent-cyan font-mono">{activeCollection}</span>
        </p>
      </div>

      {/* Config Form */}
      <form onSubmit={handleRunAB} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model A */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary-400 uppercase tracking-wider">Model A</span>
              <select
                value={providerA}
                onChange={(e) => setProviderA(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 font-mono"
              >
                <option value="groq">Groq Provider</option>
                <option value="nebius">Nebius AI</option>
              </select>
            </div>
            <input
              type="text"
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              placeholder="Model ID"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Model B */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider">Model B</span>
              <select
                value={providerB}
                onChange={(e) => setProviderB(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 font-mono"
              >
                <option value="nebius">Nebius AI</option>
                <option value="groq">Groq Provider</option>
              </select>
            </div>
            <input
              type="text"
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              placeholder="Model ID"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Test Question / Prompt:</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
        >
          <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Running parallel generation & judge scoring...' : 'Execute A/B Comparison'}</span>
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Results Side by Side */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Judge Verdict Banner */}
          <div className="p-6 rounded-2xl glass-panel border border-primary-500/40 bg-gradient-to-r from-primary-950/40 via-slate-900 to-slate-950 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Judge Verdict:
                  <span className="px-2.5 py-0.5 rounded-md bg-primary-600/40 border border-primary-500/50 text-primary-300 font-mono">
                    {result.judge_evaluation.winner === 'tie' ? 'Tie / Equal' : `Model ${result.judge_evaluation.winner} Wins`}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Evaluated by {result.judge_evaluation.judge_model}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
              "{result.judge_evaluation.critique}"
            </p>
          </div>

          {/* Side by side answers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model A Output */}
            <div className={`glass-panel p-5 rounded-2xl border space-y-3 ${
              result.judge_evaluation.winner === 'A' ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-primary-400 uppercase">Model A ({result.model_a_result.provider})</span>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{result.model_a_result.model}</p>
                </div>
                <div className="text-right text-xs font-mono">
                  <span className="text-slate-400">{(result.model_a_result.latency_ms / 1000).toFixed(2)}s</span>
                  <p className="text-amber-400 font-bold">Score: {(result.judge_evaluation.model_a_score * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {result.model_a_result.answer}
              </div>
            </div>

            {/* Model B Output */}
            <div className={`glass-panel p-5 rounded-2xl border space-y-3 ${
              result.judge_evaluation.winner === 'B' ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-accent-cyan uppercase">Model B ({result.model_b_result.provider})</span>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{result.model_b_result.model}</p>
                </div>
                <div className="text-right text-xs font-mono">
                  <span className="text-slate-400">{(result.model_b_result.latency_ms / 1000).toFixed(2)}s</span>
                  <p className="text-amber-400 font-bold">Score: {(result.judge_evaluation.model_b_score * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {result.model_b_result.answer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
