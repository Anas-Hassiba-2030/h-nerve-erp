import { PageSkeleton, CardSkeleton } from "@/components/skeletons";

// Mirrors /brain/graph: PageHeader, then the CausalStudio 12-col split —
// a tall canvas (9) beside the impact/stat rail (3).
export default function BrainGraphLoading() {
  return (
    <PageSkeleton>
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
