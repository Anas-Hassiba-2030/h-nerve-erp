export default function Loading() {
  const skel =
    "rounded animate-pulse bg-[color-mix(in_srgb,var(--ink-muted)_18%,transparent)]";
  const skelLight =
    "rounded animate-pulse bg-[color-mix(in_srgb,var(--ink-muted)_12%,transparent)]";

  return (
    <div className="flex-1 anim-fade-up">
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="space-y-2">
          <div className={`h-3 w-20 ${skelLight}`} />
          <div className={`h-7 w-64 ${skel}`} />
          <div className={`h-3 w-48 ${skelLight}`} />
        </div>
        <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)" }} />
      </div>

      <div className="space-y-6 p-6">
        <div
          className="relative h-52 overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, #b06a1a 22%, transparent), color-mix(in srgb, var(--gold) 14%, transparent))",
          }}
        >
          <div
            className="absolute inset-0 anim-grad opacity-60"
            style={{ background: "linear-gradient(120deg, transparent 0%, color-mix(in srgb, white 35%, transparent) 50%, transparent 100%)", backgroundSize: "200% 200%" }}
            aria-hidden
          />
          <div className="absolute inset-6 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 animate-pulse rounded-2xl" style={{ background: "rgba(255,255,255,.3)" }} />
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
                <div className="h-9 w-72 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
                <div className="h-3 w-56 animate-pulse rounded" style={{ background: "rgba(255,255,255,.2)" }} />
              </div>
            </div>
            <div className="space-y-2 text-end">
              <div className="ms-auto h-3 w-16 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
              <div className="ms-auto h-12 w-44 animate-pulse rounded" style={{ background: "rgba(255,255,255,.35)" }} />
            </div>
          </div>
        </div>

        {/* Stay timeline */}
        <div className="card card-pad space-y-3">
          <div className={`h-4 w-32 ${skel}`} />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className={`h-3 w-12 ${skelLight}`} />
              <div className={`h-4 w-20 ${skel}`} />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${skel}`} />
              <div className={`h-1 flex-1 ${skelLight}`} />
              <div className={`h-2 w-2 rounded-full ${skel}`} />
            </div>
            <div className="space-y-1.5 text-end">
              <div className={`h-3 w-12 ${skelLight}`} />
              <div className={`h-4 w-20 ${skel}`} />
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

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="card card-pad space-y-3">
            <div className={`h-4 w-44 ${skel}`} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2.5 last:border-b-0">
                <div className="space-y-1.5">
                  <div className={`h-3.5 w-48 ${skel}`} />
                  <div className={`h-2.5 w-32 ${skelLight}`} />
                </div>
                <div className={`h-3 w-16 ${skelLight}`} />
              </div>
            ))}
          </div>
          <div className="card card-pad space-y-3">
            <div className={`h-4 w-28 ${skel}`} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 last:border-b-0">
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
