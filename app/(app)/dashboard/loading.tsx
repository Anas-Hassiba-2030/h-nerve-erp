import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
  ChartSkeleton,
} from "@/components/skeletons";

// Mirrors the real dashboard rhythm: hero strip + KPI row + revenue trend +
// company contribution + 2-column intel + bottom rail. Keeps layout stable
// while the cross-company data fetches resolve.
export default function DashboardLoading() {
  return (
    <PageSkeleton withMetrics>
      {/* Hero / company strip */}
      <CardSkeleton lines={2} height={120} showHeader={false} />

      {/* KPI strip */}
      <KpiSkeleton count={4} />

      {/* Revenue trend chart */}
      <ChartSkeleton height={260} />

      {/* Two-column intelligence rail */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>

      {/* Calendar + activity bottom rail */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </PageSkeleton>
  );
}
