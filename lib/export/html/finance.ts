import "server-only";
import { prisma } from "@/lib/db";
import { financeAnalytics, type ExportAnalytics } from "@/lib/exportAnalytics";
import { tableFromRows, NUM } from "./shell";

export async function renderFinance(ar: boolean): Promise<{
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
}> {
  const title = ar ? "المركز المالي — المعاملات" : "Finance — Transactions";
  const tx = await prisma.transaction.findMany({
    orderBy: { occurredAt: "desc" },
    include: { company: true, createdBy: true },
    take: 500,
  });
  const analytics = financeAnalytics(tx as any);
  const recordCount = tx.length;
  const subtitle = ar
    ? `${tx.length} معاملة · ${analytics.kpis.find((k) => k.label_en === "Revenue")?.value ?? ""}`
    : `${tx.length} transactions · ${analytics.kpis.find((k) => k.label_en === "Revenue")?.value ?? ""}`;
  const html = tableFromRows(
    ar
      ? ["مرجع", "تاريخ", "شركة", "نوع", "فئة", "مبلغ", "عملة", "بواسطة"]
      : ["Reference", "Date", "Company", "Kind", "Category", "Amount", "Currency", "By"],
    tx.map((t) => [
      { v: t.reference, num: true },
      { v: t.occurredAt.toISOString().slice(0, 10), num: true },
      { v: t.company.name },
      { v: t.kind },
      { v: t.category },
      { v: NUM(t.amount), num: true },
      { v: t.currency, num: true },
      { v: t.createdBy?.name ?? "—" },
    ]),
  );
  return { title, subtitle, html, analytics, recordCount };
}
