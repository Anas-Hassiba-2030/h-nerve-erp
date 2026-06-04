import "server-only";
import { prisma } from "@/lib/db";
import { supplyAnalytics, type ExportAnalytics } from "@/lib/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderSupplyChain(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "سلسلة التوريد التنبؤية — جسر AI" : "Predictive Supply Chain — AI Bridge";
  const fc = await prisma.supplyForecast.findMany({
    where: { deletedAt: null },
    orderBy: { periodStart: "asc" },
    include: { source: true, target: true },
  });
  const analytics = supplyAnalytics(fc as any);
  const recordCount = fc.length;
  const subtitle = ar
    ? `${fc.length} تنبؤ · متوسط ثقة ${analytics.kpis.find((k) => k.label_en === "Avg confidence")?.value ?? ""}`
    : `${fc.length} forecasts · ${analytics.kpis.find((k) => k.label_en === "Avg confidence")?.value ?? ""} avg confidence`;
  const html = tableFromRows(
    ar
      ? ["من", "إلى", "فئة", "منتج", "طلب", "وحدة", "ثقة", "فترة", "حالة"]
      : ["From", "To", "Category", "Product", "Demand", "Unit", "Confidence", "Period", "Status"],
    fc.map((f) => [
      { v: f.source.name },
      { v: f.target.name },
      { v: f.category },
      { v: f.productLabel },
      { v: NUM(f.predictedDemand), num: true },
      { v: f.unit },
      { v: (f.confidence * 100).toFixed(0) + "%", num: true },
      { v: `${f.periodStart.toISOString().slice(0, 10)} → ${f.periodEnd.toISOString().slice(0, 10)}`, num: true },
      { v: f.status },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
