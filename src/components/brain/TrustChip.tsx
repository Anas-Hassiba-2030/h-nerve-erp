// components/brain/TrustChip.tsx
//
// Lightweight "trust at a glance" chip — the lighter sibling of VerifiedBadge.
// Use it on list rows + summary surfaces where only a numeric score is
// available (e.g. CouncilSession.confidence), not the full verifier breakdown.
// Thresholds + bilingual labels are imported from lib/brain/trustChip.ts so
// the contract is pure + unit-tested and never drifts from confidence.ts.
//
//   <TrustChip score={s.confidence} locale={locale} />
//
// score must be in [0, 1]. null / undefined / NaN → renders nothing.

import type { CSSProperties } from "react";
import { trustBucket, trustLabel, trustPct, type TrustBucket } from "@/lib/brain/trustChip";

const TONE: Record<TrustBucket, { glyph: string; bg: string; fg: string; border: string }> = {
  high: { glyph: "✓", bg: "rgba(35, 99, 67, 0.08)", fg: "#236343", border: "rgba(35, 99, 67, 0.32)" },
  medium: { glyph: "△", bg: "rgba(194, 163, 90, 0.10)", fg: "#7a6112", border: "rgba(194, 163, 90, 0.40)" },
  low: { glyph: "⚠", bg: "rgba(172, 73, 49, 0.10)", fg: "#9b3826", border: "rgba(172, 73, 49, 0.40)" },
};

const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "1px 6px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.2,
  fontVariantNumeric: "tabular-nums",
  verticalAlign: "middle",
};

export function TrustChip({
  score,
  locale = "ar",
  showLabel = false,
}: {
  score: number | null | undefined;
  locale?: "ar" | "en";
  /** Show the long-form label ("Verified") next to the glyph + percentage. */
  showLabel?: boolean;
}) {
  if (score == null || !Number.isFinite(score)) return null;
  const b = trustBucket(score);
  const t = TONE[b];
  const pct = trustPct(score);
  const label = trustLabel(b, locale);
  return (
    <span
      role="status"
      aria-label={`${label} ${pct}%`}
      title={`${label} ${pct}%`}
      style={{ ...BASE, background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
    >
      <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>{t.glyph}</span>
      {showLabel ? <span>{label}</span> : null}
      <span style={{ opacity: 0.75 }}>{pct}%</span>
    </span>
  );
}
