// 4-column KPI strip placeholder. Matches the `.kpi` rhythm: tiny label,
// large value, small delta. Honors RTL automatically because the grid uses
// logical flow.
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section
      className="skel-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading KPIs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-pad space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="skel" style={{ width: "55%", height: 10 }} />
            <div
              className="skel skel-circle"
              style={{ width: 32, height: 32 }}
            />
          </div>
          <div className="skel skel-title" style={{ width: "62%" }} />
          <div className="skel skel-line-sm" style={{ width: "44%" }} />
        </div>
      ))}
    </section>
  );
}
