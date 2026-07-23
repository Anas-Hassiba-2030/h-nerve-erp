// HeritageHero — executive headline panel in the "Heritage Modern" register.
//
// One vocabulary, executed with precision (see docs/DESIGN-SKILL.md §1.D).
//
// Surface: cream plinth (#f5efe6) — never pure white.
// Accent: a single gradient hairline rail across the top
//         (terracotta → ochre → teal) — the only chromatic element.
// Type: Reem Kufi / Aref Ruqaa display for Arabic, Fraunces transitional
//       serif for Latin. Body in IBM Plex Sans Arabic / Inter Tight.
//       Numerals are display-serif Fraunces with tabular figures — that's
//       the signature Heritage Modern move.
// Detail: hairline rules at 1px (#d8cdb9), 0px corners on data tiles,
//         eyebrow in mono uppercase with 0.18em tracking.

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles, Download } from "lucide-react";
import { Narrate } from "@/components/brain/Narrate";
import { CountUpValue } from "@/components/ui/CountUpValue";

export type HeritageKpi = {
  label: string;
  value: string;
  /** Optional raw number — when present the tile counts up to it on load,
   *  formatted via the matching `valueKind`. `value` is the SSR fallback. */
  valueRaw?: number;
  valueKind?: "money" | "percent" | "number";
  valueDecimals?: number;
  deltaPct?: number;
  higherIsBetter?: boolean;
  hint?: string;
  /** Optional brain context — when provided, the tile becomes hover-narratable. */
  narrate?: {
    topic: string;
    summary: string;
    facts: Record<string, any>;
  };
};

export function HeritageHero({
  eyebrow,
  greeting,
  personalLine,
  subtitle,
  kpis,
  primaryCta,
  primaryCtaHref,
  secondaryCta,
  secondaryCtaHref,
  liveLabel,
  dateLabel,
  reportLabel,
  ar,
}: {
  eyebrow: string;
  greeting: string;
  personalLine?: string; // optional addressee line — kept SCRIPT-MATCHED to locale
  subtitle: string;
  kpis: HeritageKpi[];
  primaryCta?: string;
  primaryCtaHref?: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
  liveLabel: string;
  dateLabel: string;
  reportLabel?: string;
  ar: boolean;
}) {
  return (
    <section className="heri-hero" aria-label="executive overview">
      {/* TOP META RAIL — eyebrow · live · date */}
      <div
        className="relative flex flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-9"
        style={{ boxShadow: "inset 0 -1px 0 var(--heri-rule)" }}
      >
        <div className="flex items-center gap-3">
          {/* Live status — current-color dot pattern */}
          <span className="inline-flex items-center gap-1.5">
            <span
              className="relative inline-flex h-2 w-2 items-center justify-center rounded-full"
              style={{
                background: "var(--heri-terracotta)",
                boxShadow: "0 0 0 2px color-mix(in srgb, var(--heri-terracotta) 22%, transparent)",
              }}
            >
              {/* Expanding ring — slower, eased fade reads as a heartbeat
                  rather than a strobe. Honors reduced-motion via globals. */}
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{
                  background: "var(--heri-terracotta)",
                  animationDuration: "2.8s",
                  animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
              {/* Solid core sits above the ring so the centre never fades. */}
              <span
                className="relative inline-flex h-1 w-1 rounded-full"
                style={{ background: "var(--heri-terracotta)" }}
              />
            </span>
            <span
              className="heri-eyebrow"
              style={{ color: "var(--heri-terracotta)" }}
            >
              {liveLabel}
            </span>
          </span>
          <span className="heri-eyebrow heri-eyebrow-ink">{eyebrow}</span>
        </div>
        <span
          className="heri-eyebrow heri-eyebrow-ink"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {dateLabel}
        </span>
      </div>

      {/* HEADLINE BLOCK — display type, generous breathing room */}
      <div className="px-6 py-8 md:px-9 md:py-10">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0">
            <h1
              className={ar ? "font-display-arabic" : "font-display-latin"}
              style={{
                fontSize: "clamp(34px, 4.6vw, 60px)",
                lineHeight: 1.02,
                letterSpacing: ar ? "-0.005em" : "-0.025em",
                textWrap: "balance" as any,
                color: "var(--heri-ink)",
                fontWeight: ar ? 600 : 500,
                animation: "heri-rise 600ms var(--ease-out-quart) both",
              }}
            >
              {greeting}
            </h1>
            {personalLine ? (
              <div
                className={ar ? "font-display-arabic" : "font-display-latin"}
                style={{
                  fontSize: "clamp(15px, 1.35vw, 19px)",
                  lineHeight: 1.3,
                  letterSpacing: ar ? "0" : "-0.005em",
                  color: "var(--heri-ink-3)",
                  marginTop: 6,
                  fontWeight: 400,
                  fontStyle: ar ? "normal" : "italic",
                  animation: "heri-rise 600ms var(--ease-out-quart) both",
                  animationDelay: "80ms",
                }}
              >
                {personalLine}
              </div>
            ) : null}
            <p
              className="measure mt-4"
              style={{
                fontSize: "clamp(12.5px, 0.95vw, 14.5px)",
                lineHeight: 1.55,
                color: "var(--heri-ink-2)",
                animation: "heri-rise 600ms var(--ease-out-quart) both",
                animationDelay: "120ms",
              }}
            >
              {subtitle}
            </p>
          </div>

          {(primaryCta || secondaryCta) ? (
            <div
              className="flex flex-wrap items-center gap-3"
              style={{ animation: "heri-rise 600ms var(--ease-out-quart) both", animationDelay: "200ms" }}
            >
              {secondaryCta && secondaryCtaHref ? (
                <Link href={secondaryCtaHref} className="heri-btn heri-btn-secondary">
                  {reportLabel ? <Download className="h-3.5 w-3.5" /> : null}
                  {secondaryCta}
                </Link>
              ) : null}
              {primaryCta && primaryCtaHref ? (
                <Link href={primaryCtaHref} className="heri-btn heri-btn-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {primaryCta}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* DATA GRID — display-serif numerals, hairline dividers, no rounding */}
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ borderTop: "1px solid var(--heri-rule-strong)" }}
      >
        {kpis.map((k, i) => {
          // Count-up begins just after this tile's heri-rise entrance
          // (delay 260 + i*70ms) so the slide-in and the number tick read as
          // two sequential beats, not one busy blur.
          const valueNode =
            k.valueRaw != null && k.valueKind ? (
              <CountUpValue
                raw={k.valueRaw}
                kind={k.valueKind}
                decimals={k.valueDecimals ?? 0}
                startDelayMs={260 + i * 70 + 120}
              />
            ) : (
              k.value
            );
          return (
          <div
            key={i}
            className="relative px-6 py-7 md:px-8 md:py-8"
            style={{
              borderInlineStart:
                i > 0 && i % 4 !== 0 ? "1px solid var(--heri-rule)" : undefined,
              borderTop:
                i >= 2 ? "1px solid var(--heri-rule)" : undefined,
              animation: "heri-rise 540ms var(--ease-out-quart) both",
              animationDelay: `${260 + i * 70}ms`,
              background: "var(--heri-cream)",
            }}
          >
            <div className="heri-eyebrow">{k.label}</div>
            <div className="mt-3 flex items-baseline">
              {k.narrate ? (
                <Narrate
                  topic={k.narrate.topic}
                  summary={k.narrate.summary}
                  facts={k.narrate.facts}
                  locale={ar ? "ar" : "en"}
                  placement="bottom"
                >
                  <span
                    className="heri-number"
                    style={{
                      fontSize: "clamp(26px, 2.9vw, 38px)",
                      fontWeight: 500,
                      color: "var(--heri-ink)",
                      cursor: "help",
                      borderBottom: "1px dotted var(--heri-rule-strong)",
                      paddingBottom: 1,
                    }}
                  >
                    {valueNode}
                  </span>
                </Narrate>
              ) : (
                <span
                  className="heri-number"
                  style={{
                    fontSize: "clamp(26px, 2.9vw, 38px)",
                    fontWeight: 500,
                    color: "var(--heri-ink)",
                  }}
                >
                  {valueNode}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              {k.hint ? (
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: "var(--heri-ink-3)",
                  }}
                >
                  {k.hint}
                </div>
              ) : <span />}
              {typeof k.deltaPct === "number" && Math.abs(k.deltaPct) >= 0.001 ? (
                <DeltaTag
                  pct={k.deltaPct}
                  positive={
                    (k.higherIsBetter ?? true) ? k.deltaPct >= 0 : k.deltaPct < 0
                  }
                />
              ) : null}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function DeltaTag({ pct, positive }: { pct: number; positive: boolean }) {
  const Icon = pct >= 0 ? ArrowUpRight : pct <= -0.001 ? ArrowDownRight : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 heri-number-mono"
      style={{
        fontSize: "10px",
        fontWeight: 600,
        background: positive
          ? "color-mix(in srgb, var(--heri-teal) 10%, transparent)"
          : "color-mix(in srgb, var(--heri-terracotta) 10%, transparent)",
        color: positive ? "var(--heri-teal)" : "var(--heri-terracotta)",
        border: `1px solid ${positive ? "var(--heri-teal)" : "var(--heri-terracotta)"}`,
        borderRadius: 0,
      }}
    >
      <Icon className="h-2.5 w-2.5" />
      {(pct >= 0 ? "+" : "") + (pct * 100).toFixed(1)}%
    </span>
  );
}
