import { CountUpValue } from "@/components/CountUpValue";

// Heritage Modern KPI tile — the same treatment the dashboard hero uses
// (display-serif numeral that counts up, hairline card, mono hint), packaged
// as a reusable tile so every operator page reads in one design language.
//
// Drop several into a `.heri-stagger` grid for the staggered entrance.
export function HeriKpi({
  label,
  raw,
  kind,
  decimals = 0,
  hint,
  accent,
}: {
  label: string;
  raw: number;
  kind: "money" | "percent" | "number";
  decimals?: number;
  hint?: string;
  /** Optional ink override for the numeral (e.g. terracotta for a loss). */
  accent?: string;
}) {
  return (
    <div className="heri-card" style={{ padding: "18px 20px" }}>
      <div className="heri-eyebrow heri-eyebrow-ink">{label}</div>
      <div className="mt-3 flex items-baseline">
        <span
          className="heri-number"
          style={{
            fontSize: "clamp(24px, 2.4vw, 32px)",
            fontWeight: 500,
            color: accent ?? "var(--heri-ink)",
            lineHeight: 1,
          }}
        >
          <CountUpValue raw={raw} kind={kind} decimals={decimals} startDelayMs={300} />
        </span>
      </div>
      {hint ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontVariantNumeric: "tabular-nums",
            fontSize: 11,
            letterSpacing: "0.04em",
            color: "var(--heri-ink-3)",
            marginTop: 8,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}
