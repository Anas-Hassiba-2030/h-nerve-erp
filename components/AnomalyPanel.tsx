// Renders detected anomalies as a clean stack of cards.
// Severity-coded with icon + headline + explanation + drill-down link.

import Link from "next/link";
import {
  AlertTriangle, TrendingUp, TrendingDown, ArrowLeftRight, ChevronLeft,
} from "lucide-react";
import type { Anomaly } from "@/lib/ai/anomaly";
import { ShareToCouncilButton } from "./ShareToCouncilButton";

const KIND_ICON = {
  SPIKE: TrendingUp,
  DIP: TrendingDown,
  TREND_REVERSAL: ArrowLeftRight,
  OUTLIER: AlertTriangle,
};

const SEVERITY_COLOR: Record<string, string> = {
  INFO: "#3b82f6",
  WARN: "#f59e0b",
  CRITICAL: "#ef4444",
};

export function AnomalyPanel({
  anomalies,
  locale = "en",
  emptyMessage,
}: {
  anomalies: Anomaly[];
  locale?: "ar" | "en";
  emptyMessage?: { ar: string; en: string };
}) {
  const ar = locale === "ar";

  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, #10b981 14%, transparent)",
            color: "#0a8e54",
          }}
        >
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="text-[12px] font-extrabold" style={{ color: "var(--text)" }}>
          {ar ? "كل المؤشرات طبيعية" : "All metrics normal"}
        </div>
        <div className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>
          {emptyMessage ? (ar ? emptyMessage.ar : emptyMessage.en) : (ar ? "لا شذوذات تستحق الذكر" : "No anomalies detected")}
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {anomalies.map((a) => {
        const Icon = KIND_ICON[a.kind];
        const color = SEVERITY_COLOR[a.severity];
        const t = ar ? a.ar : a.en;
        const Wrap: any = a.href ? Link : "div";
        const wrapProps = a.href ? { href: a.href } : {};
        return (
          <li key={a.id}>
            <Wrap
              {...wrapProps}
              className={`flex items-start gap-3 rounded-xl p-3 transition ${a.href ? "hover:bg-[var(--brand-soft)]" : ""}`}
              style={{
                background: `color-mix(in srgb, ${color} 4%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 22%, var(--border))`,
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${color} 14%, transparent)`,
                  color: color,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-extrabold" style={{ color: "var(--text)" }}>
                    {t.headline}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                    style={{
                      background: `color-mix(in srgb, ${color} 14%, transparent)`,
                      color: color,
                    }}
                  >
                    {a.severity}
                  </span>
                  {a.deviationPct !== 0 ? (
                    <span
                      className="font-mono text-[10.5px] font-bold"
                      style={{ color: a.deviationPct > 0 ? "#0a8e54" : "#dc2626" }}
                    >
                      {a.deviationPct > 0 ? "+" : ""}{a.deviationPct.toFixed(0)}%
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {t.explanation}
                </p>
              </div>
              {a.href ? (
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" style={{ color }} />
              ) : null}
            </Wrap>
            {/* Phase V3-P5 — Share to Council sits outside the Wrap so a
                <form> isn't nested inside <a> (invalid HTML). */}
            <div className="mt-1 ms-12 flex">
              <ShareToCouncilButton
                title={t.headline}
                body={t.explanation}
                ar={ar}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
