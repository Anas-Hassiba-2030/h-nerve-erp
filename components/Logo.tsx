// The combined H-Nerve mark: a central nerve node with three orbiting
// satellites — Hourani Group (ح), Anas AI (AI), Hasiba G (HG).
// Pure SVG, animated entirely in CSS.

export function Logo({
  size = 96,
  withSatellites = true,
  className = "",
}: {
  size?: number;
  withSatellites?: boolean;
  className?: string;
}) {
  const r = size / 2;
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow halo */}
      <div
        className="absolute inset-0 rounded-full anim-pulse-ring"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 30%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Central nerve mark */}
      <svg
        viewBox="0 0 100 100"
        width={size * 0.78}
        height={size * 0.78}
        className="anim-fade-in relative z-10"
      >
        <defs>
          <linearGradient id="nerveCore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand-deep)" />
            <stop offset="60%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id="nerveStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer hex shield */}
        <polygon
          points="50,4 92,28 92,72 50,96 8,72 8,28"
          fill="url(#nerveCore)"
          stroke="url(#nerveStroke)"
          strokeWidth="1.5"
        />

        {/* H letterform with nerve branches */}
        <g
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <line x1="32" y1="28" x2="32" y2="72" />
          <line x1="68" y1="28" x2="68" y2="72" />
          <line x1="32" y1="50" x2="68" y2="50" />
        </g>

        {/* Nerve nodes */}
        <circle cx="32" cy="28" r="3" fill="white" />
        <circle cx="68" cy="28" r="3" fill="white" />
        <circle cx="32" cy="72" r="3" fill="white" />
        <circle cx="68" cy="72" r="3" fill="white" />
        <circle cx="50" cy="50" r="4" fill="var(--accent)" />
      </svg>

      {/* Orbiting satellites: Hourani, Anas AI, Hasiba G */}
      {withSatellites ? (
        <>
          <Satellite
            label="ح"
            color="#c69345"
            angle={0}
            radius={size * 0.52}
            delay="0s"
            tooltip="Hourani Group"
          />
          <Satellite
            label="AI"
            color="#0a0a0a"
            angle={120}
            radius={size * 0.52}
            delay="-4s"
            tooltip="Anas AI"
          />
          <Satellite
            label="HG"
            color="#1a1a1a"
            angle={240}
            radius={size * 0.52}
            delay="-8s"
            tooltip="Hasiba G"
          />
        </>
      ) : null}
    </div>
  );
}

function Satellite({
  label,
  color,
  angle,
  radius,
  delay,
  tooltip,
}: {
  label: string;
  color: string;
  angle: number;
  radius: number;
  delay: string;
  tooltip?: string;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        // place at ring radius, offset by angle
        transform: `rotate(${angle}deg) translateX(${radius}px) rotate(-${angle}deg)`,
        animation: `orbit 14s linear infinite`,
        animationDelay: delay,
      }}
      title={tooltip}
    >
      <div
        className="flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-black text-white shadow-lg ring-2 ring-white/40"
        style={{ background: color }}
      >
        {label}
      </div>
    </div>
  );
}

// Compact horizontal logo: nerve mark + wordmark
export function LogoLockup({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} withSatellites={false} />
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          H‑Nerve <span style={{ color: "var(--accent)" }}>ERP</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
          <span className="nerve-dot" />
          مجموعة الحوراني
        </div>
      </div>
    </div>
  );
}
