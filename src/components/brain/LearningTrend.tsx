"use client";

// LearningTrend — the Feedback Loop's learning curve (Phase 7).
//
// Fetches GET /api/learning/patterns and draws how the brain's
// accept-vs-reject balance moved week over week. Heritage Modern: ochre
// for accepted signal, terracotta for rejected, on cream with a hairline
// rule. The first (and only) recharts surface in the app — kept to a
// restrained editorial sparkline, not a dashboard chart.

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type WeekBucket = {
  week: string;
  total: number;
  accepted: number;
  rejected: number;
  neutral: number;
};

type PatternsResponse = {
  totalEvents: number;
  weeks: WeekBucket[];
  byKind: Record<string, number>;
  byModule: Record<string, number>;
};

export function LearningTrend({ ar, weeks = 12 }: { ar: boolean; weeks?: number }) {
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/learning/patterns?weeks=${weeks}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: PatternsResponse) => {
        if (alive) setData(j);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [weeks]);

  return (
    <section
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "16px 18px 10px",
      }}
    >
      <header className="flex items-center justify-between">
        <span className="heri-eyebrow heri-eyebrow-ink">
          {ar ? "منحنى التعلّم" : "Learning curve"}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--heri-ink-3)",
          }}
        >
          {ar ? `آخر ${weeks} أسبوعاً` : `last ${weeks} wk`}
        </span>
      </header>

      {error ? (
        <Empty ar={ar} text={ar ? "تعذّر تحميل المنحنى." : "Couldn't load the trend."} />
      ) : !data ? (
        <Empty ar={ar} text={ar ? "جارٍ التحميل…" : "Loading…"} />
      ) : data.totalEvents === 0 ? (
        <Empty
          ar={ar}
          text={ar ? "لا أحداث تغذية راجعة بعد." : "No feedback events yet."}
        />
      ) : (
        <>
          <div style={{ width: "100%", height: 132, marginTop: 8 }} dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeks} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--heri-ochre)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--heri-ochre)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rejGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--heri-terracotta)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--heri-terracotta)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "var(--heri-ink-3)" }}
                  tickFormatter={(w: string) => w.slice(5)}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: "var(--heri-rule)" }}
                />
                <YAxis
                  allowDecimals={false}
                  width={28}
                  tick={{ fontSize: 12, fill: "var(--heri-ink-3)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<TrendTooltip ar={ar} />} />
                <Area
                  type="monotone"
                  dataKey="accepted"
                  stroke="var(--heri-ochre)"
                  strokeWidth={1.5}
                  fill="url(#accGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  stroke="var(--heri-terracotta)"
                  strokeWidth={1.5}
                  fill="url(#rejGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Legend ar={ar} total={data.totalEvents} />
        </>
      )}
    </section>
  );
}

type TooltipEntry = { name?: string; value?: number; dataKey?: string | number };

function TrendTooltip({
  ar,
  active,
  payload,
  label,
}: {
  ar: boolean;
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const acc = payload.find((p) => p.dataKey === "accepted")?.value ?? 0;
  const rej = payload.find((p) => p.dataKey === "rejected")?.value ?? 0;
  return (
    <div
      style={{
        background: "var(--heri-ink)",
        color: "var(--heri-cream)",
        padding: "8px 10px",
        fontSize: 12,
        lineHeight: 1.5,
        border: "1px solid var(--heri-ink)",
      }}
      dir={ar ? "rtl" : "ltr"}
    >
      <div style={{ opacity: 0.75, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
        {ar ? "أسبوع" : "Week of"} {label}
      </div>
      <div>
        {ar ? "مقبول" : "Accepted"}: <strong>{acc}</strong>
      </div>
      <div>
        {ar ? "مرفوض" : "Rejected"}: <strong>{rej}</strong>
      </div>
    </div>
  );
}

function Legend({ ar, total }: { ar: boolean; total: number }) {
  return (
    <div
      className="flex items-center gap-4 pt-2 mt-1"
      style={{ borderTop: "1px solid var(--heri-rule)", fontSize: 12, color: "var(--heri-ink-2)" }}
    >
      <Swatch color="var(--heri-ochre)" label={ar ? "مقبول" : "Accepted"} />
      <Swatch color="var(--heri-terracotta)" label={ar ? "مرفوض" : "Rejected"} />
      <span className="grow" />
      <span
        style={{
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 12,
          color: "var(--heri-ink-3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {total.toLocaleString("en-US")} {ar ? "حدث" : "events"}
      </span>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden style={{ width: 10, height: 2.5, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function Empty({ ar, text }: { ar: boolean; text: string }) {
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        height: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "var(--heri-ink-3)",
        fontStyle: "italic",
      }}
    >
      {text}
    </div>
  );
}
