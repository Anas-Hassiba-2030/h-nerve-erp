import Link from "next/link";
import { FileText, Eye } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const KIND_LABEL: Record<string, { ar: string; en: string }> = {
  contract: { ar: "عقد", en: "Contract" },
  invoice: { ar: "فاتورة", en: "Invoice" },
  lab_report: { ar: "تقرير مختبر", en: "Lab report" },
  spreadsheet: { ar: "جدول", en: "Spreadsheet" },
  other: { ar: "مستند", en: "Document" },
};

export default async function DocumentsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const documents = await prisma.document.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalSize = documents.reduce((a, d) => a + (d.fileSize ?? 0), 0);
  const ready = documents.filter((d) => d.status === "READY").length;
  const parsing = documents.filter((d) => d.status === "PARSING").length;
  const linked = documents.filter((d) => d.matchedSupplierName || d.matchedCustomerName).length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · ذكاء المستندات" : "Brain · Document Intelligence"}
        title={ar ? "المستندات" : "Documents"}
        subtitle={ar ? "مكتبة المستندات الذكية مع استخلاص البيانات والربط التلقائي بالكيانات." : "Smart document library with extraction and auto-linking to entities."}
        status={`${formatNumber(documents.length)} ${ar ? "مستند" : "docs"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي المستندات" : "Total documents"} value={formatNumber(documents.length)} hint={ar ? "محفوظة" : "stored"} />
        <DaylightKpi label={ar ? "جاهزة" : "Ready"} value={formatNumber(ready)} hint={ar ? "مستخلصة" : "extracted"} delta={ready > 0 ? { dir: "up", text: formatNumber(ready) } : undefined} />
        <DaylightKpi label={ar ? "مرتبطة" : "Linked"} value={formatNumber(linked)} hint={ar ? "مطابقة بكيان" : "entity-matched"} />
        <DaylightKpi label={ar ? "الحجم الكلي" : "Total size"} value={bytes(totalSize)} hint={ar ? "مخزّن" : "stored"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "المكتبة" : "Library"} aside={ar ? "أحدث ٥٠ مستند" : "Latest 50"}>
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title={ar ? "لا توجد مستندات" : "No documents"} description={ar ? "اسحب أي ملف في أي مكان لإضافته." : "Drop any file anywhere to add it."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>{ar ? "المستند" : "Document"}</th>
                  <th>{ar ? "النوع" : "Type"}</th>
                  <th className="num">{ar ? "الحجم" : "Size"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "مطابقة" : "Matched"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{(ar ? doc.title : (doc.titleEn ?? doc.title)) ?? doc.fileName}</td>
                    <td style={{ fontSize: 11, color: "var(--ink-muted)" }}>{ar ? (KIND_LABEL[doc.kind]?.ar ?? doc.kind) : (KIND_LABEL[doc.kind]?.en ?? doc.kind)}</td>
                    <td className="num" style={{ fontFamily: "monospace", fontSize: 12 }}>{bytes(doc.fileSize ?? 0)}</td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td style={{ fontSize: 12, color: "var(--ink-muted)" }}>{doc.matchedSupplierName ?? doc.matchedCustomerName ?? "—"}</td>
                    <td><Link href={`/documents/${doc.id}`} className="dl-btn dl-btn-secondary" style={{ padding: "5px 10px" }}><Eye className="h-3 w-3" />{ar ? "عرض" : "View"}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
