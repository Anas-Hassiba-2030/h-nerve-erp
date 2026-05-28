import { PageSkeleton, CardSkeleton } from "@/components/skeletons";

// Mirrors /insights/[id]: PageHeader, back rail, Heritage hero plinth (single
// severity rail), then 2-col grid — body + related on the left, author +
// meta on the right.
export default function InsightDetailLoading() {
  return (
    <PageSkeleton withActions={false}>
      {/* Back rail */}
      <div className="flex items-center justify-between gap-3">
        <div className="skel" style={{ width: 160, height: 14 }} />
        <div className="skel" style={{ width: 96, height: 28 }} />
      </div>

      {/* Heritage hero plinth */}
      <CardSkeleton height={180} showHeader={false} />

      {/* 2-col grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={5} />
        </div>
        <div className="space-y-6">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    </PageSkeleton>
  );
}
