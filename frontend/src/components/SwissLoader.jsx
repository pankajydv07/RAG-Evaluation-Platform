/**
 * Swiss loading primitives — used across all pages.
 * Design: Geometric, mechanical, minimal. Matches Swiss grid aesthetics.
 */

import React from 'react';

/** ── Top-of-page indeterminate red progress bar ─────────────────────────── */
export function SwissProgressBar() {
  return <div className="swiss-progress-bar" aria-label="Loading" />;
}

/** ── Inline circle spinner ──────────────────────────────────────────────── */
export function SwissSpinner({ size = 'md' }) {
  return (
    <span
      className={`swiss-spinner ${size === 'sm' ? 'swiss-spinner-sm' : ''}`}
      aria-label="Loading"
    />
  );
}

/** ── Rotating red square — used for dense inline states ─────────────────── */
export function SwissSquareSpinner() {
  return <span className="swiss-spinner-square" aria-label="Loading" />;
}

/** ── Vertical bar pulse — used during streaming synthesis ───────────────── */
export function SwissPulseDots() {
  return (
    <span className="swiss-pulse-dots" aria-label="Synthesizing">
      <span /><span /><span />
    </span>
  );
}

/** ── Skeleton block — for loading states on cards/tables ────────────────── */
export function SwissSkeleton({ lines = 3 }) {
  const widths = ['wide', 'mid', 'short', 'wide', 'mid'];
  return (
    <div aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`swiss-skeleton swiss-skeleton-line ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

/** ── Full-section loader with label ─────────────────────────────────────── */
export function SwissLoadingSection({ label = 'Loading...' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 64,
      }}
    >
      <SwissSpinner />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--ink-tertiary)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}
