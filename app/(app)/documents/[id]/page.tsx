// /documents/[id] — Single document detail.
//
// Refined / Warm Editorial body. Daylight shell.
// Phase 18 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import "../../daylight.css";

const LINKED_LABEL: Record<string, { ar: string; en: string }> = {
  LORAN: { ar: "لوران الزراعية",       en: "Loran Farms" },
  MAHA:  { ar: "المها للألبان",         en: "Maha Dairy" },
  ARENA: { ar: "أرينا سبيس",           en: "Arena Space" },
  TANK:  { ar: "حاضنة The Tank",       en: "The Tank" },
  GROUP: { ar: "المجموعة",             en: "the Group" },
};

const SEVERITY_TONE: Record<string, "ok" | "gold"> = {
  low:    "ok",
  medium: "gold",
  high:   "gold",
};

function clauseIcon(kind: string) {
  switch (kind) {
    case "risk": return ShieldAlert;
    case "termination": return AlertTriangle;
    case "obligation": return CheckCircle2;
    default: return FileText;
  }
}

export default async function DocumentDetail({ params }: { params: { id: string } }) {
  const locale = getLocale();
  const ar = locale === "ar";

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { extraction: true, clauses: { orderBy: { orderIndex: "asc" } } },
  });
  if (!doc || doc.deletedAt) notFound();

  const fields: Record<string, any> = (() => {
    try { return JSON.parse(doc.extraction?.fieldsJson ?? "{}"); } catch { return {}; }
  })();
  const linked = doc.linkedTo
    ? LINKED_LABEL[doc.linkedTo] ?? { ar: doc.linkedTo, en: doc.linkedTo }
    : null;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "ذكاء المستندات · مستند" : "Document intelligence · Document"}
        title={ar ? doc.title ?? doc.fileName : doc.titleEn ?? doc.fileName}
        subtitle={
          linked
            ? ar
              ? `مرتبط بـ ${linked.ar}`
              : `Linked to ${linked.en}`
            : undefined
        }
      />

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/documents"
          className="inline-flex items-center gap-2"
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase" as const,
            color: "var(--gold)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
          {ar ? "كل المستندات" : "All documents"}
        </Link>
        <span className={`tag ${doc.status === "READY" ? "ok" : "gold"}`}>
          {doc.status === "READY"
            ? ar ? "جاهز" : "Ready"
            : ar ? "قيد القراءة" : "Reading"}
        </span>
      </div>

      {/* Editorial summary block */}
      <article className="di-detail">
        <p className="di-detail-eyebrow">
          {ar ? "خلاصة المُحرّر" : "EDITORIAL SUMMARY"}
          {doc.parsedMs ? <span className="di-detail-ms"> · {doc.parsedMs}ms</span> : null}
        </p>
        <h1 className="di-detail-title">
          {ar ? doc.title ?? doc.fileName : doc.titleEn ?? doc.fileName}
        </h1>
        {doc.extraction?.headline ? (
          <p className="di-detail-headline">
            {ar ? doc.extraction.headline : doc.extraction.headlineEn ?? doc.extraction.headline}
          </p>
        ) : null}

        <div aria-hidden className="di-detail-rule" />

        <p className="di-detail-summary">
          {ar ? doc.summary : doc.summaryEn ?? doc.summary}
        </p>
      </article>

      {/* Phase NS-8 — Document → Graph: the auto-linked entity */}
      {doc.matchedSupplierName || doc.matchedCustomerName ? (
        <DaylightPanel
          title={ar ? "ربط الشبكة" : "Graph link"}
          aside={ar ? "رُبط تلقائياً بكيان" : "Auto-linked to an entity"}
        >
          <div
            className="inline-flex items-center gap-3 px-4 py-3"
            style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8 }}
          >
            <span
              style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}
            >
              {doc.matchedSupplierName ? (ar ? "مورّد" : "Supplier") : (ar ? "عميل" : "Customer")}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              {doc.matchedSupplierName ?? doc.matchedCustomerName}
            </span>
            {doc.matchConfidence != null ? (
              <span
                style={{
                  fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--gold)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {(doc.matchConfidence * 100).toFixed(0)}% {ar ? "تطابق" : "match"}
              </span>
            ) : null}
          </div>
        </DaylightPanel>
      ) : null}

      {/* Extracted fields */}
      {Object.keys(fields).length > 0 ? (
        <DaylightPanel
          title={ar ? "ما استخرجناه من النص" : "What we pulled out of the page"}
          aside={ar ? "حقائق" : "Extracted facts"}
        >
          <dl className="grid gap-3 md:grid-cols-2">
            {Object.entries(fields).slice(0, 16).map(([k, v]) => (
              <div
                key={k}
                className="px-3 py-2"
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                }}
              >
                <dt
                  style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)", marginBottom: 2 }}
                >
                  {prettyKey(k, ar)}
                </dt>
                <dd
                  style={{
                    fontFamily: "'Inter Tight','Inter',system-ui,sans-serif",
                    fontSize: 13.5,
                    color: "var(--ink)",
                    letterSpacing: "0.005em",
                    margin: 0,
                  }}
                >
                  {prettyValue(v)}
                </dd>
              </div>
            ))}
          </dl>
        </DaylightPanel>
      ) : null}

      {/* Clauses */}
      {doc.clauses.length > 0 ? (
        <DaylightPanel
          title={ar ? "ما يستحق انتباهك" : "Worth your attention"}
          aside={ar ? "بنود مهمّة" : "Notable clauses"}
        >
          <ol className="grid gap-3">
            {doc.clauses.map((c) => {
              const Icon = clauseIcon(c.kind);
              return (
                <li
                  key={c.id}
                  className="di-clause is-revealed"
                  data-severity={c.severity}
                  style={{ animation: "none" }}
                >
                  <span className="di-clause-icon">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </span>
                  <div className="di-clause-body">
                    <q className="di-clause-quote">
                      {ar ? c.quote : c.quoteEn ?? c.quote}
                    </q>
                    {c.note ? (
                      <p className="di-clause-note">
                        {ar ? c.note : c.noteEn ?? c.note}
                      </p>
                    ) : null}
                  </div>
                  {c.page ? (
                    <span className="di-clause-page">
                      {ar ? `ص ${c.page}` : `p. ${c.page}`}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </DaylightPanel>
      ) : null}
    </DaylightShell>
  );
}

function prettyKey(k: string, ar: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    parties:        { ar: "الأطراف",         en: "Parties" },
    effectiveDate:  { ar: "تاريخ السريان",    en: "Effective" },
    termMonths:     { ar: "المدة (شهراً)",    en: "Term (months)" },
    autoRenew:      { ar: "تجديد تلقائي",     en: "Auto-renew" },
    noticeDays:     { ar: "مهلة الإخطار",    en: "Notice (days)" },
    totalValue:     { ar: "القيمة الإجمالية", en: "Total value" },
    currency:       { ar: "العملة",           en: "Currency" },
    jurisdiction:   { ar: "الولاية القضائية", en: "Jurisdiction" },
    varietalsCount: { ar: "عدد الأصناف",     en: "Varietals" },
    pricingIndex:   { ar: "مؤشر التسعير",    en: "Pricing index" },
    vendor:         { ar: "المورّد",           en: "Vendor" },
    invoiceNumber:  { ar: "رقم الفاتورة",     en: "Invoice #" },
    issueDate:      { ar: "تاريخ الإصدار",   en: "Issued" },
    dueDate:        { ar: "تاريخ الاستحقاق",  en: "Due" },
    poRef:          { ar: "أمر الشراء",       en: "PO ref" },
    subtotal:       { ar: "قبل الضريبة",      en: "Subtotal" },
    tax:            { ar: "الضريبة",          en: "Tax" },
    total:          { ar: "الإجمالي",         en: "Total" },
    terms:          { ar: "الشروط",           en: "Terms" },
    batchNumber:    { ar: "رقم الدفعة",       en: "Batch #" },
    lab:            { ar: "المختبر",          en: "Lab" },
    reportDate:     { ar: "تاريخ التقرير",   en: "Report date" },
    fatPct:         { ar: "نسبة الدهن (٪)",  en: "Fat %" },
    proteinPct:     { ar: "البروتين (٪)",    en: "Protein %" },
    acidityPct:     { ar: "الحموضة (٪)",     en: "Acidity %" },
    tpcCfuPerMl:    { ar: "TPC (CFU/ml)",     en: "TPC (CFU/ml)" },
    antibiotics:    { ar: "المضادات",         en: "Antibiotics" },
    qualitySpec:    { ar: "المواصفة",         en: "Spec" },
    pass:           { ar: "نتيجة",            en: "Pass" },
    rows:           { ar: "عدد الصفوف",       en: "Rows" },
    cancelled:      { ar: "مُلغى",           en: "Cancelled" },
    sites:          { ar: "الفروع",           en: "Sites" },
    dateFrom:       { ar: "من",               en: "From" },
    dateTo:         { ar: "إلى",              en: "To" },
    grossRevenue:   { ar: "إيراد إجمالي",    en: "Gross revenue" },
  };
  const m = map[k];
  if (m) return ar ? m.ar : m.en;
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
function prettyValue(v: any): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(" · ");
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return v.toLocaleString();
    return String(v);
  }
  return String(v);
}
