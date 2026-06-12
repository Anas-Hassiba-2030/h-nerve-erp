import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

// Mirrors /hotels rhythm so nothing jumps when the cross-property fetches
// resolve:
//   1. PageHeader (PageSkeleton)
//   2. Action rail (thin hairline strip with eyebrow + buttons)
//   3. 4-up HeriKpi band
//   4. Booking density heat map (card)
//   5. 2-col property grid (heri-card rows)
//   6. Recent bookings table
export default function HotelsLoading() {
  return (
    <PageSkeleton>
      {/* 2 — action rail */}
      <div className="skel" style={{ height: 36 }} />

      {/* 3 — KPI band */}
      <KpiSkeleton count={4} />

      {/* 4 — heat map card */}
      <CardSkeleton height={260} />

      {/* 5 — property grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>

      {/* 6 — recent bookings */}
      <TableSkeleton rows={6} cols={9} caption />
    </PageSkeleton>
  );
}
