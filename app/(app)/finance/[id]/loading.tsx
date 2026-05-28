import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors the polished /finance/[id] layout section-for-section:
//   1. PageHeader chrome (PageSkeleton)
//   2. Heritage hero strip (cream plinth + big amount)
//   3. 3-up KPI band (Revenue / Expenses / Net)
//   4. Two-column body: description + related lists (left, 1fr)
//      + created-by + meta (right, 360px)
export default function Loading() {
  return (
    <PageSkeleton>
      {/* 2 — hero strip */}
      <CardSkeleton height={150} showHeader={false} />

      {/* 3 — KPI band */}
      <KpiSkeleton count={3} />

      {/* 4 — two-column body */}
      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
        <div className="space-y-6">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={6} />
        </div>
      </div>
    </PageSkeleton>
  );
}
