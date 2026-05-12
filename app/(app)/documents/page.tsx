// /documents — Document Intelligence ledger.
//
// Heritage Modern list. Drop anything anywhere on the app to add to it.
// Phase 18 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { ChevronLeft, FileText, ScrollText, Receipt, Beaker, Table, UploadCloud } from "lucide-react";
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
        title={ar ? "كل المستندات في مكان واحد" : "Every document, summarized"}
        subtitle={
          ar
            ? "اسحب أي عقد، فاتورة، تقرير مختبر، أو جدول إلى أي شاشة. نقرأه ونلخّصه ونربطه بالخريطة."
            : "Drop any contract, invoice, lab report, or sheet on any page. We'll read, summarize, and link it to the graph."
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

        {/* Drop hint */}
        <section
          className="flex items-center gap-4 px-5 py-5"
          style={{
            background: "var(--heri-cream)",
            border: "1px dashed var(--heri-rule-strong)",
          }}
        >
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
              {ar ? "كيف نعمل" : "HOW IT WORKS"}
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
                ? "اسحب الملف من سطح المكتب وألقه على نافذة H-Nerve. سنقرؤه في ثوانٍ ونعرض ملخصاً وبنوداً مهمة وزراً يربطه بالسجل المناسب."
                : "Drag a file from your desktop and drop it on the H-Nerve window. We'll read it in seconds and surface a summary, key clauses, and a button to file it under the right ledger."}
            </p>
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
              ? "لا مستندات بعد. أفلِت أوّل ملف لتراه هنا."
              : "Nothing here yet. Drop your first file to see it appear."}
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
