import {
  PageSkeleton,
  KpiSkeleton,
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

// Matches the Supply Chain rhythm: AI bridge hero card, KPIs, Sankey-shaped
// chart, table of forecasts.
export default function SupplyChainLoading() {
  return (
    <PageSkeleton>
      <CardSkeleton lines={3} height={140} showHeader={false} />
      <KpiSkeleton count={4} />
      <ChartSkeleton height={320} />
      <TableSkeleton rows={6} cols={7} caption />
    </PageSkeleton>
  );
}
