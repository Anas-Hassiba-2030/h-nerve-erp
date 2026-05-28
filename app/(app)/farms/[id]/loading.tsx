import { KpiSkeleton, CardSkeleton, TableSkeleton } from "@/components/skeletons";

// Mirrors farms/[id]/page.tsx exactly so the detail surface doesn't jump on
// hydration: Topbar row, Heritage hero plinth, 4-up HeriKpi strip, sensors +
// about two-column, then the crops table.
export default function Loading() {
  return (
    <div className="flex-1 anim-fade-up">
      {/* Topbar row */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--heri-rule)" }}
      >
        <div className="space-y-2">
          <div className="skel skel-eyebrow" />
          <div className="skel skel-title" style={{ width: 240 }} />
          <div className="skel skel-line" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="skel" style={{ width: 80, height: 32, borderRadius: 0 }} />
          <div className="skel" style={{ width: 110, height: 32, borderRadius: 0 }} />
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Heritage hero plinth */}
        <div
          className="heri-hero relative p-6"
          style={{ minHeight: 170 }}
          aria-busy="true"
        >
          <div className="flex items-start gap-4">
            <div className="skel" style={{ width: 64, height: 64, borderRadius: 0 }} />
            <div className="flex-1 space-y-2">
              <div className="skel skel-eyebrow" style={{ width: 140 }} />
              <div className="skel skel-title" style={{ width: "min(360px, 55%)" }} />
              <div className="skel skel-line" style={{ width: "min(280px, 45%)" }} />
              <div className="mt-2 flex gap-3">
                <div className="skel skel-pill" style={{ width: 110 }} />
                <div className="skel skel-pill" style={{ width: 130 }} />
                <div className="skel skel-pill" style={{ width: 90 }} />
              </div>
            </div>
          </div>
        </div>

        {/* 4-up KPI strip */}
        <KpiSkeleton count={4} />

        {/* Sensors + about two-column */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <CardSkeleton lines={5} height={220} />
          <CardSkeleton lines={5} />
        </div>

        {/* Crops table */}
        <TableSkeleton rows={5} cols={8} caption />
      </div>
    </div>
  );
}
