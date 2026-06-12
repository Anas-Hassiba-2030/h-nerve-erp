// lib/brain/trustChip.ts — pure trust-bucket math + locale labels.
//
// The TrustChip component (components/brain/TrustChip.tsx) is presentational;
// the SCORE→BUCKET thresholds and bilingual labels live here so a pure unit
// test can pin the contract without pulling React/DOM into the test suite.
// Thresholds match lib/brain/confidence.ts — DO NOT drift independently.

export type TrustBucket = "high" | "medium" | "low";

export function trustBucket(score: number): TrustBucket {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export const TRUST_LABELS = {
  high: { ar: "موثوق", en: "Verified" },
  medium: { ar: "جزئي", en: "Partial" },
  low: { ar: "غير مؤكد", en: "Unverified" },
} as const;

export function trustLabel(bucket: TrustBucket, locale: "ar" | "en"): string {
  return TRUST_LABELS[bucket][locale];
}

/** Clamp a raw 0..1 score and round to a whole-percent for display. */
export function trustPct(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}
