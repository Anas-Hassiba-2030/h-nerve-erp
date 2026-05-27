import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors /farms: PageHeader, the brand hero panel, the 4-up metric band,
// a 3-up summary row, then the per-farm cards grid.
export default function FarmsLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton height={250} showHeader={false} />
      <KpiSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    </PageSkeleton>
  );
}
