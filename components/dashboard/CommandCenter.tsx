// CommandCenter — the new dashboard hero. Replaces the small PageHeader
// at the top of the executive view with a full-width gradient panel that
// surfaces:
//   • greeting + user identity
//   • 4 huge breathing KPIs with delta arrows
//   • live-pulse indicator in the corner
//   • period selector + primary actions
//   • animated nerve-graph background

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Sparkles, Activity } from "lucide-react";
import { HeroPanel } from "@/components/exec/HeroPanel";

export type CommandCenterKpi = {
  label: string;
  value: string;
  deltaPct?: number;
  higherIsBetter?: boolean;
  hint?: string;
};

export function CommandCenter({
  eyebrow,
  greeting,
  subtitle,
  kpis,
  actions,
  gradient,
  accent,
  liveLabel,
}: {
  eyebrow: string;
  greeting: string;
  subtitle: string;
  kpis: CommandCenterKpi[];
  actions?: React.ReactNode;
  gradient: string;
  accent: string;
  liveLabel: string;
}) {
  return (
    <HeroPanel gradient={gradient} accent={accent} height={260}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 hn-anim-rise">
          <div
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.28)",
              backdropFilter: "blur(6px)",
              color: "white",
            }}
          >
            <span
              className="relative inline-flex h-2 w-2"
              aria-hidden
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {eyebrow}
          </div>
          <h1
            className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
            style={{ animationDelay: "0.06s" }}
          >
            {greeting}
          </h1>
          <p
            className="mt-1 max-w-2xl text-[12.5px] font-bold opacity-85 hn-anim-rise"
            style={{ animationDelay: "0.12s" }}
          >
            {subtitle}
          </p>
        </div>

        {/* Live signal indicator */}
        <div
          className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 hn-anim-fall"
          style={{
            background: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.28)",
            backdropFilter: "blur(6px)",
            animationDelay: "0.18s",
          }}
        >
          <Activity className="h-3.5 w-3.5 hn-anim-pulse-soft" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">
            {liveLabel}
          </span>
        </div>
      </div>

      {/* Big KPI strip */}
      <div className="mt-6 grid gap-3 hn-stagger md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={i}
            className="hn-anim-rise rounded-2xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-85">
              {k.label}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span
                className="exec-num text-[24px] font-black leading-none tracking-[-0.015em] md:text-[26px]"
                style={{ letterSpacing: "-0.012em" }}
              >
                {k.value}
              </span>
              {typeof k.deltaPct === "number" && Math.abs(k.deltaPct) >= 0.001 ? (
                <DeltaPill
                  pct={k.deltaPct}
                  positive={(k.higherIsBetter ?? true) ? k.deltaPct >= 0 : k.deltaPct < 0}
                />
              ) : null}
            </div>
            {k.hint ? (
              <div
                className="mt-0.5 text-[10px] font-bold opacity-70"
              >
                {k.hint}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Actions row */}
      {actions ? (
        <div
          className="mt-5 flex flex-wrap items-center gap-2 hn-anim-fall"
          style={{ animationDelay: "0.32s" }}
        >
          {actions}
        </div>
      ) : null}
    </HeroPanel>
  );
}

function DeltaPill({ pct, positive }: { pct: number; positive: boolean }) {
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-extrabold tabular-nums"
      style={{
        background: positive
          ? "rgba(16,185,129,0.28)"
          : "rgba(244,63,94,0.28)",
        color: "white",
        border: positive
          ? "1px solid rgba(16,185,129,0.55)"
          : "1px solid rgba(244,63,94,0.55)",
      }}
    >
      <Icon className="h-3 w-3" />
      {(pct >= 0 ? "+" : "") + (pct * 100).toFixed(1)}%
    </span>
  );
}
