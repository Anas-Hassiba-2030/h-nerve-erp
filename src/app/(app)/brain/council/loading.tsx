import { PageSkeleton, CardSkeleton, KpiSkeleton } from "@/components/skeletons";

// Mirrors /brain/council: PageHeader, the convene hero plinth, 4-up KPI
// strip, operator-shares section, then the list of past council sessions.
export default function BrainCouncilLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton height={220} showHeader={false} />
      <KpiSkeleton count={4} />
      <CardSkeleton lines={4} />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 64 }} />
        ))}
      </div>
    </PageSkeleton>
  );
}
