// Pure SVG sparkline — no client-side JS.
export function Sparkline({
  data,
  width = 120,
  height = 36,
  positive,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  fill?: boolean;
}) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(max - min, 0.0001);
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const last = data[data.length - 1];
  const first = data[0];
  const isUp = positive ?? last >= first;
  // Heritage palette — teal for positive, terracotta for negative. No neon.
  const color = isUp ? "var(--heri-teal)" : "var(--heri-terracotta)";
  const fillColor = isUp
    ? "color-mix(in srgb, var(--heri-teal) 12%, transparent)"
    : "color-mix(in srgb, var(--heri-terracotta) 12%, transparent)";

  const fillPath = fill
    ? `${path} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`
    : "";

  const len = data.length * 12;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {fill ? <path d={fillPath} fill={fillColor} /> : null}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: len,
          strokeDashoffset: len,
          animation: `draw-line .9s cubic-bezier(.21,.92,.32,1) forwards`,
          ["--len" as any]: len,
        }}
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={1.75}
        fill={color}
      />
    </svg>
  );
}
