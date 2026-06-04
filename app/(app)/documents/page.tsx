import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { prisma } from "@/lib/db/db";
import { formatNumber, formatRelative } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { commitDocument, deleteDocument } from "./actions";
import "../daylight.css";
import "./documents.css";

export const dynamic = "force-dynamic";

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// File extension → glyph (from documents-ops.js `ext`).
function ext(name: string): string {
  const e = (name.split(".").pop() ?? "").toLowerCase();
  const map: Record<string, string> = { pdf: "📕", docx: "📘", xlsx: "📗", png: "🖼", jpg: "🖼", jpeg: "🖼", webp: "🖼" };
  return map[e] ?? "📄";
}

export default async function DocumentsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const documents = await prisma.document.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalSize = documents.reduce((a, d) => a + (d.fileSize ?? 0), 0);
  const ready = documents.filter((d) => d.status === "READY").length;
  const linked = documents.filter((d) => d.matchedSupplierName || d.matchedCustomerName).length;

  // Group by the company / entity the document is linked to (documents-ops.js groups by `co`).
  const uncategorized = ar ? "غير مصنّفة" : "Uncategorized";
  const groups = new Map<string, typeof documents>();
  for (const d of documents) {
    const co = d.matchedSupplierName ?? d.matchedCustomerName ?? d.linkedTo ?? uncategorized;
    (groups.get(co) ?? groups.set(co, []).get(co)!).push(d);
  }

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb"><span className="tick" />{ar ? "الذكاء التشغيلي" : "Operational intelligence"}</span>
            <h1>{ar ? "الوثائق" : "Documents"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "يقرأ الدماغ وثائق الأعمال ويستخلص منها الإشارات. أفلت ملفاتك هنا — مجمّعةً حسب الشركة."
              : "The brain reads business documents and extracts signals. Drop your files here — grouped by company."}
          </div>
        </div>

        <div className="br-kpis">
          <div className="br-kpi"><div className="v">{formatNumber(documents.length)}</div><div className="k">{ar ? "إجمالي المستندات" : "Total documents"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(ready)}</div><div className="k">{ar ? "جاهزة" : "Ready"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(linked)}</div><div className="k">{ar ? "مرتبطة" : "Linked"}</div></div>
          <div className="br-kpi"><div className="v">{bytes(totalSize)}</div><div className="k">{ar ? "الحجم الكلي" : "Total size"}</div></div>
        </div>

        <div className="dz">
          <div className="ic">⬆</div>
          <div className="t">{ar ? "أفلت الملفات في أي مكان لإضافتها" : "Drop files anywhere to add them"}</div>
          <div className="s">{ar ? "PDF · DOCX · XLSX · صور · حتى ٢٥ ميغابايت" : "PDF · DOCX · XLSX · images · up to 25 MB"}</div>
        </div>

        <div id="groups">
          {documents.length === 0 ? (
            <div className="br-panel">
              <EmptyState
                icon={FileText}
                title={ar ? "لا توجد مستندات" : "No documents"}
                description={ar ? "اسحب أي ملف في أي مكان لإضافته." : "Drop any file anywhere to add it."}
              />
            </div>
          ) : (
            Array.from(groups.entries()).map(([co, docs]) => (
              <div className="doc-group" key={co}>
                <h3>{co} <span className="ct">{formatNumber(docs.length)} {ar ? "وثيقة" : "docs"}</span></h3>
                {docs.map((d) => {
                  const name = (ar ? d.title : (d.titleEn ?? d.title)) ?? d.fileName;
                  const committed = d.status === "READY";
                  const meta = `${(d.fileName.split(".").pop() ?? "").toUpperCase()} · ${bytes(d.fileSize ?? 0)} · ${formatRelative(d.createdAt, lc)}`;
                  return (
                    <div className="doc" key={d.id}>
                      <span className="fic">{ext(d.fileName)}</span>
                      <div className="dt">
                        <div className="dn">{name}</div>
                        <div className="dm">{meta}{committed ? (ar ? " · مُعتمد" : " · committed") : (ar ? " · بانتظار الاعتماد" : " · pending")}</div>
                      </div>
                      {committed ? (
                        <form action={commitDocument}>
                          <input type="hidden" name="id" value={d.id} />
                          <button type="submit" className="br-btn br-btn-ghost">{ar ? "ناقش مع الدماغ" : "Discuss with brain"}</button>
                        </form>
                      ) : (
                        <form action={commitDocument}>
                          <input type="hidden" name="id" value={d.id} />
                          <button type="submit" className="br-btn br-btn-primary">{ar ? "اعتمد" : "Commit"}</button>
                        </form>
                      )}
                      <DeleteButton
                        action={deleteDocument}
                        payload={{ id: d.id }}
                        label={ar ? `حذف "${name}"؟` : `Delete "${name}"?`}
                        softDelete
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
