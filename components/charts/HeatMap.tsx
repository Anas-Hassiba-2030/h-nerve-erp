// Animated heat-map matrix — rows × columns of intensity-shaded cells.
// Pure SVG, no client JS. Designed for booking density (hotels × days),
// crop yield (farms × weeks), or any 2D performance matrix.

export type HeatMapCell = {
  value: number;       // raw value
  rowKey: string;
  colKey: string;
  label?: string;      // tooltip / aria
};

export function HeatMap({
  rows,
  cols,
  cells,
  formatValue,
  cellSize = 28,
  rowLabelWidth = 120,
  colLabelHeight = 28,
  emptyTone = "var(--brand-soft)",
  fullTone = "var(--brand)",
  highTone = "var(--accent)",
  highlight,
  locale = "en",
}: {
  rows: Array<{ key: string; label: string }>;
  cols: Array<{ key: string; label: string }>;
  cells: HeatMapCell[];
  formatValue?: (v: number) => string;
  cellSize?: number;
  rowLabelWidth?: number;
  colLabelHeight?: number;
  emptyTone?: string;
  fullTone?: string;
  highTone?: string;
  // optional max — otherwise computed from cells
  highlight?: { rowKey?: string; colKey?: string };
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
  const max = Math.max(0.0001, ...cells.map((c) => c.value));

  const lookup = new Map<string, HeatMapCell>();
  for (const c of cells) lookup.set(`${c.rowKey}|${c.colKey}`, c);

  const width = rowLabelWidth + cols.length * cellSize + 8;
  const height = colLabelHeight + rows.length * cellSize + 8;

  // Color interpolator: emptyTone → fullTone (low to mid) → highTone (top 20%)
  function colorForIntensity(intensity: number): string {
    // intensity is 0..1
    if (intensity <= 0) return emptyTone;
    if (intensity > 0.85) return highTone;
    return `color-mix(in srgb, ${fullTone} ${Math.round(intensity * 100)}%, var(--surface-elevated))`;
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ minWidth: width, maxWidth: width }}
        role="img"
        aria-label={ar ? "خريطة حرارية" : "Heat map"}
      >
        {/* Column headers */}
        {cols.map((c, i) => (
          <text
            key={c.key}
            x={rowLabelWidth + i * cellSize + cellSize / 2}
            y={colLabelHeight - 8}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="color-mix(in srgb, var(--text-muted) 90%, transparent)"
            style={{
              opacity: 0,
              animation: "fade-in .4s ease forwards",
              animationDelay: `${i * 0.015}s`,
            }}
          >
            {c.label}
          </text>
        ))}

        {/* Row labels */}
        {rows.map((r, i) => (
          <text
            key={r.key}
            x={ar ? width - 4 : rowLabelWidth - 8}
            y={colLabelHeight + i * cellSize + cellSize / 2 + 4}
            textAnchor={ar ? "start" : "end"}
            fontSize="11"
            fontWeight="700"
            fill="var(--text)"
            style={{
              opacity: 0,
              animation: "fade-in .4s ease forwards",
              animationDelay: `${i * 0.025}s`,
            }}
          >
            {r.label.length > 18 ? r.label.slice(0, 17) + "…" : r.label}
          </text>
        ))}

        {/* Cells */}
        {rows.map((r, ri) =>
          cols.map((c, ci) => {
            const cell = lookup.get(`${r.key}|${c.key}`);
            const v = cell?.value ?? 0;
            const intensity = v / max;
            const isHighlighted =
              (highlight?.rowKey === r.key) || (highlight?.colKey === c.key);
            const x = ar ? width - rowLabelWidth - (ci + 1) * cellSize : rowLabelWidth + ci * cellSize;
            const y = colLabelHeight + ri * cellSize;
            return (
              <g key={`${r.key}-${c.key}`}>
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  rx="3"
                  fill={colorForIntensity(intensity)}
                  stroke={isHighlighted ? "var(--accent)" : "transparent"}
                  strokeWidth={isHighlighted ? 1.5 : 0}
                  style={{
                    transformOrigin: `${x + cellSize / 2}px ${y + cellSize / 2}px`,
                    transform: "scale(0.5)",
                    opacity: 0,
                    animation: "heat-pop .35s cubic-bezier(.21,.92,.32,1) forwards",
                    animationDelay: `${(ri + ci) * 0.012}s`,
                  }}
                >
                  <title>{cell?.label ?? `${r.label} · ${c.label}: ${fmt(v)}`}</title>
                </rect>
                {/* Show value on cell when intensity > 0.5 */}
                {intensity > 0.5 && cellSize >= 26 ? (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill={intensity > 0.85 ? "white" : "var(--text)"}
                    style={{
                      opacity: 0,
                      animation: "fade-in .3s ease forwards",
                      animationDelay: `${0.4 + (ri + ci) * 0.012}s`,
                      pointerEvents: "none",
                    }}
                  >
                    {fmt(v)}
                  </text>
                ) : null}
              </g>
            );
          })
        )}

        <style>{`
          @keyframes heat-pop {
            from { transform: scale(0.5); opacity: 0 }
            to { transform: scale(1); opacity: 1 }
          }
        `}</style>
      </svg>
    </div>
  );
}

// Legend strip: color gradient + min/max labels
export function HeatMapLegend({
  min, max,
  emptyTone = "var(--brand-soft)",
  fullTone = "var(--brand)",
  highTone = "var(--accent)",
  formatValue,
  ar = false,
}: {
  min: number; max: number;
  emptyTone?: string; fullTone?: string; highTone?: string;
  formatValue?: (v: number) => string;
  ar?: boolean;
}) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
  return (
    <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
      <span>{ar ? "هادئ" : "Low"}</span>
      <span className="font-mono">{fmt(min)}</span>
      <div
        className="h-1.5 w-32 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${emptyTone} 0%, ${fullTone} 70%, ${highTone} 100%)`,
        }}
      />
      <span className="font-mono">{fmt(max)}</span>
      <span>{ar ? "ذروة" : "Peak"}</span>
    </div>
  );
}
