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
          <div className={`h-7 w-64 ${skel}`} />
          <div className={`h-3 w-48 ${skelLight}`} />
        </div>
        <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)" }} />
      </div>

      <div className="space-y-6 p-6">
        <div
          className="relative h-52 overflow-hidden rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 14%, transparent), color-mix(in srgb, var(--accent) 12%, transparent))",
          }}
        >
          <div
            className="absolute inset-0 anim-grad opacity-60"
            style={{ background: "linear-gradient(120deg, transparent 0%, color-mix(in srgb, white 35%, transparent) 50%, transparent 100%)", backgroundSize: "200% 200%" }}
            aria-hidden
          />
          <div className="absolute inset-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 animate-pulse rounded-2xl" style={{ background: "rgba(255,255,255,.25)" }} />
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
                <div className="h-8 w-72 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
                <div className="h-3 w-48 animate-pulse rounded" style={{ background: "rgba(255,255,255,.2)" }} />
              </div>
            </div>
            <div className="space-y-2 text-end">
              <div className="ms-auto h-3 w-16 animate-pulse rounded" style={{ background: "rgba(255,255,255,.3)" }} />
              <div className="ms-auto h-12 w-48 animate-pulse rounded" style={{ background: "rgba(255,255,255,.35)" }} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            <div className="card card-pad space-y-2">
              <div className={`h-4 w-40 ${skel}`} />
              <div className={`h-3 w-full ${skelLight}`} />
              <div className={`h-3 w-3/4 ${skelLight}`} />
            </div>
            {[0, 1].map((s) => (
              <div key={s} className="card card-pad space-y-3">
                <div className={`h-4 w-44 ${skel}`} />
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5 last:border-b-0">
                    <div className="space-y-1.5">
                      <div className={`h-3.5 w-48 ${skel}`} />
                      <div className={`h-2.5 w-32 ${skelLight}`} />
                    </div>
                    <div className={`h-3 w-20 ${skelLight}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="card card-pad space-y-3">
              <div className={`h-4 w-32 ${skel}`} />
              <div className={`h-2 w-full ${skelLight}`} />
              <div className={`h-2 w-3/4 ${skelLight}`} />
              <div className={`h-12 w-full ${skelLight}`} />
            </div>
            <div className="card card-pad space-y-3">
              <div className={`h-4 w-28 ${skel}`} />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
                  <div className={`h-3 w-20 ${skelLight}`} />
                  <div className={`h-3 w-24 ${skel}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
