import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
} from "@/components/skeletons";

export default function AppLoading() {
  return (
    <PageSkeleton>
      <KpiSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </PageSkeleton>
  );
}
