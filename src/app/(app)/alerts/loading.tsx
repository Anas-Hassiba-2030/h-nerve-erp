import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors /alerts: PageHeader, action rail, the 4-up KPI band, then the
// alert-rule cards in a two-column grid.
export default function AlertsLoading() {
  return (
    <PageSkeleton>
      {/* Action rail */}
      <div className="flex items-center justify-between gap-3">
        <div className="skel" style={{ width: 160, height: 12 }} />
        <div className="skel" style={{ width: 140, height: 32 }} />
      </div>
      <KpiSkeleton count={4} />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} lines={5} />
        ))}
      </div>
    </PageSkeleton>
  );
}
