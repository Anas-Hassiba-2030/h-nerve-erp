import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors the REAL dashboard rhythm section-for-section so nothing jumps when
// the cross-company fetches resolve:
//   1. PageHeader (PageSkeleton, withMetrics)
//   2. HeritageHero — headline plinth + 4-col KPI band
//   3. Period rail (thin hairline strip)
//   4. Live ticker (thin strip)
//   5. Company strip (wide card)
//   6. Row: Finance | Activity | Alerts (3 cards)
//   7. Row: Tasks | AI Bridge | Calendar (3 cards)
//   8. Today's audit pulse (full-width card) + 8-tile module grid
export default function DashboardLoading() {
  return (
    <PageSkeleton withMetrics>
      {/* 2 — Heritage hero: headline plinth then the 4-up KPI band */}
      <div className="space-y-0">
        <CardSkeleton height={150} showHeader={false} />
        <KpiSkeleton count={4} />
      </div>

      {/* 3 — period selector rail */}
      <div className="skel" style={{ height: 44 }} />

      {/* 4 — live ticker */}
      <div className="skel" style={{ height: 40 }} />

      {/* 5 — per-company strip */}
      <CardSkeleton height={120} showHeader={false} />

      {/* 6 — Finance | Activity | Alerts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>

      {/* 7 — Tasks | AI Bridge | Calendar */}
      <div className="grid gap-5 lg:grid-cols-3">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>

      {/* 8a — today's audit pulse */}
      <CardSkeleton lines={4} />

      {/* 8b — module navigation, 8 hairline tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 84 }} />
        ))}
      </div>
    </PageSkeleton>
  );
}
