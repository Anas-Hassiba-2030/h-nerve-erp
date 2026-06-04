// /brain/self-tuning/[id] — single self-tuning report.
//
// The brain reads its own performance and writes a paragraph about itself.
// User approves or rejects. On approve, weights commit + IQ ticks up.
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import "../../../daylight.css";
import { DiffLog, type DiffEntry } from "@/components/brain/DiffLog";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { approveReport, rejectReport } from "../../iq/actions";

const STATUS_TONE: Record<string, "success" | "warn" | "critical" | "info" | "neutral"> = {
  DRAFT: "warn",
  APPROVED: "success",
  REJECTED: "critical",
  AUTO_APPLIED: "info",
};
const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: "مسودّة بانتظار المراجعة", en: "Draft — pending review" },
  APPROVED: { ar: "مُطبَّقة", en: "Applied" },
  REJECTED: { ar: "مرفوضة", en: "Rejected" },
  AUTO_APPLIED: { ar: "تطبيق تلقائي", en: "Auto-applied" },
};

export default async function SelfTuningReportDetail({
  params,
}: {
  params: { id: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const r = await prisma.selfTuningReport.findUnique({ where: { id: params.id } });
  if (!r) notFound();

  let observations: string[] = [];
  try { observations = JSON.parse(r.observationsJson); } catch { /* */ }
  let adjustments: DiffEntry[] = [];
  try { adjustments = JSON.parse(r.proposedAdjustmentsJson); } catch { /* */ }

  const statusLabel = ar ? STATUS_LABEL[r.status]?.ar : STATUS_LABEL[r.status]?.en;
  const isDraft = r.status === "DRAFT";
  const finalIQ = r.iqAfterApplied ?? r.iqAfterIfApplied;
  const delta = finalIQ - r.iqBefore;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · تقرير ضبط ذاتي" : "Brain · Self-tuning report"}
        title={
          ar
            ? `تأمّل ${new Intl.DateTimeFormat("ar-JO-u-nu-latn", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(r.ranAt)}`
            : `Reflection · ${new Intl.DateTimeFormat("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(r.ranAt)}`
        }
        subtitle={
          ar
            ? `نافذة ${r.windowDays} يوماً · ${adjustments.length} تعديل مقترح`
            : `${r.windowDays}-day window · ${adjustments.length} proposed adjustment${adjustments.length === 1 ? "" : "s"}`
        }
      />

        {/* Top rail */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/brain/self-tuning"
            className="inline-flex items-center gap-2"
            style={{
              fontFamily:
                "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--gold)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
            {ar ? "كل التقارير" : "All reports"}
          </Link>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
            {statusLabel}
          </span>
        </div>

        {/* IQ before / after panel */}
        <section
          className="panel reveal"
          style={{ overflow: "hidden", position: "relative" }}
        >
          <div className="px-6 py-7 md:px-9 md:py-9 grid gap-6 md:grid-cols-3 md:items-center">
            <IQBlock
              label={ar ? "قبل" : "Before"}
              value={r.iqBefore}
              tone="neutral"
            />
            <div className="text-center" style={{ color: "var(--ink-muted)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "var(--gold)",
                }}
              >
                {ar ? "التغيّر" : "Δ"}
              </div>
              <div
                className="font-display-latin"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: "clamp(48px, 6vw, 80px)",
                  lineHeight: 1,
                  fontWeight: 500,
                  letterSpacing: "-0.04em",
                  color:
                    delta > 0
                      ? "var(--emerald)"
                      : delta < 0
                        ? "var(--brick)"
                        : "var(--ink-muted)",
                  marginTop: 8,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {delta >= 0 ? "+" : ""}
                {delta}
              </div>
            </div>
            <IQBlock
              label={
                isDraft
                  ? ar ? "متوقّع بعد التطبيق" : "Projected if approved"
                  : ar ? "بعد" : "After"
              }
              value={finalIQ}
              tone={delta >= 0 ? "pos" : "neg"}
            />
          </div>
        </section>

        {/* The editorial — the brain talking about itself */}
        {r.editorialEn ? (
          <section
            style={{
              background: "var(--cream)",
              border: "1px solid var(--line)",
              padding: "26px clamp(20px, 4vw, 36px)",
              maxWidth: 820,
              position: "relative",
            }}
          >
            <span
              aria-hidden
              className="absolute"
              style={{
                top: 0,
                insetInlineStart: 0,
                width: 3,
                bottom: 0,
                background: "var(--gold)",
              }}
            />
            <div
              className="ms-2"
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--gold)",
                marginBottom: 14,
              }}
            >
              {ar ? "الدماغ يكتب عن نفسه" : "The brain on itself"}
            </div>
            <p
              className="ms-2"
              style={{
                fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                fontSize: "clamp(15.5px, 1.3vw, 19px)",
                lineHeight: 1.7,
                letterSpacing: "-0.005em",
                color: "var(--ink)",
                maxWidth: "65ch",
                fontStyle: "italic",
              }}
            >
              {ar && r.editorialAr ? r.editorialAr : r.editorialEn}
            </p>
          </section>
        ) : null}

        {/* Observations */}
        {observations.length > 0 ? (
          <section>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--gold)",
                marginBottom: 12,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 1.5,
                  background: "var(--gold)",
                }}
              />
              {ar ? "ما لاحظتُه" : "What I noticed"}
            </div>
            <ul className="space-y-2">
              {observations.map((o, i) => (
                <li
                  key={i}
                  className="px-4 py-3"
                  style={{
                    background: "var(--ivory)",
                    border: "1px solid var(--line)",
                    fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    color: "var(--ink-muted)",
                    maxWidth: "75ch",
                  }}
                >
                  <span
                    style={{
                      fontFamily:
                        "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      color: "var(--gold)",
                      marginInlineEnd: 10,
                      verticalAlign: "middle",
                    }}
                  >
                    OBS {String(i + 1).padStart(2, "0")}
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Diff log */}
        <section>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: "var(--gold)",
              marginBottom: 12,
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 18,
                height: 1.5,
                background: "var(--gold)",
              }}
            />
            {ar ? "ما أقترح تغييره" : "What I propose to change"}
          </div>
          <DiffLog
            entries={adjustments}
            ar={ar}
            applied={r.status === "APPROVED" || r.status === "AUTO_APPLIED"}
          />
        </section>

        {/* Approve / reject footer */}
        {isDraft ? (
          <section
            className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
            style={{
              background: "var(--ivory)",
              border: "1px solid var(--line)",
              padding: "16px 20px",
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--ink-muted)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              {ar
                ? "إذا وافقت، سأطبّق هذه التعديلات على أوزاني وأسجّل لقطة جديدة في مسار الذكاء."
                : "If you approve, I'll commit these adjustments to my weights and snap a new IQ point on the trajectory."}
            </p>
            <form action={rejectReport}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="dl-btn dl-btn-secondary">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "رفض" : "Reject"}
              </button>
            </form>
            <form action={approveReport}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="dl-btn dl-btn-primary">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                {ar ? "إقرار وتطبيق" : "Approve & apply"}
              </button>
            </form>
          </section>
        ) : null}
    </DaylightShell>
  );
}

function IQBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pos" | "neg" | "neutral";
}) {
  const color =
    tone === "pos"
      ? "var(--emerald)"
      : tone === "neg"
        ? "var(--brick)"
        : "var(--ink)";
  return (
    <div className="text-center">
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".1em",
          color: "var(--ink-muted)",
        }}
      >
        {label}
      </div>
      <div
        className="font-display-latin"
        style={{
          fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
          fontSize: "clamp(48px, 7vw, 92px)",
          lineHeight: 1,
          fontWeight: 500,
          letterSpacing: "-0.04em",
          color,
          marginTop: 8,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}
