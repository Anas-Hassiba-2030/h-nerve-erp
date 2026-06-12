import "server-only";
import { prisma } from "@/lib/db/db";
import { projectsAnalytics, type ExportAnalytics } from "@/lib/export/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderProjects(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "خط الأنابيب — المشاريع المستقبلية" : "Pipeline — Future Projects";
  const projs = await prisma.futureProject.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { company: true },
  });
  const analytics = projectsAnalytics(projs as any);
  const recordCount = projs.length;
  const subtitle = ar
    ? `${projs.length} مشروع · ${analytics.kpis.find((k) => k.label_en === "Total budget")?.value ?? ""}`
    : `${projs.length} projects · ${analytics.kpis.find((k) => k.label_en === "Total budget")?.value ?? ""}`;
  const html = tableFromRows(
    ar
      ? ["شركة", "عنوان", "مرحلة", "أولوية", "ميزانية", "بدء", "هدف", "تقدم", "مالك"]
      : ["Company", "Title", "Stage", "Priority", "Budget", "Start", "Target", "Progress", "Owner"],
    projs.map((p) => [
      { v: p.company.name },
      { v: p.title },
      { v: p.stage },
      { v: p.priority },
      { v: NUM(p.budgetJod), num: true },
      { v: p.startQuarter ?? "—" },
      { v: p.targetQuarter ?? "—" },
      { v: p.progressPct.toFixed(0) + "%", num: true },
      { v: p.ownerName ?? "—" },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
