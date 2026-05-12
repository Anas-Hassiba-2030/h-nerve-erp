// IQTrend — a single line chart showing the IQ trajectory over time.
//
// SVG. No external dep. Single ochre stroke. The most-recent point is
// emphasized with a 4px ochre dot. Hairline reference grid every 20 IQ
// points. Subtle area fill under the line.
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

export function IQTrend({
  history,
  width = 720,
  height = 220,
}: {
  history: Array<{ snappedAt: Date; iq: number }>;
  width?: number;
  height?: number;
}) {
  if (history.length === 0) return null;

  const padX = 24;
  const padTop = 18;
  const padBottom = 28;

  const xs = history.map((h) => h.snappedAt.getTime());
  const ys = history.map((h) => h.iq);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xSpan = Math.max(1, xMax - xMin);

  const yMinRaw = Math.min(...ys);
  const yMaxRaw = Math.max(...ys);
  // Pad the y-range to leave breathing room top/bottom.
  const yMin = Math.max(60, Math.floor((yMinRaw - 8) / 10) * 10);
  const yMax = Math.ceil((yMaxRaw + 8) / 10) * 10;
  const ySpan = yMax - yMin;

  const sx = (x: number) => padX + ((x - xMin) / xSpan) * (width - padX * 2);
  const sy = (y: number) => padTop + ((yMax - y) / ySpan) * (height - padTop - padBottom);

  const points = history.map((h) => [sx(h.snappedAt.getTime()), sy(h.iq)] as const);
  const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const fillPath = `${path} L ${points[points.length - 1][0]} ${height - padBottom} L ${points[0][0]} ${height - padBottom} Z`;
  const last = points[points.length - 1];

  // Reference horizontal lines every 20 points within range.
  const gridLines: number[] = [];
  for (let v = Math.ceil(yMin / 20) * 20; v <= yMax; v += 20) gridLines.push(v);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Brain IQ trend"
      style={{ display: "block", width: "100%", height }}
    >
      {/* Grid */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={padX}
            y1={sy(v)}
            x2={width - padX}
            y2={sy(v)}
            stroke="var(--heri-rule)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <text
            x={padX - 6}
            y={sy(v) + 3}
            textAnchor="end"
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 9.5,
              letterSpacing: "0.06em",
              fill: "var(--heri-ink-3)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={fillPath} fill="color-mix(in srgb, var(--heri-ochre) 14%, transparent)" />

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke="var(--heri-ochre)"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: 2000,
          strokeDashoffset: 2000,
          animation: "iq-draw 1100ms cubic-bezier(0.16,1,0.3,1) 80ms forwards",
        }}
      />

      {/* All-but-last dots */}
      {points.slice(0, -1).map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={2.2}
          fill="var(--heri-cream)"
          stroke="var(--heri-ochre)"
          strokeWidth={1}
        />
      ))}

      {/* Last dot — emphasized */}
      <circle
        cx={last[0]}
        cy={last[1]}
        r={5}
        fill="var(--heri-ochre)"
        stroke="var(--heri-cream)"
        strokeWidth={2}
        style={{
          animation: "iq-pulse 2400ms ease-in-out infinite",
          transformOrigin: `${last[0]}px ${last[1]}px`,
        }}
      />

      {/* Last value annotation */}
      <text
        x={last[0]}
        y={last[1] - 14}
        textAnchor="middle"
        style={{
          fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
          fontSize: 14,
          fontWeight: 500,
          fill: "var(--heri-ink)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.012em",
        }}
      >
        {history[history.length - 1].iq}
      </text>

      {/* X-axis dates */}
      {history.map((h, i) => (
        <text
          key={i}
          x={sx(h.snappedAt.getTime())}
          y={height - 8}
          textAnchor="middle"
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 9,
            letterSpacing: "0.08em",
            fill: "var(--heri-ink-3)",
            textTransform: "uppercase",
          }}
        >
          {new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" })
            .format(h.snappedAt)
            .toUpperCase()}
        </text>
      ))}
    </svg>
  );
}
