import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors /farms rhythm exactly so the page doesn't jump on hydration:
//   1. PageHeader (PageSkeleton)
//   2. Action rail (eyebrow + buttons)
//   3. 4-up HeriKpi band
//   4. Sensor health row (2fr sensor card + 1fr gauge) — when greenhouses exist
//   5. 2-col farm cards grid
export default function FarmsLoading() {
  return (
    <PageSkeleton>
      {/* 2 — action rail */}
      <div className="skel" style={{ height: 36 }} />

      {/* 3 — KPI band */}
      <KpiSkeleton count={4} />

      {/* 4 — sensor health + soil moisture gauge */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardSkeleton height={220} />
        </div>
        <CardSkeleton height={220} />
      </div>

      {/* 5 — farm grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    </PageSkeleton>
  );
}
