// Compact comparison bar — shows a single value relative to a benchmark
// (peer average, sector mean, target). The bar fills based on value, with
// a vertical marker at the benchmark position. Color indicates whether
// the value is above or below benchmark.

import { TrendingUp, TrendingDown } from "lucide-react";

export function BenchmarkBar({
  label,
  value,
  benchmark,
  max,
  formatValue,
  unit,
  higherIsBetter = true,
  locale = "en",
}: {
  label: string;
  value: number;
  benchmark: number;
  max?: number;
  formatValue?: (v: number) => string;
  unit?: string;
  higherIsBetter?: boolean;
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
  const m = max ?? Math.max(value * 1.2, benchmark * 1.5, 1);
  const valuePct = Math.min(100, (value / m) * 100);
  const benchmarkPct = Math.min(100, (benchmark / m) * 100);

  const above = higherIsBetter ? value >= benchmark : value <= benchmark;
  const diff = benchmark > 0 ? ((value - benchmark) / benchmark) * 100 : 0;
  const color = above ? "#0a8e54" : "#dc2626";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="font-bold" style={{ color: "var(--text)" }}>
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-extrabold" style={{ color: "var(--text)" }}>
            {fmt(value)}
            {unit ? <span className="opacity-60"> {unit}</span> : null}
          </span>
          <span
            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
            }}
            title={ar ? "الفرق عن المعيار" : "Difference vs benchmark"}
          >
            {above ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
          </span>
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--text-muted) 14%, transparent)" }}
      >
        {/* Filled bar */}
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{
            insetInlineStart: 0,
            width: `${valuePct}%`,
            background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 70%, var(--accent)) 100%)`,
          }}
        />
        {/* Benchmark marker */}
        <div
          className="absolute top-0 h-full"
          style={{
            insetInlineStart: `calc(${benchmarkPct}% - 1px)`,
            width: "2px",
            background: "var(--text)",
            opacity: 0.7,
          }}
          title={`${ar ? "المعيار" : "Benchmark"}: ${fmt(benchmark)}`}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
        <span className="font-mono">0</span>
        <span className="font-mono opacity-70">
          {ar ? "المعيار" : "Benchmark"} · {fmt(benchmark)}
        </span>
        <span className="font-mono">{fmt(m)}</span>
      </div>
    </div>
  );
}
