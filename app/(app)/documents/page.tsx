
export const dynamic = "force-dynamic";
// /documents — Document Intelligence ledger.
//
// Heritage Modern list. Drop anything anywhere on the app to add to it.
// Phase 18 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { ChevronLeft, FileText, ScrollText, Receipt, Beaker, Table, UploadCloud, Link2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";

const KIND_LABEL: Record<string, { ar: string; en: string }> = {
  contract:    { ar: "عقد",         en: "Contract" },
  invoice:     { ar: "فاتورة",      en: "Invoice" },
  lab_report:  { ar: "تقرير مختبر", en: "Lab report" },
  spreadsheet: { ar: "جدول",        en: "Spreadsheet" },
  other:       { ar: "مستند",       en: "Document" },
};
const KIND_ICON: Record<string, any> = {
  contract: ScrollText,
  invoice: Receipt,
  lab_report: Beaker,
  spreadsheet: Table,
  other: FileText,
};

const LINKED_LABEL: Record<string, { ar: string; en: string }> = {
  LORAN: { ar: "لوران الزراعية",       en: "Loran Farms" },
  MAHA:  { ar: "المها للألبان",         en: "Maha Dairy" },
  ARENA: { ar: "أرينا سبيس",           en: "Arena Space" },
  TANK:  { ar: "حاضنة The Tank",       en: "The Tank" },
  GROUP: { ar: "المجموعة",             en: "the Group" },
};

export default async function DocumentsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const docs = await prisma.document.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { clauses: { take: 1 } },
  });
  const total = docs.length;
  const byKind = docs.reduce<Record<string, number>>((m, d) => {
    m[d.kind] = (m[d.kind] ?? 0) + 1;
    return m;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow={ar ? "ذكاء المستندات" : "Document intelligence"}
        title={ar ? "ذكاء المستندات" : "Document intelligence"}
        subtitle={
          ar
            ? "اسحب أي عقد، فاتورة، تقرير مختبر، أو جدول في أي مكان بالتطبيق. نقرؤه، نلخّصه، ونربطه تلقائياً بالمورّد أو العميل في شبكة الكيانات."
            : "Drop any contract, invoice, lab report, or sheet anywhere in the app. We read it, summarize it, and auto-link it to the matching supplier or customer in the entity graph."
        }
      />

      <PageContainer>
        {/* Stat row */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label={ar ? "إجمالي" : "Total"} value={total} />
          {(["contract", "invoice", "lab_report", "spreadsheet"] as const).map((k) => (
            <Stat
              key={k}
              label={ar ? KIND_LABEL[k].ar : KIND_LABEL[k].en}
              value={byKind[k] ?? 0}
            />
          ))}
        </section>

        {/* Active intake panel — the drop zone is mounted globally in the
            (app) layout, so a file dropped ANYWHERE runs uploadDocument.
            This panel states that affordance and what gets extracted. */}
        <section
          className="px-5 py-5"
          style={{
            background: "var(--heri-cream)",
            border: "1px dashed var(--heri-rule-strong)",
          }}
        >
          <div className="flex items-center gap-4">
            <span
              className="inline-flex h-12 w-12 items-center justify-center"
              style={{
                background: "var(--heri-ink)",
                color: "var(--heri-cream)",
              }}
            >
              <UploadCloud className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <div className="flex-1">
              <p
                className="heri-eyebrow heri-eyebrow-ink"
                style={{ fontSize: 10, marginBottom: 4 }}
              >
                {ar ? "اسحب وأفلت — في أي مكان" : "DROP ANYWHERE"}
              </p>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--heri-ink-2)",
                  margin: 0,
                }}
              >
                {ar
                  ? "أفلت ملفاً في أي شاشة. نقرؤه في ثوانٍ، نعرض ملخصاً + البنود المهمّة، ونطابق المورّد/العميل تلقائياً بشبكة الكيانات."
                  : "Drop a file on any screen. We read it in seconds, surface a summary + the clauses that matter, and auto-match the supplier/customer into the entity graph."}
              </p>
            </div>
          </div>

          {/* What gets extracted per document kind */}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                Icon: ScrollText,
                titleAr: "العقود",
                titleEn: "Contracts",
                bodyAr: "الأطراف · المدة · القيمة · شروط الإلغاء · بنود المخاطر.",
                bodyEn: "Parties · term · value · cancellation · risk clauses.",
              },
              {
                Icon: Receipt,
                titleAr: "الفواتير",
                titleEn: "Invoices",
                bodyAr: "المورد · الرقم · تاريخ الاستحقاق · المبالغ · ربط تلقائي بالموردين.",
                bodyEn: "Vendor · number · due date · totals · auto-link to suppliers.",
              },
              {
                Icon: Beaker,
                titleAr: "تقارير المختبر",
                titleEn: "Lab reports",
                bodyAr: "المنتج · المعايير · نتائج الاختبار · المطابقة مع المعايير.",
                bodyEn: "Product · parameters · test results · compliance flags.",
              },
            ].map((c, i) => {
              const Icon = c.Icon;
              return (
                <div
                  key={i}
                  className="p-3"
                  style={{
                    background: "var(--heri-cream-2)",
                    border: "1px solid var(--heri-rule)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" style={{ color: "var(--heri-copper)" }} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--heri-ink)",
                      }}
                    >
                      {ar ? c.titleAr : c.titleEn}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: "var(--heri-ink-3)",
                      margin: 0,
                    }}
                  >
                    {ar ? c.bodyAr : c.bodyEn}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ledger */}
        {docs.length === 0 ? (
          <div
            className="px-5 py-10 text-center"
            style={{
              background: "var(--heri-cream-2)",
              border: "1px solid var(--heri-rule)",
              color: "var(--heri-ink-3)",
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            {ar
              ? "لا مستندات بعد — أفلت أول عقد أو فاتورة في أي مكان بالتطبيق وسيظهر هنا فور قراءته."
              : "No documents yet — drop your first contract or invoice anywhere in the app and it'll appear here once read."}
          </div>
        ) : (
          <ol className="grid gap-2">
            {docs.map((d) => {
              const Icon = KIND_ICON[d.kind] ?? FileText;
              const linked = d.linkedTo
                ? LINKED_LABEL[d.linkedTo] ?? { ar: d.linkedTo, en: d.linkedTo }
                : null;
              return (
                <li key={d.id}>
                  <Link
                    href={`/documents/${d.id}`}
                    className="grid items-center gap-4 px-4 py-3 transition heri-focusable"
                    style={{
                      gridTemplateColumns: "auto 1fr auto auto",
                      background: "var(--heri-cream)",
                      border: "1px solid var(--heri-rule)",
                      textDecoration: "none",
                      color: "var(--heri-ink)",
                    }}
                  >
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center"
                      style={{
                        background: "var(--heri-ink)",
                        color: "var(--heri-cream)",
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0">
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          letterSpacing: "-0.005em",
                          color: "var(--heri-ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ar ? d.title ?? d.fileName : d.titleEn ?? d.fileName}
                      </div>
                      <div
                        style={{
                          fontFamily:
                            "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                          fontSize: 10.5,
                          letterSpacing: "0.08em",
                          color: "var(--heri-ink-3)",
                          marginTop: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        {ar ? KIND_LABEL[d.kind].ar : KIND_LABEL[d.kind].en}
                        {linked ? (
                          <>
                            <span style={{ margin: "0 8px", color: "var(--heri-rule-strong)" }}>·</span>
                            <span>{ar ? linked.ar : linked.en}</span>
                          </>
                        ) : null}
                      </div>
                      {/* Phase NS-8 — auto-linked entity chip */}
                      {d.matchedSupplierName || d.matchedCustomerName ? (
                        <div
                          className="inline-flex items-center gap-1.5 mt-1.5"
                          style={{
                            fontSize: 10.5,
                            letterSpacing: "0.04em",
                            color: "var(--heri-copper)",
                            fontWeight: 600,
                          }}
                        >
                          <Link2 className="h-3 w-3" strokeWidth={1.7} />
                          <span>
                            {d.matchedSupplierName
                              ? `${ar ? "مورّد" : "Supplier"}: ${d.matchedSupplierName}`
                              : `${ar ? "عميل" : "Customer"}: ${d.matchedCustomerName}`}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <HeritagePill tone={d.status === "READY" ? "success" : "warn"}>
                      {d.status === "READY"
                        ? ar
                          ? "جاهز"
                          : "Ready"
                        : ar
                        ? "قيد القراءة"
                        : "Reading"}
                    </HeritagePill>
                    <ChevronLeft
                      className="h-3.5 w-3.5 rtl:rotate-180"
                      style={{ color: "var(--heri-ink-3)" }}
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </PageContainer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "12px 14px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className="heri-number mt-1"
        style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.018em" }}
      >
        {value}
      </div>
    </div>
  );
}
