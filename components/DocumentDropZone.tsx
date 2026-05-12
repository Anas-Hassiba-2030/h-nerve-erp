// components/DocumentDropZone.tsx
//
// Global drop overlay + extraction modal.
//
// Phase 18 of docs/PHASES-INTELLIGENCE.md.
//
// Drop any file anywhere on the app. The window darkens, a still
// "Reading the document" frame appears (intentionally no spinner).
// The parser returns and the modal opens with:
//   - The narrator's one-paragraph summary
//   - The extracted fields
//   - The risk/obligation clauses, each "captured" with a hairline
//     ochre highlighter underline as it appears (one at a time)
//   - A single CTA: "Add to {linked-module}'s ledger"
//
// Aesthetic: Heritage Modern shell + Refined/Warm Editorial body.

"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  ScrollText,
  Beaker,
  Receipt,
  Table,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
} from "lucide-react";
import { uploadDocument, type UploadResult } from "@/app/(app)/documents/actions";

const KIND_ICON: Record<string, any> = {
  contract: ScrollText,
  invoice: Receipt,
  lab_report: Beaker,
  spreadsheet: Table,
  other: FileText,
};

const SEVERITY_TONE: Record<string, "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
};

const LINKED_LABEL: Record<string, { ar: string; en: string }> = {
  LORAN: { ar: "لوران الزراعية", en: "Loran Farms" },
  MAHA: { ar: "المها للألبان", en: "Maha Dairy" },
  ARENA: { ar: "أرينا سبيس", en: "Arena Space" },
  TANK: { ar: "حاضنة The Tank", en: "The Tank" },
  GROUP: { ar: "المجموعة", en: "the Group" },
};

function clauseIcon(kind: string) {
  switch (kind) {
    case "risk":
      return ShieldAlert;
    case "termination":
      return AlertTriangle;
    case "obligation":
      return CheckCircle2;
    default:
      return FileText;
  }
}

export function DocumentDropZone({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState<{ name: string; size: number } | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [revealed, setRevealed] = useState(0); // staggered reveal cursor
  const dragCounter = useRef(0);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track drag-enter / leave at the window level. The counter pattern
  // avoids the dragleave-on-children flicker.
  useEffect(() => {
    function onEnter(e: DragEvent) {
      if (!hasFile(e)) return;
      dragCounter.current++;
      if (dragCounter.current === 1) setDragging(true);
    }
    function onLeave(e: DragEvent) {
      if (!hasFile(e)) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setDragging(false);
    }
    function onOver(e: DragEvent) {
      if (!hasFile(e)) return;
      e.preventDefault(); // required to allow drop
    }
    function onDrop(e: DragEvent) {
      if (!hasFile(e)) return;
      e.preventDefault();
      dragCounter.current = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    }
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(
    (file: File) => {
      setReading({ name: file.name, size: file.size });
      const fd = new FormData();
      fd.append("file", file);
      // Wrap in startTransition so the UI keeps responding while we wait.
      startTransition(() => {
        uploadDocument(fd)
          .then((r) => {
            setReading(null);
            setResult(r);
            setRevealed(0);
          })
          .catch((e) => {
            setReading(null);
            setResult(null);
            // eslint-disable-next-line no-console
            console.warn("[docintel] upload failed", e);
          });
      });
    },
    [startTransition],
  );

  // Reveal claims one-at-a-time, ~600ms apart — the "yellow highlighter"
  // moment. Confidence builds as the reader moves down the page.
  useEffect(() => {
    if (!result) return;
    if (revealed >= result.clauses.length + 1) return;
    const id = window.setTimeout(() => setRevealed((n) => n + 1), 620);
    return () => window.clearTimeout(id);
  }, [result, revealed]);

  // ESC closes; Enter on the modal commits.
  useEffect(() => {
    if (!result) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setResult(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  const Arrow = ar ? ArrowLeft : ArrowRight;
  const Icon = result ? KIND_ICON[result.kind] ?? FileText : FileText;
  const linked = result?.linkedTo
    ? LINKED_LABEL[result.linkedTo] ?? { ar: result.linkedTo, en: result.linkedTo }
    : null;

  return (
    <>
      {/* Hidden input so the "Browse instead" path works too */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {/* Drop overlay */}
      {dragging ? (
        <div className="di-drop-overlay" aria-hidden>
          <div className="di-drop-card">
            <span className="di-drop-eyebrow">
              {ar ? "أفلت الملف" : "DROP TO READ"}
            </span>
            <h3 className="di-drop-headline">
              {ar
                ? "سأقرؤه وأكتب لك خلاصته."
                : "I'll read it and write you the summary."}
            </h3>
            <p className="di-drop-hint">
              {ar
                ? "عقود · فواتير · تقارير مختبر · جداول"
                : "Contracts · invoices · lab reports · spreadsheets"}
            </p>
          </div>
        </div>
      ) : null}

      {/* Reading state — intentionally still: no spinner, no progress bar */}
      {reading ? (
        <div className="di-reading" role="status" aria-live="polite">
          <div className="di-reading-card">
            <div className="di-reading-page">
              <span className="di-reading-rule" aria-hidden />
              <span className="di-reading-rule" aria-hidden />
              <span className="di-reading-rule" aria-hidden />
              <span className="di-reading-rule" aria-hidden />
              <span className="di-reading-rule short" aria-hidden />
            </div>
            <p className="di-reading-eyebrow">{ar ? "أقرأ الملف" : "READING"}</p>
            <h3 className="di-reading-name">{reading.name}</h3>
          </div>
        </div>
      ) : null}

      {/* Result modal */}
      {result ? (
        <div
          className="di-modal-root"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResult(null);
          }}
        >
          <article className="di-modal">
            <header className="di-modal-head">
              <div className="di-modal-mark">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                <span>
                  {ar
                    ? kindLabelAr(result.kind)
                    : kindLabelEn(result.kind)}
                </span>
              </div>
              <button
                type="button"
                className="di-modal-close"
                onClick={() => setResult(null)}
                aria-label={ar ? "إغلاق" : "Close"}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </header>

            <div className="di-modal-body">
              <p className="di-modal-eyebrow">
                {ar ? "خلاصة" : "SUMMARY"} ·{" "}
                <span className="di-modal-ms">{result.parsedMs}ms</span>
              </p>
              <h1 className="di-modal-title">
                {ar ? result.title : result.titleEn}
              </h1>
              <p className="di-modal-headline">
                {ar ? result.headline : result.headlineEn}
              </p>

              <p className="di-modal-summary">
                {ar ? result.summary : result.summaryEn}
              </p>

              {Object.keys(result.fields).length > 0 ? (
                <dl className="di-modal-fields">
                  {Object.entries(result.fields)
                    .slice(0, 8)
                    .map(([k, v]) => (
                      <div key={k} className="di-modal-field">
                        <dt>{prettyKey(k, ar)}</dt>
                        <dd>{prettyValue(v)}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}

              {result.clauses.length > 0 ? (
                <section className="di-modal-clauses">
                  <h2 className="di-modal-clauses-head">
                    {ar ? "ما يستحق انتباهك" : "Worth your attention"}
                  </h2>
                  <ol className="di-modal-clause-list">
                    {result.clauses.map((c, i) => {
                      const visible = i < revealed;
                      const ClauseIcon = clauseIcon(c.kind);
                      return (
                        <li
                          key={c.id}
                          className={`di-clause ${visible ? "is-revealed" : ""}`}
                          data-severity={SEVERITY_TONE[c.severity]}
                        >
                          <span className="di-clause-icon">
                            <ClauseIcon className="h-3.5 w-3.5" strokeWidth={1.7} />
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
                </section>
              ) : null}
            </div>

            <footer className="di-modal-foot">
              <button
                type="button"
                className="di-modal-secondary"
                onClick={() => setResult(null)}
              >
                {ar ? "إغلاق" : "Dismiss"}
              </button>
              <button
                type="button"
                className="di-modal-primary"
                disabled={pending}
                onClick={() => {
                  router.push(`/documents/${result.documentId}`);
                  setResult(null);
                }}
              >
                <span>
                  {linked
                    ? ar
                      ? `أضف إلى سجل ${linked.ar}`
                      : `Add to ${linked.en}'s ledger`
                    : ar
                    ? "افتح المستند"
                    : "Open document"}
                </span>
                <Arrow className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </>
  );
}

function hasFile(e: DragEvent): boolean {
  if (!e.dataTransfer) return false;
  const types = e.dataTransfer.types;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "Files") return true;
  }
  return false;
}

function kindLabelAr(k: string): string {
  switch (k) {
    case "contract": return "عقد";
    case "invoice": return "فاتورة";
    case "lab_report": return "تقرير مختبر";
    case "spreadsheet": return "جدول بيانات";
    default: return "مستند";
  }
}
function kindLabelEn(k: string): string {
  switch (k) {
    case "contract": return "CONTRACT";
    case "invoice": return "INVOICE";
    case "lab_report": return "LAB REPORT";
    case "spreadsheet": return "SPREADSHEET";
    default: return "DOCUMENT";
  }
}

function prettyKey(k: string, ar: boolean): string {
  // Fast-path translations for common keys
  const map: Record<string, { ar: string; en: string }> = {
    parties:        { ar: "الأطراف",       en: "Parties" },
    effectiveDate:  { ar: "تاريخ السريان",  en: "Effective" },
    termMonths:     { ar: "المدة (شهراً)",  en: "Term (months)" },
    autoRenew:      { ar: "تجديد تلقائي",   en: "Auto-renew" },
    noticeDays:     { ar: "مهلة الإخطار",  en: "Notice (days)" },
    totalValue:     { ar: "القيمة الإجمالية", en: "Total value" },
    currency:       { ar: "العملة",         en: "Currency" },
    jurisdiction:   { ar: "الولاية القضائية", en: "Jurisdiction" },
    varietalsCount: { ar: "عدد الأصناف",    en: "Varietals" },
    pricingIndex:   { ar: "مؤشر التسعير",   en: "Pricing index" },
    vendor:         { ar: "المورّد",         en: "Vendor" },
    invoiceNumber:  { ar: "رقم الفاتورة",   en: "Invoice #" },
    issueDate:      { ar: "تاريخ الإصدار",  en: "Issued" },
    dueDate:        { ar: "تاريخ الاستحقاق", en: "Due" },
    poRef:          { ar: "أمر الشراء",     en: "PO ref" },
    subtotal:       { ar: "قبل الضريبة",    en: "Subtotal" },
    tax:            { ar: "الضريبة",        en: "Tax" },
    total:          { ar: "الإجمالي",       en: "Total" },
    terms:          { ar: "الشروط",         en: "Terms" },
    batchNumber:    { ar: "رقم الدفعة",     en: "Batch #" },
    lab:            { ar: "المختبر",        en: "Lab" },
    reportDate:     { ar: "تاريخ التقرير",  en: "Report date" },
    fatPct:         { ar: "نسبة الدهن (٪)", en: "Fat %" },
    proteinPct:     { ar: "البروتين (٪)",   en: "Protein %" },
    acidityPct:     { ar: "الحموضة (٪)",    en: "Acidity %" },
    tpcCfuPerMl:    { ar: "TPC (CFU/ml)",   en: "TPC (CFU/ml)" },
    antibiotics:    { ar: "المضادات",       en: "Antibiotics" },
    qualitySpec:    { ar: "المواصفة",       en: "Spec" },
    pass:           { ar: "نتيجة",          en: "Pass" },
    rows:           { ar: "عدد الصفوف",     en: "Rows" },
    cancelled:      { ar: "مُلغى",         en: "Cancelled" },
    sites:          { ar: "الفروع",         en: "Sites" },
    dateFrom:       { ar: "من",             en: "From" },
    dateTo:         { ar: "إلى",            en: "To" },
    grossRevenue:   { ar: "إيراد إجمالي",   en: "Gross revenue" },
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
