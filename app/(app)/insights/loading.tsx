import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Matches the Insights rhythm: gradient hero + KPI strip + grid of insight
// cards. Anomaly panel renders as a wider card.
export default function InsightsLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton lines={2} height={160} showHeader={false} />
      <KpiSkeleton count={4} />
      <CardSkeleton lines={6} />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={4} />
        ))}
      </div>
    </PageSkeleton>
  );
}
