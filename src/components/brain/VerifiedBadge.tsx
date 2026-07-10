// components/brain/VerifiedBadge.tsx
//
// The trust badge that sits next to every Narrator/Council/Planner output.
//
// ✓ HIGH    — coverage ≥ 80%, fresh data, multiple supporting points.
// △ MEDIUM  — partial coverage or aging data.
// ⚠ LOW     — unverified claims, the operator should drill into evidence.
//
// Aesthetic: Heritage Modern. Hairline border, ochre accent on HIGH,
// terracotta accent on LOW. Tooltip on hover shows the score breakdown.
// See docs/governance/PHASES-INTELLIGENCE.md § Phase 22.

"use client";

import { useState } from "react";
import type { ConfidenceScore } from "@/lib/brain/confidence";
import type { VerificationReport } from "@/lib/brain/verifier";

type Props = {
  confidence: ConfidenceScore;
  verification?: VerificationReport;
  locale?: "ar" | "en";
  // When true, render the long-form label ("HIGH TRUST"); else the icon only.
  showLabel?: boolean;
};

const TONE: Record<ConfidenceScore["label"], { glyph: string; bg: string; fg: string; border: string }> = {
  high: {
    glyph: "✓",
    bg: "rgba(35, 99, 67, 0.08)",
    fg: "#236343",
    border: "rgba(35, 99, 67, 0.32)",
  },
  medium: {
    glyph: "△",
    bg: "rgba(194, 163, 90, 0.10)",
    fg: "#7a6112",
    border: "rgba(194, 163, 90, 0.40)",
  },
  low: {
    glyph: "⚠",
    bg: "rgba(172, 73, 49, 0.10)",
    fg: "#9b3826",
    border: "rgba(172, 73, 49, 0.40)",
  },
};

const LABELS = {
  high: { ar: "موثوق", en: "Verified" },
  medium: { ar: "جزئي", en: "Partial" },
  low: { ar: "غير مؤكد", en: "Unverified" },
} as const;

export function VerifiedBadge({
  confidence,
  verification,
  locale = "ar",
  showLabel = false,
}: Props) {
  const [hover, setHover] = useState(false);
  const ar = locale === "ar";
  const tone = TONE[confidence.label];
  const label = LABELS[confidence.label][locale];

  const pct = Math.round(confidence.score * 100);
  const cov = verification
    ? `${verification.verified}/${verification.total}`
    : null;

  return (
    <span
      className="hn-verified-badge"
      role="status"
      aria-label={`${label} ${pct}%`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: showLabel ? "2px 8px" : "2px 6px",
        borderRadius: "999px",
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
        fontSize: "10.5px",
        fontWeight: 700,
        lineHeight: 1.2,
        fontVariantNumeric: "tabular-nums",
        cursor: "default",
        position: "relative",
        verticalAlign: "middle",
      }}
    >
      <span aria-hidden style={{ fontSize: "11px", lineHeight: 1 }}>
        {tone.glyph}
      </span>
      {showLabel ? <span>{label}</span> : null}
      <span style={{ opacity: 0.75 }}>{pct}%</span>

      {hover ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            insetInlineStart: 0,
            zIndex: 50,
            minWidth: "180px",
            padding: "8px 10px",
            background: "var(--surface-elevated, #fff)",
            color: "var(--text, #1f1c18)",
            border: "1px solid var(--border, rgba(0,0,0,0.12))",
            borderRadius: "6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            fontSize: "10.5px",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>
            {ar ? "تفاصيل الثقة" : "Trust breakdown"}
          </div>
          <Row label={ar ? "التحقق" : "Verification"} value={confidence.factors.verification} />
          <Row label={ar ? "حداثة البيانات" : "Freshness"} value={confidence.factors.freshness} />
          <Row label={ar ? "كثافة الدعم" : "Density"} value={confidence.factors.density} />
          <Row label={ar ? "دعم الرسم البياني" : "Graph"} value={confidence.factors.graph} />
          {cov ? (
            <div style={{ marginTop: "4px", opacity: 0.7 }}>
              {ar ? `الأرقام: ${cov} مطابقة` : `${cov} claims matched`}
            </div>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(value * 100)}%</span>
    </div>
  );
}
