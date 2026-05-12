// Animated donut chart with legend — pure SVG.

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  data,
  size = 180,
  thickness = 28,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="color-mix(in srgb, var(--text-muted) 14%, transparent)"
            strokeWidth={thickness}
          />
          {data.map((slice, i) => {
            const fraction = slice.value / total;
            const dash = c * fraction;
            const gap = c - dash;
            const offset = c * acc;
            acc += fraction;
            return (
              <circle
                key={slice.label + i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  animation: `donut-grow .8s cubic-bezier(.21,.92,.32,1) forwards`,
                  animationDelay: `${i * 0.08}s`,
                  strokeDasharray: `0 ${c}`,
                }}
              >
                <animate
                  attributeName="stroke-dasharray"
                  from={`0 ${c}`}
                  to={`${dash} ${gap}`}
                  dur="0.9s"
                  fill="freeze"
                  begin={`${i * 0.08}s`}
                />
              </circle>
            );
          })}
        </svg>
        {(centerLabel || centerValue) ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center anim-fade-in"
               style={{ animationDelay: `${data.length * 0.08 + 0.4}s` }}>
            {centerValue ? (
              <div className="text-2xl font-black" style={{ color: "var(--text)" }}>
                {centerValue}
              </div>
            ) : null}
            {centerLabel ? (
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {centerLabel}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {/* Legend */}
      <ul className="flex-1 space-y-1.5">
        {data.map((slice, i) => (
          <li key={slice.label + i} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: slice.color }} />
              <span className="truncate font-bold" style={{ color: "var(--text)" }}>{slice.label}</span>
            </div>
            <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
              {((slice.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
