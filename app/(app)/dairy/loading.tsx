import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

// Mirrors /dairy: PageHeader, the brand hero panel, the 4-up metric band,
// a charts row (product mix + quality), then the batches table.
export default function DairyLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton height={250} showHeader={false} />
      <KpiSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
      <TableSkeleton rows={6} cols={6} caption />
    </PageSkeleton>
  );
}
