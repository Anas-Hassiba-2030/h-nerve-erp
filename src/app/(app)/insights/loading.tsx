import {
  PageSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Matches the Insights rhythm: Heritage hero plinth (headline + 4-up KPI
// row inside the hero), anomaly section, then a 2-col grid of insight cards.
export default function InsightsLoading() {
  return (
    <PageSkeleton>
      {/* Heritage hero — headline + KPI band live in the same plinth on the
          real page, so we render them as one tall block to avoid a jump. */}
      <div className="space-y-0">
        <CardSkeleton height={200} showHeader={false} />
        <div className="grid grid-cols-2 md:grid-cols-4 border-t" style={{ borderColor: "var(--line)" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-6 md:px-8 md:py-7 space-y-2.5" style={{ borderInlineStart: i > 0 ? "1px solid var(--line)" : undefined, background: "var(--cream)" }}>
              <div className="skel" style={{ width: "55%", height: 10 }} />
              <div className="skel skel-title" style={{ width: "62%" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly section */}
      <CardSkeleton lines={6} />

      {/* Insight feed — 2-col grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={5} />
        ))}
      </div>
    </PageSkeleton>
  );
}
