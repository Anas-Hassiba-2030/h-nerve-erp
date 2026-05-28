import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

// Mirrors /dairy rhythm exactly so the page doesn't jump on hydration:
//   1. PageHeader (PageSkeleton)
//   2. Action rail (eyebrow + buttons)
//   3. 4-up HeriKpi band
//   4. Charts row — product mix (1.5fr) + quality gauge (1fr)
//   5. Recent production batches table
export default function DairyLoading() {
  return (
    <PageSkeleton>
      {/* 2 — action rail */}
      <div className="skel" style={{ height: 36 }} />

      {/* 3 — KPI band */}
      <KpiSkeleton count={4} />

      {/* 4 — charts row */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <CardSkeleton height={260} />
        <CardSkeleton height={260} />
      </div>

      {/* 5 — batches table */}
      <TableSkeleton rows={8} cols={9} caption />
    </PageSkeleton>
  );
}
