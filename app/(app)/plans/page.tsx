
export const dynamic = "force-dynamic";
// /plans — list every plan, grouped by status. Heritage Modern.
//
// Phase 5 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { ChevronLeft, MessagesSquare, Sparkles, Target, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { pickLocale } from "@/lib/utils";

const STATUS_TONE: Record<string, "success" | "warn" | "critical" | "info" | "neutral"> = {
  ACTIVE: "info",
  DRAFT: "warn",
  DONE: "success",
  ABANDONED: "neutral",
  ROLLED_BACK: "critical",
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT:       { ar: "مسوّدة", en: "Draft" },
  ACTIVE:      { ar: "قيد التنفيذ", en: "Active" },
  DONE:        { ar: "مكتمل", en: "Done" },
  ABANDONED:   { ar: "مُلغى", en: "Abandoned" },
  ROLLED_BACK: { ar: "تراجع", en: "Rolled back" },
};

const METRIC_LABEL: Record<string, { ar: string; en: string }> = {
  revenue:      { ar: "إيراد", en: "Revenue" },
  margin:       { ar: "هامش", en: "Margin" },
  occupancy:    { ar: "إشغال", en: "Occupancy" },
  yield:        { ar: "إنتاج", en: "Yield" },
  expiry_risk:  { ar: "مخاطر الانتهاء", en: "Expiry risk" },
  demand:       { ar: "طلب", en: "Demand" },
  inventory:    { ar: "مخزون", en: "Inventory" },
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const filter = (searchParams.status ?? "").toUpperCase();
  const where = ["DRAFT", "ACTIVE", "DONE", "ABANDONED", "ROLLED_BACK"].includes(filter)
    ? { status: filter }
    : {};

  const [plans, counts] = await Promise.all([
    prisma.plan.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { steps: true } },
        steps: {
          where: { status: "DONE" },
          select: { id: true },
        },
      },
      take: 60,
    }),
    prisma.plan.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count._all;
  const total = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · الخطط" : "Brain · Plans"}
        title={ar ? "الخطط" : "Plans"}
        subtitle={
          ar
            ? "كل إشارة تستحق خطة. كل خطة تستحق متابعة حتى الإغلاق."
            : "Every signal deserves a plan. Every plan deserves to be tracked to closure."
        }
      />

      <PageContainer>
        {/* Status filter rail */}
        <div
          className="flex flex-wrap items-center gap-1.5 px-1 py-3"
          style={{
            borderTop: "1px solid var(--heri-rule)",
            borderBottom: "1px solid var(--heri-rule)",
          }}
        >
          <span className="heri-eyebrow me-2">{ar ? "تصفية" : "Filter"}</span>
          <FilterChip
            href="/plans"
            active={!filter}
            label={ar ? "الكل" : "All"}
            count={total}
          />
          {(["DRAFT", "ACTIVE", "DONE", "ABANDONED"] as const).map((s) => (
            <FilterChip
              key={s}
              href={`/plans?status=${s}`}
              active={filter === s}
              label={ar ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en}
              count={countByStatus[s] ?? 0}
            />
          ))}
        </div>

        {plans.length === 0 ? (
          <HeritageSection
            eyebrow={ar ? "خطط" : "Plans"}
            title={ar ? "لا خطط بعد" : "No plans yet"}
            aside={
              ar
                ? "اطرح سؤالاً على المجلس واختر «توليد خطة» في صفحة الجلسة."
                : "Convene the council on a question, then click 'Generate plan' in the session view."
            }
          >
            <Link href="/brain/council" className="heri-btn heri-btn-primary">
              <MessagesSquare className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "اذهب إلى المجلس" : "Open the council"}
            </Link>
          </HeritageSection>
        ) : (
          <div className="grid gap-3">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} ar={ar} locale={locale} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="heri-focusable inline-flex items-center gap-2 px-3 py-1.5 transition"
      style={{
        background: active ? "var(--heri-ink)" : "var(--heri-cream)",
        border: active ? "1px solid var(--heri-ink)" : "1px solid var(--heri-rule-strong)",
        color: active ? "var(--heri-cream)" : "var(--heri-ink)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        textDecoration: "none",
      }}
    >
      {label}
      <span
        style={{
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
          opacity: 0.7,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count.toLocaleString("en-US")}
      </span>
    </Link>
  );
}

function PlanCard({
  plan,
  ar,
  locale,
}: {
  plan: any;
  ar: boolean;
  locale: string;
}) {
  const tone = STATUS_TONE[plan.status] ?? "neutral";
  const stepsTotal = plan._count.steps as number;
  const stepsDone = (plan.steps as { id: string }[]).length;
  const progress = stepsTotal > 0 ? stepsDone / stepsTotal : 0;
  const accent =
    plan.status === "DONE" ? "var(--heri-teal)"
      : plan.status === "ABANDONED" ? "var(--heri-ink-3)"
      : plan.status === "ROLLED_BACK" ? "var(--heri-terracotta)"
      : plan.status === "ACTIVE" ? "var(--heri-copper)"
      : "var(--heri-ochre)"; // DRAFT
  const m = METRIC_LABEL[plan.targetMetric] ?? { ar: plan.targetMetric, en: plan.targetMetric };
  const negTarget = plan.targetDelta < 0;

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="heri-focusable group relative block transition"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        textDecoration: "none",
        color: "var(--heri-ink)",
        padding: "16px 18px",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{ insetInlineStart: 0, width: 3, background: accent }}
      />
      <div className="ms-2 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {plan.sourceCouncilSessionId
              ? ar ? "من جلسة المجلس" : "From council"
              : plan.sourceInsightId
                ? ar ? "من إشارة" : "From insight"
                : ar ? "خطة مستقلة" : "Standalone"}
          </div>
          <h3
            className={ar ? "mt-2" : "font-display-latin mt-2"}
            style={{
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: ar ? 0 : "-0.012em",
              color: "var(--heri-ink)",
              lineHeight: 1.3,
              textWrap: "balance" as any,
            }}
          >
            {pickLocale(ar, plan.goal, plan.goalEn)}
          </h3>
          <div
            className="mt-2.5 flex flex-wrap items-center gap-2"
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--heri-ink-3)",
            }}
          >
            <span>
              {ar ? "هدف" : "TARGET"}: {ar ? m.ar : m.en} {plan.targetDelta >= 0 ? "+" : ""}
              {(plan.targetDelta * 100).toFixed(0)}%
            </span>
            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
            <span>
              {ar ? "حتى" : "BY"}{" "}
              {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(plan.targetDeadline)}
            </span>
            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
            <span>
              {stepsDone}/{stepsTotal} {ar ? "خطوات" : "STEPS"}
            </span>
          </div>
          {/* Progress hairline */}
          {stepsTotal > 0 ? (
            <div
              className="mt-3 h-px w-full max-w-[480px]"
              style={{ background: "var(--heri-rule)", position: "relative" }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  insetInlineStart: 0,
                  top: -1,
                  height: 3,
                  width: `${Math.round(progress * 100)}%`,
                  background: accent,
                  transition: "width 320ms cubic-bezier(0.25,1,0.5,1)",
                }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3 md:flex-col md:items-end">
          <HeritagePill tone={tone}>
            {ar ? STATUS_LABEL[plan.status]?.ar ?? plan.status : STATUS_LABEL[plan.status]?.en ?? plan.status}
          </HeritagePill>
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
