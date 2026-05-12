// BrutalistHero — executive dashboard headline panel done in the
// "Brutalist Confidence" register: heavy ink-black plinth, gigantic mono
// numerals, sharp 90° corners on data grid, single hairline gold accent,
// ALL CAPS eyebrows with thin underline, tabular nums everywhere.
//
// No gradients in the data area. The only hue lives in the accent rail
// + an ember dot for the live indicator. The whole thing reads like a
// trading-floor blotter or a Swiss editorial spread, not a SaaS dashboard.

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight, ArrowDownRight, Minus, Activity, Download, Sparkles,
} from "lucide-react";

export type BrutalistKpi = {
  label: string;
  value: string;
  deltaPct?: number;
  higherIsBetter?: boolean;
  hint?: string;
};

export function BrutalistHero({
  eyebrow,
  greeting,
  subtitle,
  kpis,
  primaryCta,
  primaryCtaHref,
  secondaryCta,
  secondaryCtaHref,
  liveLabel,
  dateLabel,
  reportLabel,
  reportHref,
  ar,
}: {
  eyebrow: string;
  greeting: string;
  subtitle: string;
  kpis: BrutalistKpi[];
  primaryCta?: string;
  primaryCtaHref?: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
  liveLabel: string;
  dateLabel: string;
  reportLabel?: string;
  reportHref?: string;
  ar: boolean;
}) {
  return (
    <section
      className="brut-hero relative overflow-hidden hn-anim-blur"
      style={{
        background: "#0b0d0e",
        color: "#f5f1e8",
        // A single hairline accent rail along the top — the only ornament
        boxShadow: "inset 0 3px 0 0 #c69345",
      }}
    >
      {/* Subtle scanline texture for "ink on paper" feel */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px)",
        }}
        aria-hidden
      />

      {/* TOP RAIL — meta line */}
      <div
        className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 md:px-10"
        style={{
          borderColor: "rgba(245, 241, 232, 0.14)",
          fontFamily: "'Inter', ui-monospace, monospace",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span className="inline-flex items-center gap-1.5">
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "#c69345" }}
            >
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ background: "#c69345" }}
              />
            </span>
            <span
              className="font-mono text-[10px] font-extrabold uppercase tracking-[0.3em]"
              style={{ color: "#c69345" }}
            >
              {liveLabel}
            </span>
          </span>
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "rgba(245,241,232,0.55)" }}
          >
            {eyebrow}
          </span>
        </div>
        <span
          className="exec-num font-mono text-[10.5px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "rgba(245,241,232,0.55)" }}
        >
          {dateLabel}
        </span>
      </div>

      {/* HEADLINE BLOCK */}
      <div className="relative z-10 px-6 py-7 md:px-10 md:py-9">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0">
            <h1
              className="hn-anim-rise text-[36px] font-black leading-[0.98] tracking-[-0.025em] md:text-[58px]"
              style={{
                fontFamily: "'Cairo', 'Inter', sans-serif",
                color: "#f5f1e8",
              }}
            >
              {greeting}
            </h1>
            <p
              className="hn-anim-rise mt-3 max-w-xl text-[12.5px] font-bold leading-relaxed md:text-[13.5px]"
              style={{
                color: "rgba(245,241,232,0.7)",
                animationDelay: "0.08s",
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* CTAs */}
          {(primaryCta || secondaryCta) ? (
            <div
              className="hn-anim-fall flex flex-wrap items-center gap-2"
              style={{ animationDelay: "0.16s" }}
            >
              {secondaryCta && secondaryCtaHref ? (
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] transition hover:bg-white/[0.06]"
                  style={{
                    border: "1px solid rgba(245,241,232,0.28)",
                    color: "#f5f1e8",
                    borderRadius: 0,
                  }}
                >
                  {reportLabel ? <Download className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                  {secondaryCta}
                </Link>
              ) : null}
              {primaryCta && primaryCtaHref ? (
                <Link
                  href={primaryCtaHref}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] transition"
                  style={{
                    background: "#c69345",
                    color: "#0b0d0e",
                    borderRadius: 0,
                    boxShadow: "0 0 0 1px #c69345",
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  {primaryCta}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* DATA GRID — sharp corners, hairline dividers, gigantic mono nums */}
      <div
        className="relative z-10 grid grid-cols-2 border-t md:grid-cols-4"
        style={{ borderColor: "rgba(245,241,232,0.18)" }}
      >
        {kpis.map((k, i) => (
          <div
            key={i}
            className="hn-anim-rise relative px-5 py-5 md:px-8 md:py-6"
            style={{
              borderInlineStart:
                i > 0 ? "1px solid rgba(245,241,232,0.14)" : undefined,
              borderTop:
                i >= 2 ? "1px solid rgba(245,241,232,0.14)" : undefined,
              animationDelay: `${0.08 + i * 0.04}s`,
            }}
          >
            <div
              className="font-mono text-[9px] font-extrabold uppercase tracking-[0.28em]"
              style={{ color: "rgba(245,241,232,0.5)" }}
            >
              {k.label}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="exec-num font-black leading-none tracking-[-0.02em]"
                style={{
                  color: "#f5f1e8",
                  fontFamily: "'Inter', ui-monospace, monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: "clamp(22px, 2.4vw, 30px)",
                }}
              >
                {k.value}
              </span>
              {typeof k.deltaPct === "number" &&
              Math.abs(k.deltaPct) >= 0.001 ? (
                <DeltaTag
                  pct={k.deltaPct}
                  positive={
                    (k.higherIsBetter ?? true)
                      ? k.deltaPct >= 0
                      : k.deltaPct < 0
                  }
                />
              ) : null}
            </div>
            {k.hint ? (
              <div
                className="mt-1 font-mono text-[10px] font-bold"
                style={{ color: "rgba(245,241,232,0.45)" }}
              >
                {k.hint}
              </div>
            ) : null}
            {/* Bottom hairline — only on last row to close the grid */}
          </div>
        ))}
      </div>
    </section>
  );
}

function DeltaTag({ pct, positive }: { pct: number; positive: boolean }) {
  const Icon = pct >= 0 ? ArrowUpRight : pct <= -0.001 ? ArrowDownRight : Minus;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 font-mono text-[10px] font-extrabold tabular-nums"
      style={{
        background: positive
          ? "rgba(16,185,129,0.18)"
          : "rgba(244,63,94,0.18)",
        color: positive ? "#6ee7b7" : "#fda4af",
        border: positive
          ? "1px solid rgba(16,185,129,0.4)"
          : "1px solid rgba(244,63,94,0.4)",
        borderRadius: 0,
      }}
    >
      <Icon className="h-2.5 w-2.5" />
      {(pct >= 0 ? "+" : "") + (pct * 100).toFixed(1)}%
    </span>
  );
}
