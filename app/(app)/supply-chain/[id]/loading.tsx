export default function Loading() {
  const skel =
    "rounded animate-pulse bg-[color-mix(in_srgb,var(--heri-ink-3)_18%,transparent)]";
  const skelLight =
    "rounded animate-pulse bg-[color-mix(in_srgb,var(--heri-ink-3)_12%,transparent)]";

  return (
    <div className="flex-1 anim-fade-up">
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--heri-rule)" }}
      >
        <div className="space-y-2">
          <div className={`h-3 w-20 ${skelLight}`} />
          <div className={`h-7 w-64 ${skel}`} />
          <div className={`h-3 w-48 ${skelLight}`} />
        </div>
        <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: "color-mix(in srgb, var(--heri-ochre) 14%, transparent)" }} />
      </div>

      <div className="space-y-6 p-6">
        {/* Source → Target dual hero */}
        <div className="card card-pad">
          <div className="grid gap-3 md:grid-cols-[1fr,auto,1fr] md:items-stretch">
            <div className="relative h-36 overflow-hidden rounded-2xl"
              style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--heri-ochre) 14%, transparent), color-mix(in srgb, var(--heri-copper) 12%, transparent))" }}>
              <div className="absolute inset-0 anim-grad opacity-50"
                style={{ background: "linear-gradient(120deg, transparent 0%, color-mix(in srgb, white 30%, transparent) 50%, transparent 100%)", backgroundSize: "200% 200%" }} />
              <div className="absolute inset-5 space-y-2">
                <div className="h-3 w-20 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
                <div className="h-7 w-40 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center px-2 space-y-2">
              <div className={`h-3 w-16 ${skelLight}`} />
              <div className={`h-8 w-24 ${skel}`} />
              <div className={`h-3 w-14 ${skelLight}`} />
              <div
                className="h-1 w-16 animate-pulse rounded-full"
                style={{ background: "color-mix(in srgb, var(--heri-ochre) 30%, transparent)" }}
              />
            </div>
            <div className="relative h-36 overflow-hidden rounded-2xl"
              style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--heri-copper) 14%, transparent), color-mix(in srgb, var(--heri-ochre) 12%, transparent))" }}>
              <div className="absolute inset-0 anim-grad opacity-50"
                style={{ background: "linear-gradient(120deg, transparent 0%, color-mix(in srgb, white 30%, transparent) 50%, transparent 100%)", backgroundSize: "200% 200%" }} />
              <div className="absolute inset-5 space-y-2">
                <div className="h-3 w-20 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
                <div className="h-7 w-40 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kpi">
              <div className={`h-3 w-20 ${skelLight}`} />
              <div className={`mt-2 h-7 w-32 ${skel}`} />
              <div className={`mt-2 h-2.5 w-28 ${skelLight}`} />
            </div>
          ))}
        </div>

        {/* Confidence bar */}
        <div className="card card-pad space-y-2">
          <div className={`h-4 w-32 ${skel}`} />
          <div className="h-3 w-full rounded-full animate-pulse" style={{ background: "color-mix(in srgb, var(--heri-ochre) 16%, transparent)" }} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="card card-pad space-y-2">
            <div className={`h-4 w-32 ${skel}`} />
            <div className={`h-3 w-full ${skelLight}`} />
            <div className={`h-3 w-full ${skelLight}`} />
            <div className={`h-3 w-2/3 ${skelLight}`} />
          </div>
          <div className="card card-pad space-y-3">
            <div className={`h-4 w-32 ${skel}`} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
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
