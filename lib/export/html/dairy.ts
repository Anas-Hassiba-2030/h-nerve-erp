import "server-only";
import { prisma } from "@/lib/db";
import { dairyAnalytics, type ExportAnalytics } from "@/lib/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderDairy(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "إنتاج الألبان — المها" : "Dairy Production — Maha";
  const batches = await prisma.dairyBatch.findMany({
    orderBy: { productionDate: "desc" },
    take: 500,
  });
  const analytics = dairyAnalytics(batches as any);
  const recordCount = batches.length;
  const subtitle = ar
    ? `${batches.length} دفعة · ${analytics.kpis.find((k) => k.label_en === "Output (L)")?.value ?? ""} لتر`
    : `${batches.length} batches · ${analytics.kpis.find((k) => k.label_en === "Output (L)")?.value ?? ""} L`;
  const html = tableFromRows(
    ar
      ? ["دفعة", "منتج", "كمية (لتر)", "جودة", "دهن%", "إنتاج", "صلاحية", "وجهة", "حالة"]
      : ["Batch", "Product", "Quantity (L)", "Quality", "Fat%", "Production", "Expiry", "Destination", "Status"],
    batches.map((b) => [
      { v: b.batchNumber, num: true },
      { v: ar ? b.productAr : b.product },
      { v: NUM(b.quantityLiters), num: true },
      { v: b.qualityGrade },
      { v: b.fatContent.toFixed(1), num: true },
      { v: b.productionDate.toISOString().slice(0, 10), num: true },
      { v: b.expiryDate.toISOString().slice(0, 10), num: true },
      { v: b.destination ?? "—" },
      { v: b.status },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
