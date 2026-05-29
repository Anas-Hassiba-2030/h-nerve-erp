import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

// Mirrors /education: PageHeader, the brand hero panel, the 4-up metric band,
// then the program cards grid.
export default function EducationLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton height={250} showHeader={false} />
      <KpiSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} lines={5} />
        ))}
      </div>
    </PageSkeleton>
  );
}
