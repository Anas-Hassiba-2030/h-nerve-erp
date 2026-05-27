import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors /alerts: PageHeader, the 4-up metric band, then the alert-rule
// cards in a two-column grid.
export default function AlertsLoading() {
  return (
    <PageSkeleton>
      <KpiSkeleton count={4} />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={5} />
        ))}
      </div>
    </PageSkeleton>
  );
}
