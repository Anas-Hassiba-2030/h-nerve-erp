"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft } from "lucide-react";
import Link from "next/link";

export type DrillRow = {
  date: string;
  label: string;
  value: number;
  delta?: number; // % vs previous
  meta?: string;
};

// Modal that opens when a KPI is clicked. Shows the KPI value over time +
// a breakdown of the most recent contributing items + a CTA to the full page.
export function DrillDownDialog({
  trigger,
  title,
  subtitle,
  current,
  formatValue,
  rows,
  ctaHref,
  ctaLabel,
  locale = "en",
}: {
  trigger: React.ReactNode;
  title: string;
  subtitle?: string;
  current: number;
  formatValue?: (v: number) => string;
  rows: DrillRow[];
  ctaHref?: string;
  ctaLabel?: string;
  locale?: "ar" | "en";
}) {
  const [open, setOpen] = useState(false);
  const ar = locale === "ar";
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Sparkline path from rows
  const sparkPath = (() => {
    if (rows.length < 2) return null;
    const max = Math.max(...rows.map((r) => r.value));
    const min = Math.min(...rows.map((r) => r.value));
    const range = Math.max(max - min, 0.0001);
    const W = 540;
    const H = 80;
    const stepX = W / (rows.length - 1);
    return rows.map((r, i) => {
      const x = i * stepX;
      const y = H - ((r.value - min) / range) * (H - 8) - 4;
      return [x, y] as const;
    });
  })();
  const sparkPathStr = sparkPath
    ? sparkPath.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ")
    : "";
  const sparkAreaStr = sparkPath
    ? `${sparkPathStr} L ${sparkPath[sparkPath.length - 1][0]} 80 L ${sparkPath[0][0]} 80 Z`
    : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-start"
      >
        {trigger}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 anim-fade-in"
            style={{
              background: "color-mix(in srgb, var(--text) 50%, transparent)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl shadow-glow anim-rise-glow"
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div
              className="relative px-5 py-4"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 60%, var(--accent) 130%)",
                color: "white",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] opacity-80">
                    {ar ? "تفاصيل المؤشر" : "KPI breakdown"}
                  </div>
                  <h3 className="mt-0.5 text-[18px] font-black">{title}</h3>
                  {subtitle ? <p className="text-[11px] opacity-85">{subtitle}</p> : null}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-white/15 p-1.5 transition hover:bg-white/25 backdrop-blur"
                  aria-label="close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 text-3xl font-black tabular-nums">{fmt(current)}</div>
            </div>

            {/* Sparkline */}
            {sparkPath ? (
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <svg viewBox="0 0 540 80" width="100%" height="80" aria-hidden>
                  <defs>
                    <linearGradient id="drill-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkAreaStr} fill="url(#drill-area)" />
                  <path
                    d={sparkPathStr}
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={sparkPath[sparkPath.length - 1][0]}
                    cy={sparkPath[sparkPath.length - 1][1]}
                    r="3.5"
                    fill="var(--brand)"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            ) : null}

            {/* Rows */}
            <div className="max-h-[40vh] overflow-y-auto px-5 py-3">
              <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                {ar ? "تفصيل النقاط" : "Data points"}
              </div>
              <ul className="space-y-1">
                {rows.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--brand-soft)]"
                  >
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {r.date}
                      </span>
                      <span className="font-bold" style={{ color: "var(--text)" }}>
                        {r.label}
                      </span>
                      {r.meta ? (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          · {r.meta}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      {r.delta !== undefined && r.delta !== 0 ? (
                        <span
                          className="font-mono text-[10px] font-bold"
                          style={{ color: r.delta >= 0 ? "#0a8e54" : "#dc2626" }}
                        >
                          {r.delta >= 0 ? "+" : ""}{r.delta.toFixed(1)}%
                        </span>
                      ) : null}
                      <span className="font-mono font-extrabold tabular-nums" style={{ color: "var(--text)" }}>
                        {fmt(r.value)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between gap-3 px-5 py-3"
              style={{ borderTop: "1px solid var(--border)", background: "var(--brand-soft)" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost btn-sm"
              >
                {ar ? "إغلاق" : "Close"}
              </button>
              {ctaHref ? (
                <Link href={ctaHref} className="btn-primary btn-sm" onClick={() => setOpen(false)}>
                  {ctaLabel ?? (ar ? "فتح الصفحة الكاملة" : "Open full page")}
                  <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
