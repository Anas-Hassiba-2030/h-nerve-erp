import "server-only";
import { prisma } from "@/lib/db/db";
import { farmsAnalytics, type ExportAnalytics } from "@/lib/export/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderFarms(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "المزارع والمحاصيل — لوران" : "Farms & Crops — Loran";
  const farms = await prisma.farm.findMany({
    include: { company: true, crops: true },
  });
  const analytics = farmsAnalytics(farms as any);
  const recordCount = farms.length;
  const subtitle = ar
    ? `${farms.length} مزرعة · ${analytics.kpis.find((k) => k.label_en === "Area (du)")?.value ?? ""} دونم`
    : `${farms.length} farms · ${analytics.kpis.find((k) => k.label_en === "Area (du)")?.value ?? ""} dunum`;
  const html = tableFromRows(
    ar
      ? ["مزرعة", "شركة", "نوع", "موقع", "مساحة (دونم)", "حرارة°", "رطوبة%", "تربة%", "تنبيه", "محاصيل"]
      : ["Farm", "Company", "Type", "Location", "Area (du)", "Temp°", "Humidity%", "Soil%", "Alert", "Crops"],
    farms.map((f) => [
      { v: f.name },
      { v: f.company.name },
      { v: f.type },
      { v: f.location },
      { v: NUM(f.areaDunum), num: true },
      { v: f.tempC?.toFixed(1) ?? "—", num: true },
      { v: f.humidity?.toFixed(0) ?? "—", num: true },
      { v: f.soilMoisture?.toFixed(0) ?? "—", num: true },
      { v: f.alertLevel },
      { v: NUM(f.crops.length), num: true },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
