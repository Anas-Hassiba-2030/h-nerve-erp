// Animated semi-circular gauge for percentage / score values.

export function GaugeChart({
  value, // 0-100
  size = 160,
  label,
  sublabel,
  color = "var(--brand)",
}: {
  value: number;
  size?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = size / 2 - 16;
  const c = Math.PI * r; // semi-circle circumference
  const dash = (c * v) / 100;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size / 1.7}`} width={size} height={size / 1.7}>
        <defs>
          <linearGradient id={`gauge-${value}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--brand) 80%, var(--accent))" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={`M ${size / 2 - r} ${size / 2 - 4} A ${r} ${r} 0 0 1 ${size / 2 + r} ${size / 2 - 4}`}
          fill="none"
          stroke="color-mix(in srgb, var(--text-muted) 14%, transparent)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${size / 2 - r} ${size / 2 - 4} A ${r} ${r} 0 0 1 ${size / 2 + r} ${size / 2 - 4}`}
          fill="none"
          stroke={`url(#gauge-${value})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            strokeDasharray: `0 ${c}`,
          }}
        >
          <animate
            attributeName="stroke-dasharray"
            from={`0 ${c}`}
            to={`${dash} ${c - dash}`}
            dur="0.9s"
            fill="freeze"
          />
        </path>
      </svg>
      <div className="-mt-4 text-center anim-fade-up">
        <div className="text-3xl font-black" style={{ color: "var(--text)" }}>
          {v.toFixed(1)}
          <span className="text-base opacity-60">/100</span>
        </div>
        {label ? (
          <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {label}
          </div>
        ) : null}
        {sublabel ? (
          <div className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            {sublabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
