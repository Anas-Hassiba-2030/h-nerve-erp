import "server-only";
import { prisma } from "@/lib/db/db";
import type { ExportAnalytics } from "@/lib/export/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderEducation(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "برامج الحاضنة" : "Incubator Programs";
  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });
  const recordCount = programs.length;
  const totalFunding = programs.reduce((s, p) => s + p.fundingJod, 0);
  const subtitle = ar
    ? `${programs.length} برنامج · تمويل ${NUM(totalFunding)} د.أ`
    : `${programs.length} programs · ${NUM(totalFunding)} JOD funded`;
  const html = tableFromRows(
    ar
      ? ["البرنامج", "الشركة", "المؤسس", "المجال", "المرحلة", "الدفعة", "التمويل (د.أ)", "الفريق"]
      : ["Program", "Company", "Founder", "Vertical", "Stage", "Cohort", "Funding (JOD)", "Team"],
    programs.map((p) => [
      { v: ar ? p.name : p.nameEn ?? p.name },
      { v: p.company.name },
      { v: p.founder },
      { v: p.vertical },
      { v: p.stage },
      { v: p.cohort },
      { v: NUM(p.fundingJod), num: true },
      { v: NUM(p.teamSize), num: true },
    ]),
  );
  return { title, subtitle, html, analytics: null, recordCount };
}
