// Animated area + line chart with grid + axis labels — pure SVG.

export function AreaLineChart({
  data,
  labels,
  height = 200,
  color = "var(--brand)",
  formatY,
  showGrid = true,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
  showGrid?: boolean;
}) {
  if (!data || data.length < 2) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>—</div>;
  }
  const width = 720;
  const padding = { top: 16, right: 16, bottom: 28, left: 48 };
  const inner = {
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom,
  };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const stepX = inner.w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + inner.h - ((v - min) / range) * inner.h;
    return [x, y] as const;
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${padding.top + inner.h} L ${points[0][0]} ${padding.top + inner.h} Z`;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((p) => padding.top + p * inner.h);
  const fmt = formatY ?? ((v: number) => v.toLocaleString("en-US"));
  const labelTicks = [max, min + range * 0.75, min + range * 0.5, min + range * 0.25, min];

  const lineLen = 2000; // for stroke-dash animation

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="line-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {showGrid
        ? gridY.map((y, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + inner.w}
                y2={y}
                stroke="color-mix(in srgb, var(--text-muted) 12%, transparent)"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fill="color-mix(in srgb, var(--text-muted) 80%, transparent)"
              >
                {fmt(labelTicks[i])}
              </text>
            </g>
          ))
        : null}

      {/* X labels */}
      {labels
        ? points.map((p, i) =>
            // show every n-th label to avoid crowding
            i % Math.max(1, Math.ceil(data.length / 6)) === 0 ? (
              <text
                key={i}
                x={p[0]}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="color-mix(in srgb, var(--text-muted) 80%, transparent)"
              >
                {labels[i] ?? ""}
              </text>
            ) : null
          )
        : null}

      {/* Area fill */}
      <path
        d={areaPath}
        fill="url(#line-area)"
        style={{
          opacity: 0,
          animation: "fade-in .9s ease forwards",
          animationDelay: ".4s",
        }}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={lineLen}
        strokeDashoffset={lineLen}
        style={{
          animation: "draw-line 1s cubic-bezier(.21,.92,.32,1) forwards",
        }}
      />

      {/* Endpoint dot */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="4"
        fill={color}
        stroke="white"
        strokeWidth="2"
        style={{
          opacity: 0,
          animation: "pop .4s cubic-bezier(.34,1.56,.64,1) forwards",
          animationDelay: ".9s",
        }}
      />

      <style>{`
        @keyframes draw-line { to { stroke-dashoffset: 0 } }
      `}</style>
    </svg>
  );
}
