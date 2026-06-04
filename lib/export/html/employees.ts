import "server-only";
import { prisma } from "@/lib/db/db";
import type { ExportAnalytics } from "@/lib/export/exportAnalytics";
import { tableFromRows } from "./shell";

export async function renderEmployees(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "الفريق — دليل الأشخاص" : "Team — People Directory";
  const people = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });
  const recordCount = people.length;
  const activeCount = people.filter((u) => u.active).length;
  const subtitle = ar
    ? `${people.length} عضو · ${activeCount} نشط`
    : `${people.length} people · ${activeCount} active`;
  const html = tableFromRows(
    ar
      ? ["الاسم", "البريد", "الدور", "المسمى", "الشركة", "نشط"]
      : ["Name", "Email", "Role", "Title", "Company", "Active"],
    people.map((u) => [
      { v: u.name },
      { v: u.email },
      { v: u.role },
      { v: u.title ?? "—" },
      { v: u.company?.name ?? "—" },
      { v: u.active ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No" },
    ]),
  );
  return { title, subtitle, html, analytics: null, recordCount };
}
