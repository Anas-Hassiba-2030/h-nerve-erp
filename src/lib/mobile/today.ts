// lib/mobile/today.ts
//
// The "today" payload. Powers /m — the mobile operations view.
//
// Phase 14 of docs/governance/PHASES-INTELLIGENCE.md: "Single screen — three things
// to know, three things to decide, three things to approve. Each is one tap."
//
// We rank rows from existing tables (AIInsight / Plan / PlanStep /
// WorkflowRun / Integration) into three columns. The ranker is intentionally
// boring — severity → recency. The brain proper does deeper prioritization;
// this surface just needs to show *something useful* without the manager
// having to think.

import { prisma } from "@/lib/db/db";
import type { Prisma } from "@prisma/client";

export type OpsTone = "sage" | "sky" | "blush" | "ochre" | "ink";

export type OpsCard = {
  id: string;
  // Stable row key — section + source + row id, used for React lists and
  // for "dismiss" / "approve" server-action targeting.
  key: string;
  // Source table this came from. Drives action wiring on the detail tap.
  source: "INSIGHT" | "PLAN" | "PLAN_STEP" | "WORKFLOW_RUN" | "INTEGRATION";
  sourceId: string;
  eyebrow: string;
  eyebrowEn: string;
  title: string;
  body: string;
  // The action label on the tap target.
  cta: { ar: string; en: string };
  // Where the tap goes — usually a desktop deep link the manager can also
  // follow on a tablet. The mobile UI shows it inline first.
  href: string;
  // Optional severity-derived urgency. UI uses this to pulse the dot.
  urgent?: boolean;
  // Tint band on the left edge of the card.
  tone: OpsTone;
  // ISO date for sort order on the client.
  whenIso: string;
};

export type TodayPayload = {
  greetingAr: string;
  greetingEn: string;
  // The single-sentence narrator line shown after pull-to-refresh.
  narratorAr: string;
  narratorEn: string;
  know: OpsCard[];
  decide: OpsCard[];
  approve: OpsCard[];
  // Sentinel — when nothing's pending in a column we render a single calm
  // "all clear" card instead of an empty section.
  generatedAt: string;
};

// ---------------------------------------------------------------------------
// Greeting — time-bucketed, bilingual, calm.
// ---------------------------------------------------------------------------
function greetingFor(name: string, hour: number): { ar: string; en: string } {
  if (hour < 5)
    return {
      ar: `لازلت مع النظام يا ${name}`,
      en: `Still up, ${name}.`,
    };
  if (hour < 12)
    return {
      ar: `صباح الخير يا ${name}`,
      en: `Good morning, ${name}.`,
    };
  if (hour < 17)
    return {
      ar: `طاب يومك يا ${name}`,
      en: `Afternoon, ${name}.`,
    };
  if (hour < 21)
    return {
      ar: `مساء الخير يا ${name}`,
      en: `Evening, ${name}.`,
    };
  return {
    ar: `أُغلق اليوم يا ${name}`,
    en: `Closing out, ${name}.`,
  };
}

// ---------------------------------------------------------------------------
// Severity → urgency + tone for the Know column (insights).
// ---------------------------------------------------------------------------
function insightTone(severity: string): { tone: OpsTone; urgent: boolean } {
  switch (severity) {
    case "CRITICAL":
    case "ALERT":
      return { tone: "blush", urgent: true };
    case "WARN":
      return { tone: "ochre", urgent: true };
    case "OPPORTUNITY":
      return { tone: "sage", urgent: false };
    case "INFO":
    default:
      return { tone: "sky", urgent: false };
  }
}

// ---------------------------------------------------------------------------
// Module → arabic/english eyebrow.
// ---------------------------------------------------------------------------
const MODULE_EYEBROW: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "الفنادق",    en: "Hotels" },
  DAIRY:     { ar: "الألبان",    en: "Dairy" },
  FARMS:     { ar: "الزراعة",    en: "Farms" },
  EDUCATION: { ar: "التعليم",    en: "Education" },
  SUPPLY:    { ar: "سلسلة الإمداد", en: "Supply" },
  FINANCE:   { ar: "المالية",    en: "Finance" },
  BRAIN:     { ar: "الدماغ",     en: "Brain" },
};

function moduleEyebrow(mod: string): { ar: string; en: string } {
  return (
    MODULE_EYEBROW[mod] ?? {
      ar: mod.toLowerCase(),
      en: mod.toLowerCase(),
    }
  );
}

// ---------------------------------------------------------------------------
// Build the payload. Reads from many tables; degrades gracefully when a
// section has fewer than 3 items.
// ---------------------------------------------------------------------------
export async function buildTodayPayload(opts: {
  userName: string;
  hour: number;
}): Promise<TodayPayload> {
  // Pulled in parallel — these are independent queries.
  const [insights, draftPlans, blockedSteps, failedRuns, brokenIntegrations] =
    await Promise.all([
      prisma.aIInsight.findMany({
        where: {
          deletedAt: null,
          status: "OPEN",
        },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 6,
      }) as Prisma.PrismaPromise<any[]>,
      prisma.plan.findMany({
        where: { status: "DRAFT" },
        orderBy: { createdAt: "desc" },
        take: 4,
      }) as Prisma.PrismaPromise<any[]>,
      prisma.planStep.findMany({
        where: { status: "BLOCKED" },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { plan: { select: { goal: true } } },
      }) as Prisma.PrismaPromise<any[]>,
      prisma.workflowRun.findMany({
        where: { status: "FAILED" },
        orderBy: { startedAt: "desc" },
        take: 4,
        include: { workflow: { select: { name: true } } },
      }) as Prisma.PrismaPromise<any[]>,
      prisma.integration.findMany({
        where: { status: { in: ["ERROR", "EXPIRED"] } },
        orderBy: { updatedAt: "desc" },
        take: 4,
      }) as Prisma.PrismaPromise<any[]>,
    ]);

  // -------- KNOW --------
  // The 3 most pressing insights, severity then recency.
  // Severity ordering: ALERT < CRITICAL < WARN < OPPORTUNITY < INFO when
  // sorted asc — but in practice we want CRITICAL first, so re-rank below.
  const SEV_RANK: Record<string, number> = {
    CRITICAL: 0,
    ALERT: 1,
    WARN: 2,
    OPPORTUNITY: 3,
    INFO: 4,
  };
  const know: OpsCard[] = insights
    .slice()
    .sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9))
    .slice(0, 3)
    .map((i) => {
      const { tone, urgent } = insightTone(i.severity);
      const eb = moduleEyebrow(i.module);
      return {
        id: i.id,
        key: `INSIGHT:${i.id}`,
        source: "INSIGHT" as const,
        sourceId: i.id,
        eyebrow: eb.ar,
        eyebrowEn: eb.en,
        title: i.title,
        body: i.body,
        cta: { ar: "افتح", en: "Open" },
        href: `/insights`,
        urgent,
        tone,
        whenIso: i.createdAt.toISOString(),
      };
    });

  // -------- DECIDE --------
  // Draft plans waiting to be committed take priority; blocked plan steps
  // fill remaining slots. (A real planner would also surface council
  // sessions awaiting resolution — added later.)
  const decide: OpsCard[] = [
    ...draftPlans.map((p) => ({
      id: p.id,
      key: `PLAN:${p.id}`,
      source: "PLAN" as const,
      sourceId: p.id,
      eyebrow: "خطة جديدة",
      eyebrowEn: "Plan ready",
      title: p.goal,
      body:
        p.rationale?.slice(0, 180) ??
        `الهدف: تحريك ${p.targetMetric} بنسبة ${(p.targetDelta * 100).toFixed(0)}٪.`,
      cta: { ar: "راجع وأقرّ", en: "Review & commit" },
      href: `/plans/${p.id}`,
      urgent: Math.abs(p.targetDelta ?? 0) >= 0.1,
      tone: "ochre" as const,
      whenIso: p.createdAt.toISOString(),
    })),
    ...blockedSteps.map((s) => ({
      id: s.id,
      key: `PLAN_STEP:${s.id}`,
      source: "PLAN_STEP" as const,
      sourceId: s.id,
      eyebrow: "خطوة معلّقة",
      eyebrowEn: "Blocked step",
      title: s.action,
      body:
        s.notes?.slice(0, 180) ??
        `الخطوة موقوفة بانتظار قرار من ${s.ownerRole}.`,
      cta: { ar: "افحص", en: "Investigate" },
      href: `/plans/${s.planId}`,
      urgent: true,
      tone: "blush" as const,
      whenIso: s.createdAt.toISOString(),
    })),
  ].slice(0, 3);

  // -------- APPROVE --------
  // Things that need an explicit yes/no. Failed workflow runs (retry?) +
  // broken integrations (reconnect?). We don't auto-resume anything from
  // the mobile surface — manager taps explicitly.
  const approve: OpsCard[] = [
    ...failedRuns.map((r) => ({
      id: r.id,
      key: `WORKFLOW_RUN:${r.id}`,
      source: "WORKFLOW_RUN" as const,
      sourceId: r.id,
      eyebrow: "خرائط الأتمتة",
      eyebrowEn: "Automation",
      title: r.workflow.name,
      body: `فشل التنفيذ. هل نُعيد المحاولة الآن؟`,
      cta: { ar: "أقرّ الإعادة", en: "Approve retry" },
      href: `/workflows`,
      urgent: true,
      tone: "blush" as const,
      whenIso: r.startedAt.toISOString(),
    })),
    ...brokenIntegrations.map((i) => ({
      id: i.id,
      key: `INTEGRATION:${i.id}`,
      source: "INTEGRATION" as const,
      sourceId: i.id,
      eyebrow: "موصلات",
      eyebrowEn: "Integration",
      title: i.providerKey,
      body:
        i.status === "EXPIRED"
          ? "صلاحية الاتصال انتهت. أعد الربط بضغطة واحدة."
          : `سُجّلت ${i.errorCount} أخطاء. هل نُعيد الاتصال؟`,
      cta: { ar: "أعد الربط", en: "Reconnect" },
      href: `/integrations/${i.providerKey}`,
      urgent: i.status === "ERROR" && i.errorCount > 3,
      tone: "ochre" as const,
      whenIso: i.updatedAt.toISOString(),
    })),
  ].slice(0, 3);

  const greeting = greetingFor(opts.userName, opts.hour);

  // The narrator line — writes itself based on what's surfaced.
  const total = know.length + decide.length + approve.length;
  const narrator = (() => {
    if (total === 0)
      return {
        ar: "كل شيء هادئ. انطلق براحتك.",
        en: "All clear. Take the morning.",
      };
    const urgentCount = [...know, ...decide, ...approve].filter(
      (c) => c.urgent,
    ).length;
    if (urgentCount === 0)
      return {
        ar: `${total} بنود اليوم. لا شيء عاجل.`,
        en: `${total} items today. Nothing urgent.`,
      };
    return {
      ar: `${total} بنود اليوم، ${urgentCount} منها عاجلة.`,
      en: `${total} items today — ${urgentCount} urgent.`,
    };
  })();

  return {
    greetingAr: greeting.ar,
    greetingEn: greeting.en,
    narratorAr: narrator.ar,
    narratorEn: narrator.en,
    know,
    decide,
    approve,
    generatedAt: new Date().toISOString(),
  };
}
