import Link from "next/link";
import { FileText, Eye } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber, formatBytes } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true, uploadedBy: true },
    take: 50,
  });

  const totalSize = documents.reduce((a, d) => a + (d.sizeBytes ?? 0), 0);
  const processed = documents.filter((d) => d.status === "PROCESSED").length;
  const pending = documents.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · إدارة المستندات" : "Brain · Document Management"}
        title={ar ? "المستندات" : "Documents"}
        subtitle={ar ? "مكتبة المستندات الذكية مع استخلاص البيانات." : "Smart document library with data extraction."}
        status={`${formatNumber(documents.length)} ${ar ? "مستند" : "docs"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي المستندات" : "Total documents"} value={formatNumber(documents.length)} hint={ar ? "محفوظة" : "stored"} />
        <DaylightKpi label={ar ? "معالجة" : "Processed"} value={formatNumber(processed)} hint={ar ? "مستخلصة" : "extracted"} delta={processed > 0 ? { dir: "up", text: formatNumber(processed) } : undefined} />
        <DaylightKpi label={ar ? "قيد المعالجة" : "Pending"} value={formatNumber(pending)} hint={ar ? "في الانتظار" : "in queue"} />
        <DaylightKpi label={ar ? "الحجم الكلي" : "Total size"} value={`${formatNumber(Math.round(totalSize / 1024 / 1024))} MB`} hint={ar ? "مخزّن" : "stored"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "المكتبة" : "Library"} aside={ar ? "أحدث ٥٠ مستند" : "Latest 50"}>
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title={ar ? "لا توجد مستندات" : "No documents"} description={ar ? "ارفع أول مستند للبدء." : "Upload your first document."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>{ar ? "المستند" : "Document"}</th>
                  <th>{ar ? "الشركة" : "Company"}</th>
                  <th>{ar ? "النوع" : "Type"}</th>
                  <th className="num">{ar ? "الحجم" : "Size"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th>{ar ? "بواسطة" : "By"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{doc.name}</td>
                    <td>{doc.company ? (ar ? doc.company.name : doc.company.nameEn) : "—"}</td>
                    <td style={{ fontSize: 11, textTransform: "uppercase", color: "var(--ink-muted)" }}>{doc.kind ?? "—"}</td>
                    <td className="num" style={{ fontFamily: "monospace", fontSize: 12 }}>{formatBytes(doc.sizeBytes ?? 0)}</td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td style={{ fontSize: 12, color: "var(--ink-muted)" }}>{doc.uploadedBy?.name ?? "—"}</td>
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
