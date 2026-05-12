import {
  PageSkeleton,
  KpiSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

export default function HotelsLoading() {
  return (
    <PageSkeleton>
      <KpiSkeleton count={4} />
      <TableSkeleton rows={6} cols={6} caption />
      <TableSkeleton rows={5} cols={7} caption />
    </PageSkeleton>
  );
}
