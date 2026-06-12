"use client";

// components/empire/Sparkline.tsx — Phase 19 (empire boardroom).
//
// A minimal, axis-free recharts area sparkline for a SectorCard. Receives a
// plain number[] as props from the server (no client fetch) and draws a
// single oxblood line on the Quiet Authority paper. Charts always render
// dir="ltr" even on an RTL surface (recharts lays out left→right). When the
// series is flat/empty we draw a hairline baseline instead of a chart.

import { AreaChart, Area, ResponsiveContainer } from "recharts";

export function Sparkline({
  data,
  height = 40,
  color = "var(--emp-accent)",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  const hasSignal = data.length > 1 && data.some((v) => v > 0);

  if (!hasSignal) {
    return (
      <div
        aria-hidden
        style={{
          height,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: "100%",
            height: 1,
            background: "var(--emp-rule)",
            display: "block",
          }}
        />
      </div>
    );
  }

  const points = data.map((v, i) => ({ i, v }));
  const gradId = `empSpark-${Math.round(data.reduce((a, b) => a + b, 0))}-${data.length}`;

  return (
    <div style={{ width: "100%", height }} dir="ltr" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
