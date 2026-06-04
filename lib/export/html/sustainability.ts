import "server-only";
import { prisma } from "@/lib/db/db";
import { sustainabilityAnalytics, type ExportAnalytics } from "@/lib/export/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderSustainability(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "الاستدامة و ESG" : "Sustainability & ESG";
  const scores = await prisma.sustainabilityScore.findMany({
    orderBy: [{ year: "asc" }, { period: "asc" }],
    include: { company: true },
  });
  const analytics = sustainabilityAnalytics(scores as any);
  const recordCount = scores.length;
  const subtitle = ar
    ? `${scores.length} تقييم عبر شركات المجموعة`
    : `${scores.length} scores across the group`;
  const html = tableFromRows(
    ar
      ? ["شركة", "فترة", "سنة", "بيئي", "اجتماعي", "حوكمة", "شامل", "كربون (طن)", "مياه (م³)", "متجدد %"]
      : ["Company", "Period", "Year", "E", "S", "G", "Overall", "Carbon (t)", "Water (m³)", "Renew %"],
    scores.map((s) => [
      { v: s.company.name },
      { v: s.period },
      { v: s.year.toString(), num: true },
      { v: s.environmentalScore.toFixed(1), num: true },
      { v: s.socialScore.toFixed(1), num: true },
      { v: s.governanceScore.toFixed(1), num: true },
      { v: s.overall.toFixed(1), num: true },
      { v: NUM(s.carbonTons), num: true },
      { v: NUM(s.waterCubicM), num: true },
      { v: s.renewablePct.toFixed(1), num: true },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
