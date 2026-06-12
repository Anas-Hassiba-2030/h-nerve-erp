// MetricTile — premium KPI tile with branded icon, big number, optional
// delta arrow, and inline SVG sparkline. Replaces flat KPI cards on hero
// modules. Each tile renders as a server component.

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type MetricTileProps = {
  label: string;
  value: string;
  icon?: any;
  /** Optional series of recent values for the sparkline */
  series?: number[];
  /** % delta — positive is good when higherIsBetter, negative is bad */
  deltaPct?: number;
  /** If false, negative delta is displayed as good (e.g. expenses going down) */
  higherIsBetter?: boolean;
  /** Tone color of the accent stripe */
  tone?: "brand" | "emerald" | "amber" | "rose" | "blue" | "violet" | "slate";
  /** Subtitle below value */
  hint?: string;
};

const TONE_FILL: Record<string, string> = {
  brand:   "var(--brand)",
  emerald: "#10b981",
  amber:   "#f59e0b",
  rose:    "#f43f5e",
  blue:    "#3b82f6",
  violet:  "#8b5cf6",
  slate:   "#64748b",
};
const TONE_BG: Record<string, string> = {
  brand:   "var(--brand-soft)",
  emerald: "color-mix(in srgb, #10b981 14%, transparent)",
  amber:   "color-mix(in srgb, #f59e0b 14%, transparent)",
  rose:    "color-mix(in srgb, #f43f5e 14%, transparent)",
  blue:    "color-mix(in srgb, #3b82f6 14%, transparent)",
  violet:  "color-mix(in srgb, #8b5cf6 14%, transparent)",
  slate:   "color-mix(in srgb, #64748b 14%, transparent)",
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;
  const W = 120;
  const H = 28;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const stepX = values.length > 1 ? W / (values.length - 1) : W;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = H - ((v - min) / span) * (H - 4) - 2;
    return [x, y] as const;
  });
  const path = points
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");
  const fillPath = `${path} L${W},${H} L0,${H} Z`;
  const id = `mt-spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="metric-tile-spark" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      {points.length > 0 ? (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2.2}
          fill="white"
          stroke={color}
          strokeWidth={1.5}
        />
      ) : null}
    </svg>
  );
}

export function MetricTile({
  label,
  value,
  icon: Icon,
  series,
  deltaPct,
  higherIsBetter = true,
  tone = "brand",
  hint,
}: MetricTileProps) {
  const fill = TONE_FILL[tone];
  const bg = TONE_BG[tone];

  let DeltaIcon: any = Minus;
  let positive: boolean | null = null;
  if (typeof deltaPct === "number" && Math.abs(deltaPct) >= 0.001) {
    const isUp = deltaPct >= 0;
    positive = higherIsBetter ? isUp : !isUp;
    DeltaIcon = isUp ? TrendingUp : TrendingDown;
  }

  return (
    <div className="metric-tile">
      {/* Accent stripe */}
      <span
        className="absolute inset-y-0 start-0 w-[3px]"
        style={{ background: fill }}
        aria-hidden
      />
      <div className="metric-tile-label">
        <span className="metric-tile-name">{label}</span>
        {Icon ? (
          <span
            className="metric-tile-icon"
            style={{ background: bg, color: fill }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="metric-tile-value">{value}</div>
      <div className="flex items-baseline justify-between gap-2">
        {typeof deltaPct === "number" && Math.abs(deltaPct) >= 0.001 ? (
          <span
            className="metric-tile-delta"
            data-positive={positive ?? undefined}
          >
            <DeltaIcon className="h-3 w-3" />
            {(deltaPct >= 0 ? "+" : "") + (deltaPct * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="metric-tile-delta" style={{ color: "var(--text-muted)" }}>
            <Minus className="h-3 w-3" /> —
          </span>
        )}
        {hint ? (
          <span
            className="text-[10px] font-bold"
            style={{ color: "var(--text-muted)" }}
          >
            {hint}
          </span>
        ) : null}
      </div>
      {series && series.length > 1 ? (
        <Sparkline values={series} color={fill} />
      ) : null}
    </div>
  );
}
