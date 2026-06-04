import { getCompanyBrand } from "@/lib/utils/companyBrand";

// A branded hero strip rendered at the top of any company-scoped page.
// Honors the per-company gradient + emblem + motto.
export function CompanyCover({
  code,
  title,
  eyebrow,
  subtitle,
  metrics,
  height = "compact",
  children,
}: {
  code: string;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  metrics?: Array<{ label: string; value: string }>;
  height?: "compact" | "tall";
  children?: React.ReactNode;
}) {
  const brand = getCompanyBrand(code);
  const tallCls = height === "tall" ? "p-7 md:p-10" : "p-5 md:p-7";

  return (
    <div className={`company-cover anim-rise-glow ${tallCls}`} style={{ background: brand.gradient }}>
      {/* Decorative SVG pattern */}
      <PatternLayer pattern={brand.pattern} />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          {/* Big emblem */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/30 backdrop-blur anim-pop"
            style={{ background: "rgba(255,255,255,0.16)" }}
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-3xl font-black">{brand.emblem}</span>
              {brand.emblemSymbol ? (
                <span className="text-[11px] opacity-80">{brand.emblemSymbol}</span>
              ) : null}
            </div>
          </div>
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold tracking-widest backdrop-blur">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="text-xl font-extrabold leading-tight md:text-2xl">
              {title ?? brand.name}
            </h2>
            <div className="mt-1 text-[12px] opacity-85" dir="ltr">
              {brand.nameEn}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-90">
              {subtitle ?? brand.motto}
            </p>
          </div>
        </div>

        {metrics && metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-white/12 px-3 py-2 backdrop-blur ring-1 ring-white/20"
              >
                <div className="text-[10px] uppercase tracking-widest opacity-75">{m.label}</div>
                <div className="mt-0.5 text-base font-extrabold">{m.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

function PatternLayer({ pattern }: { pattern: string }) {
  if (pattern === "leaves") {
    return (
      <svg
        className="company-cover-pattern"
        width="100%"
        height="100%"
        viewBox="0 0 600 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {[...Array(8)].map((_, i) => (
          <path
            key={i}
            d={`M ${50 + i * 80} 180 Q ${75 + i * 80} 60 ${130 + i * 80} 30`}
            stroke="white"
            strokeWidth="1.4"
            fill="none"
            opacity="0.5"
          />
        ))}
      </svg>
    );
  }
  if (pattern === "waves") {
    return (
      <svg className="company-cover-pattern" width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[40, 70, 100, 130, 160].map((y, i) => (
          <path
            key={i}
            d={`M -20 ${y} Q 100 ${y - 14} 200 ${y} T 420 ${y} T 640 ${y}`}
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            opacity="0.55"
          />
        ))}
      </svg>
    );
  }
  if (pattern === "rings") {
    return (
      <svg className="company-cover-pattern" width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[20, 40, 60, 80, 100, 120].map((r, i) => (
          <circle key={i} cx="500" cy="100" r={r} stroke="white" fill="none" strokeWidth="1.2" opacity="0.4" />
        ))}
      </svg>
    );
  }
  if (pattern === "grid") {
    return (
      <svg className="company-cover-pattern" width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>
    );
  }
  if (pattern === "topo") {
    return (
      <svg className="company-cover-pattern" width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx="300" cy="100" rx={120 + i * 60} ry={40 + i * 18} stroke="white" fill="none" strokeWidth="1.2" opacity={0.55 - i * 0.08} />
        ))}
      </svg>
    );
  }
  // dots
  return (
    <svg className="company-cover-pattern" width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id="dots-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="white" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots-pattern)" />
    </svg>
  );
}
