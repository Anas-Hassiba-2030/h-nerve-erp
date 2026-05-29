import { PageSkeleton, CardSkeleton, KpiSkeleton } from "@/components/skeletons";

// Mirrors /brain/graph: PageHeader, 4-up KPI strip, then the CausalStudio
// 12-col split — a tall canvas (9) beside the impact/stat rail (3).
export default function BrainGraphLoading() {
  return (
    <PageSkeleton>
      <KpiSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <div className="skel" style={{ height: 620 }} />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    </PageSkeleton>
  );
}
