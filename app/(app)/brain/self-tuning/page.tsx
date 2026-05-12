// /brain/self-tuning — list every self-tuning report.
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { ChevronLeft, Cpu } from "lucide-react";

const STATUS_TONE: Record<string, "success" | "warn" | "critical" | "info" | "neutral"> = {
  DRAFT:        "warn",
  APPROVED:     "success",
  REJECTED:     "critical",
  AUTO_APPLIED: "info",
};
const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT:        { ar: "بانتظار المراجعة", en: "Pending review" },
  APPROVED:     { ar: "مُطبَّقة",          en: "Applied" },
  REJECTED:     { ar: "مرفوضة",            en: "Rejected" },
  AUTO_APPLIED: { ar: "تطبيق تلقائي",      en: "Auto-applied" },
};

export default async function SelfTuningIndex() {
  const locale = getLocale();
  const ar = locale === "ar";

  const reports = await prisma.selfTuningReport.findMany({
    where: { scope: "default" },
    orderBy: { ranAt: "desc" },
    take: 60,
  });

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · ضبط ذاتي" : "Brain · Self-tuning"}
        title={ar ? "كيف أُعدّل نفسي" : "How I tune myself"}
        subtitle={
          ar
            ? "كل أسبوع، أراجع أدائي وأقترح تعديلات على أوزاني. أنت تُقرّ. أنا أتغيّر."
            : "Every week, I read my own performance and propose adjustments to my own weights. You approve. I change."
        }
      />

      <PageContainer>
        {reports.length === 0 ? (
          <HeritageSection
            eyebrow={ar ? "لا تأمّلات بعد" : "No reflections yet"}
            title={ar ? "ابدأ التأمّل" : "Start reflecting"}
            aside={
              ar
                ? "اذهب إلى /brain/iq واضغط «تأمّل الآن»."
                : "Head to /brain/iq and press 'Reflect now'."
            }
          >
            <Link href="/brain/iq" className="heri-btn heri-btn-primary">
              <Cpu className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "إلى الذكاء" : "Open Brain IQ"}
            </Link>
          </HeritageSection>
        ) : (
          <div className="grid gap-3">
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} ar={ar} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function ReportRow({ report, ar }: { report: any; ar: boolean }) {
  const tone = STATUS_TONE[report.status] ?? "neutral";
  const label = ar ? STATUS_LABEL[report.status]?.ar : STATUS_LABEL[report.status]?.en;
  let observations: string[] = [];
  try { observations = JSON.parse(report.observationsJson); } catch { /* */ }
  let adjCount = 0;
  try { adjCount = JSON.parse(report.proposedAdjustmentsJson).length; } catch { /* */ }
  const accent =
    report.status === "APPROVED" ? "var(--heri-teal)"
      : report.status === "DRAFT" ? "var(--heri-ochre)"
      : report.status === "REJECTED" ? "var(--heri-terracotta)"
      : "var(--heri-copper)";
  const delta = (report.iqAfterApplied ?? report.iqAfterIfApplied) - report.iqBefore;

  return (
    <Link
      href={`/brain/self-tuning/${report.id}`}
      className="heri-focusable group relative block transition"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        textDecoration: "none",
        color: "var(--heri-ink)",
        padding: "16px 20px",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{ insetInlineStart: 0, width: 3, background: accent }}
      />
      <div className="ms-2 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div className="min-w-0">
          <div className="heri-eyebrow heri-eyebrow-ink inline-flex items-center gap-2 flex-wrap">
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(report.ranAt).toUpperCase()}
            </span>
            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
            <span>{report.windowDays}{ar ? " يوماً" : "d"}</span>
            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
            <span style={{ color: accent }}>
              {adjCount} {ar ? "تعديل" : adjCount === 1 ? "change" : "changes"}
            </span>
          </div>
          {observations[0] ? (
            <p
              className={ar ? "mt-2" : "font-display-latin mt-2"}
              style={{
                fontSize: 14.5,
                fontWeight: 500,
                letterSpacing: ar ? 0 : "-0.01em",
                color: "var(--heri-ink)",
                lineHeight: 1.45,
                maxWidth: "55ch",
              }}
            >
              {observations[0]}
            </p>
          ) : null}
        </div>
        <div
          className="text-end"
          style={{
            fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
            color: delta >= 0 ? "var(--heri-teal)" : "var(--heri-terracotta)",
          }}
        >
          <div
            className="heri-eyebrow heri-eyebrow-ink"
            style={{ fontSize: 10 }}
          >
            {ar ? "تغيّر الذكاء" : "IQ delta"}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HeritagePill tone={tone}>{label}</HeritagePill>
          <ChevronLeft
            className="h-4 w-4 transition rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
            style={{ color: "var(--heri-copper)" }}
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Link>
  );
}
