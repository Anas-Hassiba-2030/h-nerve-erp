// Pure SVG animated bar chart — no client JS required.
// Bars draw in via CSS keyframes with a stagger.

export type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

export function BarChart({
  data,
  height = 220,
  formatValue,
  // Show value labels above bars
  showValues = true,
  // Comparative — second series rendered behind in lighter shade
  baseline,
}: {
  data: BarDatum[];
  height?: number;
  formatValue?: (v: number) => string;
  showValues?: boolean;
  baseline?: number[];
}) {
  if (!data || data.length === 0) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>—</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.value), ...(baseline ?? []));
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const basePct = baseline ? (baseline[i] ?? 0) / max * 100 : 0;
          const color = d.color ?? "var(--brand)";
          return (
            <div key={d.label + i} className="relative flex h-full flex-1 flex-col items-center justify-end">
              {/* Value label */}
              {showValues ? (
                <div
                  className="mb-1 text-[10px] font-bold opacity-0"
                  style={{
                    color: "var(--text)",
                    animation: "fade-in .6s ease forwards",
                    animationDelay: `${0.4 + i * 0.06}s`,
                  }}
                >
                  {fmt(d.value)}
                </div>
              ) : null}
              <div className="relative w-full h-full flex items-end">
                {/* Baseline (faint bar behind) */}
                {baseline ? (
                  <div
                    className="absolute bottom-0 w-full rounded-t-md opacity-30"
                    style={{
                      height: `${basePct}%`,
                      background: "color-mix(in srgb, var(--text-muted) 30%, transparent)",
                      transform: "translateX(2px)",
                    }}
                  />
                ) : null}
                {/* Active bar with grow animation */}
                <div
                  className="relative w-full rounded-t-md"
                  style={{
                    height: `${pct}%`,
                    background: `linear-gradient(to top, ${color} 0%, color-mix(in srgb, ${color} 70%, var(--accent)) 100%)`,
                    transform: "scaleY(0)",
                    transformOrigin: "bottom",
                    animation: "bar-grow .9s cubic-bezier(.21,.92,.32,1) forwards",
                    animationDelay: `${i * 0.06}s`,
                    boxShadow: `0 -2px 12px -4px ${color}`,
                  }}
                />
              </div>
              {/* X label */}
              <div
                className="mt-1.5 line-clamp-1 text-[10px] font-bold"
                style={{ color: "var(--text-muted)" }}
                title={d.label}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes bar-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
      `}</style>
    </div>
  );
}
