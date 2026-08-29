import React, { useState } from 'react';
import { AlertCircle, Check, GitCompare, Play } from 'lucide-react';
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

  const handleRunAB = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.runABTest({
        collection_name: activeCollection,
        query: query.trim(),
        provider_a: providerA,
        model_a: modelA,
        provider_b: providerB,
        model_b: modelB,
        judge_provider: 'groq',
        judge_model: 'qwen/qwen3.6-27b',
      });
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const winner = result?.judge_evaluation?.winner;

  return (
    <section className="app-page wide">
      <header className="page-head">
        <div>
          <h2>Compare model answers.</h2>
          <p>
            Run two generators against the same retrieved context from
            {' '}<span className="font-mono" style={{ color: 'var(--accent)' }}>{activeCollection}</span>.
          </p>
        </div>
      </header>

      <form className="panel panel-pad form-stack" onSubmit={handleRunAB}>
        <div className="compare-grid">
          <div className="model-panel">
            <header>
              <strong>Model A</strong>
              <select value={providerA} onChange={(event) => setProviderA(event.target.value)}>
                <option value="groq">Groq</option>
                <option value="nebius">Nebius</option>
              </select>
            </header>
            <div className="field">
              <label htmlFor="model-a">Model ID</label>
              <input
                id="model-a"
                className="input-base font-mono"
                value={modelA}
                onChange={(event) => setModelA(event.target.value)}
              />
            </div>
          </div>

          <div className="model-panel">
            <header>
              <strong>Model B</strong>
              <select value={providerB} onChange={(event) => setProviderB(event.target.value)}>
                <option value="nebius">Nebius</option>
                <option value="groq">Groq</option>
              </select>
            </header>
            <div className="field">
              <label htmlFor="model-b">Model ID</label>
              <input
                id="model-b"
                className="input-base font-mono"
                value={modelB}
                onChange={(event) => setModelB(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ab-query">Question</label>
          <input
            id="ab-query"
            className="input-base"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading || !query.trim()} className="btn-primary">
          <Play size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Running comparison' : 'Run comparison'}
        </button>
      </form>

      {error && (
        <div className="status-box error fade-up">
          <AlertCircle size={18} />
          <div>
            <strong>Comparison failed</strong>
            <p className="help-text">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="fade-up">
          <div className="judge-box">
            <header className="model-panel-header">
              <strong>
                Judge verdict:{' '}
                {winner === 'tie' ? 'Tie' : `Model ${winner} wins`}
              </strong>
              <span className="chip">
                <GitCompare size={12} />
                {result.judge_evaluation.judge_model}
              </span>
            </header>
            <p>{result.judge_evaluation.critique}</p>
          </div>

          <div className="results-grid">
            <ResultPanel
              label="Model A"
              result={result.model_a_result}
              score={result.judge_evaluation.model_a_score}
              winner={winner === 'A'}
            />
            <ResultPanel
              label="Model B"
              result={result.model_b_result}
              score={result.judge_evaluation.model_b_score}
              winner={winner === 'B'}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ResultPanel({ label, result, score, winner }) {
  return (
    <article className={`result-panel ${winner ? 'winner' : ''}`}>
      <header>
        <div>
          <strong>{label}</strong>
          <p className="help-text font-mono">{result.provider} / {result.model}</p>
        </div>
        <span className="chip">
          {winner && <Check size={12} />}
          {(score * 100).toFixed(1)}%
        </span>
      </header>
      <p className="font-mono" style={{ whiteSpace: 'pre-wrap' }}>{result.answer}</p>
    </article>
  );
}
