import {
  PageSkeleton,
  KpiSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

// Mirrors /finance: PageHeader, the 4-up metric band, then the P&L /
// transactions tables.
export default function FinanceLoading() {
  return (
    <PageSkeleton>
      <KpiSkeleton count={4} />
      <TableSkeleton rows={6} cols={5} caption />
      <TableSkeleton rows={6} cols={6} caption />
    </PageSkeleton>
  );
}
