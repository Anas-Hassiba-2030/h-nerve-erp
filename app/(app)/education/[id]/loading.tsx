import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors the polished /education/[id] layout section-for-section:
//   1. PageHeader chrome (PageSkeleton)
//   2. Heritage hero strip (cream plinth)
//   3. 3-up KPI band (Funding / Team / Completion)
//   4. Stage progression card
//   5. Two-column grid: overview/related (left) + spec card (right, 320px)
export default function Loading() {
  return (
    <PageSkeleton>
      {/* 2 — hero strip */}
      <CardSkeleton height={140} showHeader={false} />

      {/* 3 — KPI band */}
      <KpiSkeleton count={3} />

      {/* 4 — stage progression */}
      <CardSkeleton lines={3} />

      {/* 5 — two-column body */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={5} />
        </div>
        <CardSkeleton lines={7} />
      </div>
    </PageSkeleton>
  );
}
