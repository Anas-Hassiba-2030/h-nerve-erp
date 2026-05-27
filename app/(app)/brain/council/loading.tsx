import { PageSkeleton, CardSkeleton } from "@/components/skeletons";

// Mirrors /brain/council: PageHeader, the convene hero plinth, then the
// grid of past council sessions.
export default function BrainCouncilLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton height={150} showHeader={false} />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={4} />
        ))}
      </div>
    </PageSkeleton>
  );
}
