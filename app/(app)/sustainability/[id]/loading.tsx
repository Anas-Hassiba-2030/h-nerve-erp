export default function Loading() {
  const skel =
    "rounded animate-pulse bg-[color-mix(in_srgb,var(--text-muted)_18%,transparent)]";
  const skelLight =
    "rounded animate-pulse bg-[color-mix(in_srgb,var(--text-muted)_12%,transparent)]";

  return (
    <div className="flex-1 anim-fade-up">
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="space-y-2">
          <div className={`h-3 w-20 ${skelLight}`} />
          <div className={`h-7 w-72 ${skel}`} />
          <div className={`h-3 w-56 ${skelLight}`} />
        </div>
        <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)" }} />
      </div>

      <div className="space-y-6 p-6">
        {/* Hero with gauge */}
        <div
          className="relative h-56 overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, #0a8e54 22%, transparent), color-mix(in srgb, var(--accent) 14%, transparent))",
          }}
        >
          <div
            className="absolute inset-0 anim-grad opacity-60"
            style={{ background: "linear-gradient(120deg, transparent 0%, color-mix(in srgb, white 35%, transparent) 50%, transparent 100%)", backgroundSize: "200% 200%" }}
            aria-hidden
          />
          <div className="absolute inset-6 flex items-center gap-6">
            {/* Circular gauge skeleton */}
            <div
              className="h-44 w-44 animate-pulse rounded-full"
              style={{
                background: "conic-gradient(rgba(255,255,255,.3) 0%, rgba(255,255,255,.1) 70%, rgba(255,255,255,.3) 100%)",
                mask: "radial-gradient(circle, transparent 56%, black 58%)",
                WebkitMask: "radial-gradient(circle, transparent 56%, black 58%)",
              }}
            />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
              <div className="h-8 w-72 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
              <div className="h-3 w-56 animate-pulse rounded" style={{ background: "rgba(255,255,255,.2)" }} />
            </div>
          </div>
        </div>

        {/* E/S/G triple */}
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card card-pad space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-9 w-9 ${skelLight}`} />
                  <div className="space-y-1">
                    <div className={`h-3 w-16 ${skel}`} />
                    <div className={`h-2.5 w-20 ${skelLight}`} />
                  </div>
                </div>
                <div className={`h-7 w-12 ${skel}`} />
              </div>
              <div className={`h-2 w-full ${skelLight}`} />
            </div>
          ))}
        </div>

        {/* Operational metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="kpi">
              <div className={`h-3 w-20 ${skelLight}`} />
              <div className={`mt-2 h-7 w-32 ${skel}`} />
              <div className={`mt-2 h-2.5 w-28 ${skelLight}`} />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="card card-pad space-y-3">
            <div className={`h-4 w-44 ${skel}`} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className={`h-3 w-32 ${skel}`} />
                  <div className={`h-3 w-12 ${skelLight}`} />
                </div>
                <div className={`h-1.5 w-full ${skelLight}`} />
              </div>
            ))}
          </div>
          <div className="card card-pad space-y-3">
            <div className={`h-4 w-28 ${skel}`} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
                <div className={`h-3 w-20 ${skelLight}`} />
                <div className={`h-3 w-24 ${skel}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
