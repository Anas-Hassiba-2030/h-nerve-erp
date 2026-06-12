import "server-only";
import { prisma } from "@/lib/db/db";
import type { ExportAnalytics } from "@/lib/export/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderCompanies(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "الشركات — محفظة المجموعة" : "Companies — Group Portfolio";
  const companies = await prisma.company.findMany({ orderBy: { code: "asc" } });
  const recordCount = companies.length;
  const sectors = new Set(companies.map((c) => c.sector)).size;
  const subtitle = ar
    ? `${companies.length} شركة عبر ${sectors} قطاع`
    : `${companies.length} companies across ${sectors} sectors`;
  const html = tableFromRows(
    ar
      ? ["الرمز", "الاسم", "Name (EN)", "القطاع", "المدينة", "الموظفون", "الحالة", "التأسيس"]
      : ["Code", "Name", "Name (AR)", "Sector", "City", "Employees", "Status", "Founded"],
    companies.map((c) => [
      { v: c.code, num: true },
      { v: ar ? c.name : c.nameEn },
      { v: ar ? c.nameEn : c.name },
      { v: c.sector },
      { v: c.city ?? "—" },
      { v: NUM(c.employees), num: true },
      { v: c.status },
      { v: c.foundedYear ? String(c.foundedYear) : "—", num: true },
    ]),
  );
  return { title, subtitle, html, analytics: null, recordCount };
}
