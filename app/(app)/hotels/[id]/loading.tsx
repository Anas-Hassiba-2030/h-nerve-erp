import { KpiSkeleton, CardSkeleton } from "@/components/skeletons";

// Mirrors hotels/[id]/page.tsx so the detail surface doesn't jump on
// hydration: Topbar row, Heritage hero plinth, 4-up HeriKpi strip, occupancy
// bar card, then the two-column body (1fr arrivals + recent | 360px aside).
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
          <div className="skel skel-title" style={{ width: 280 }} />
          <div className="skel skel-line" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="skel" style={{ width: 90, height: 32, borderRadius: 0 }} />
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
              <div className="skel skel-eyebrow" style={{ width: 120 }} />
              <div className="skel skel-title" style={{ width: "min(420px, 60%)" }} />
              <div className="skel skel-line" style={{ width: "min(320px, 50%)" }} />
              <div className="mt-2 flex gap-3">
                <div className="skel skel-pill" style={{ width: 110 }} />
                <div className="skel skel-pill" style={{ width: 90 }} />
                <div className="skel skel-pill" style={{ width: 80 }} />
              </div>
            </div>
          </div>
        </div>

        {/* 4-up KPI strip */}
        <KpiSkeleton count={4} />

        {/* Occupancy bar card */}
        <CardSkeleton height={80} />

        {/* Two-column body */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={6} />
          </div>
          <div className="space-y-6">
            <CardSkeleton lines={4} />
            <CardSkeleton lines={6} />
          </div>
        </div>
      </div>
    </div>
  );
}
