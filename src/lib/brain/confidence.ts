// confidence.ts — Brain confidence scorer (Phase 22).
//
// Confidence is a single 0..1 number that summarizes how much an operator
// should trust a brain output. It combines four axes:
//
//   1. Verification coverage — what fraction of claims matched the facts.
//   2. Data freshness        — how recent the supporting data is.
//   3. Data density          — how many supporting data points exist.
//   4. Graph support         — does the causal graph contain a path that
//                              backs the direction of the claim?
//
// The output is BOTH a numeric score and a discrete label
// ("high" / "medium" / "low") suitable for badge UI.
//
// Pure function — deterministic, no I/O, fully unit-testable.
// See docs/governance/PHASES-INTELLIGENCE.md § Phase 22.

import type { VerificationReport } from "./verifier";

export type ConfidenceInput = {
  // From the verifier — what fraction of claims grounded.
  verification?: VerificationReport;
  // ISO timestamp of the freshest supporting data point.
  // Older data → lower confidence.
  dataAsOf?: Date | string | number;
  // How many independent data points support the claim.
  // 1 reading is suspect, 30 is robust.
  supportingPoints?: number;
  // Does the causal graph contain at least one edge that supports the
  // direction of the claim? (Phase 1 graph.ts hook.)
  graphSupports?: boolean | null;
  // The clock reference. Defaults to Date.now() — exposed for tests.
  now?: Date | number;
};

export type ConfidenceScore = {
  score: number; // 0..1
  label: "high" | "medium" | "low";
  factors: {
    verification: number;
    freshness: number;
    density: number;
    graph: number;
  };
};

// Weights — verification is the strongest signal, freshness second.
const W = {
  verification: 0.45,
  freshness: 0.25,
  density: 0.2,
  graph: 0.1,
} as const;

// Data freshness curve — full credit at 0 days, half at 14 days, zero at 90+.
const FRESH_HALF_LIFE_DAYS = 14;
const FRESH_ZERO_DAYS = 90;

export function score(input: ConfidenceInput): ConfidenceScore {
  const verification = verificationFactor(input.verification);
  const freshness = freshnessFactor(input.dataAsOf, input.now);
  const density = densityFactor(input.supportingPoints);
  const graph = graphFactor(input.graphSupports);

  const raw =
    verification * W.verification +
    freshness * W.freshness +
    density * W.density +
    graph * W.graph;

  // Clamp to [0, 1] just in case of numerical drift.
  const s = Math.max(0, Math.min(1, raw));

  // Verification veto: when most claims can't be traced to the facts,
  // the whole output must be flagged LOW regardless of how fresh or
  // dense the supporting data is. Trustworthiness is the prime directive.
  const vetoLow = input.verification !== undefined && input.verification.coverage < 0.2;

  const label: ConfidenceScore["label"] = vetoLow
    ? "low"
    : s >= 0.75
    ? "high"
    : s >= 0.45
    ? "medium"
    : "low";

  return {
    score: Math.round(s * 100) / 100,
    label,
    factors: {
      verification: Math.round(verification * 100) / 100,
      freshness: Math.round(freshness * 100) / 100,
      density: Math.round(density * 100) / 100,
      graph: Math.round(graph * 100) / 100,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Factor functions — each maps an input to a 0..1 score.
// ─────────────────────────────────────────────────────────────────────

function verificationFactor(report?: VerificationReport): number {
  if (!report) return 0.5; // unknown → neutral
  return report.coverage;
}

function freshnessFactor(
  dataAsOf?: Date | string | number,
  now?: Date | number,
): number {
  if (dataAsOf === undefined) return 0.5;
  const t = toMs(dataAsOf);
  if (t === null) return 0.5;
  const nowMs = toMs(now ?? Date.now()) ?? Date.now();
  const ageDays = Math.max(0, (nowMs - t) / (1000 * 60 * 60 * 24));

  if (ageDays <= 0) return 1;
  if (ageDays >= FRESH_ZERO_DAYS) return 0;

  // Smooth exponential decay with the half-life calibrated.
  return Math.pow(0.5, ageDays / FRESH_HALF_LIFE_DAYS);
}

function densityFactor(n?: number): number {
  if (n === undefined || n === null) return 0.5;
  if (n <= 0) return 0;
  // Logarithmic curve: 1 point → 0.15, 5 → 0.55, 30 → 1.0, 100+ → 1.0
  const v = Math.log10(n + 1) / Math.log10(31);
  return Math.max(0, Math.min(1, v));
}

function graphFactor(supports?: boolean | null): number {
  if (supports === undefined || supports === null) return 0.5;
  return supports ? 1 : 0;
}

function toMs(d: Date | string | number): number | null {
  if (d instanceof Date) return d.getTime();
  if (typeof d === "number") return d;
  if (typeof d === "string") {
    const t = new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}
