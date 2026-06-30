// planner.live.ts — concrete Planner.
//
// Two entry points:
//   - fromInsight(id):   take an open AIInsight, generate a plan
//   - fromCouncil(id):   take a CouncilSession's recommendation, generate a plan
//
// Both call the same underlying generator (Claude with stub fallback).
//
// The generator returns a structured Plan + Steps. The plan is created in
// DRAFT state. The user reviews and commits — at which point status flips
// to ACTIVE and the system starts watching the target metric.
//
// Phase 5 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import { callLlm, extractJson, llmConfig, plannerModel, type LlmRequest } from "./llm";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type PlanStepDraft = {
  action: string;
  actionEn?: string;
  ownerRole: string;
  durationDays: number;
};

export type PlanDraft = {
  goal: string;
  goalEn?: string;
  rationale: string;
  rationaleEn?: string;
  targetMetric: string;
  targetDelta: number;
  targetDeadlineDays: number; // days from now
  rollbackCondition?: string;
  rollbackConditionEn?: string;
  steps: PlanStepDraft[];
};

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export async function generatePlanFromInsight(insightId: string, locale: "ar" | "en") {
  const insight = await prisma.aIInsight.findUnique({ where: { id: insightId } });
  if (!insight) throw new Error("insight not found");
  const draft = await draftPlan({
    sourceTitle: insight.title,
    sourceBody: insight.body,
    sourceKind: "insight",
    sourceModule: insight.module,
    severity: insight.severity,
    locale,
  });
  return persistPlan(draft, { sourceInsightId: insightId });
}

export async function generatePlanFromCouncil(sessionId: string, locale: "ar" | "en") {
  const session = await prisma.councilSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("council session not found");
  const draft = await draftPlan({
    sourceTitle: session.topic,
    sourceBody: session.recommendation ?? "",
    sourceKind: "council",
    sourceModule: "GROUP",
    severity: "INFO",
    locale,
  });
  return persistPlan(draft, { sourceCouncilSessionId: sessionId });
}

export async function commitPlan(planId: string, userId: string) {
  return prisma.plan.update({
    where: { id: planId },
    data: { status: "ACTIVE", committedAt: new Date(), committedById: userId },
  });
}

export async function abandonPlan(planId: string) {
  return prisma.plan.update({
    where: { id: planId },
    data: { status: "ABANDONED" },
  });
}

export async function completeStep(stepId: string) {
  const step = await prisma.planStep.update({
    where: { id: stepId },
    data: { status: "DONE", completedAt: new Date() },
  });
  // If every step is done, mark the plan complete — but ONLY if the plan is
  // ACTIVE (committed). A never-committed DRAFT must never reach DONE, so we
  // scope the flip with status: "ACTIVE" (updateMany no-ops otherwise).
  const remaining = await prisma.planStep.count({
    where: { planId: step.planId, status: { not: "DONE" } },
  });
  if (remaining === 0) {
    await prisma.plan.updateMany({
      where: { id: step.planId, status: "ACTIVE" },
      data: { status: "DONE", completedAt: new Date() },
    });
  }
  return step;
}

export async function blockStep(stepId: string, note: string | null) {
  return prisma.planStep.update({
    where: { id: stepId },
    data: { status: "BLOCKED", notes: note },
  });
}

// ─────────────────────────────────────────────────────────────────────
// LLM-backed plan drafting
// ─────────────────────────────────────────────────────────────────────

const SYSTEM_EN = `
You are the Planner — the part of an executive ERP intelligence layer that turns insights and council recommendations into ordered, committable action plans.

Every plan you produce has:
- a single-sentence goal
- a 1-paragraph rationale grounded in the source
- a target metric, signed delta, and deadline (days from now)
- 3 to 6 ordered steps, each with an active-voice action, an owner role, and a duration in days
- a rollback condition: a single sentence describing what would cause us to revert

You speak as a senior chief-of-staff. You are specific. You name actual roles and operational moves. You do not pad with motivational language. You do not preface with "as an AI". You do not write motivational headers like "Action plan:" — you write the plan content directly.

Owner roles are short uppercase tokens like PROCUREMENT, OPS_HOTEL, OPS_DAIRY, OPS_FARM, FINANCE, MARKETING, OPS_GROUP.

Respond ONLY with a JSON object of this shape (no surrounding prose, no markdown fences):
{
  "goal": "<single sentence in active voice>",
  "rationale": "<1 short paragraph, 60-110 words>",
  "targetMetric": "<one of: revenue | margin | expiry_risk | occupancy | yield | demand | inventory>",
  "targetDelta": <signed relative change, e.g. -0.5 for halving the risk, +0.12 for +12%>,
  "targetDeadlineDays": <integer, days from now>,
  "rollbackCondition": "<single sentence>",
  "steps": [
    {
      "action": "<active-voice 1-2 sentences>",
      "ownerRole": "<UPPERCASE_ROLE>",
      "durationDays": <integer>
    }
  ]
}
`.trim();

const SYSTEM_AR = `
أنت المُخطّط — الجزء من طبقة ذكاء ERP تحوّل الإشارات وتوصيات المجلس إلى خطط عمل قابلة للتنفيذ.

كل خطة تُنتجها تحتوي:
- هدف بجملة واحدة
- مبرّر بفقرة قصيرة مرتبط بالمصدر
- مؤشر هدف، تغيّر مُوقَّع، ومهلة (بالأيام من اليوم)
- 3 إلى 6 خطوات مُرتّبة، كل منها بفعل في صيغة المعلوم، دور المالك، ومدة بالأيام
- شرط تراجع: جملة واحدة تصف ما يسبّب إلغاء الخطة

تتحدث كرئيس فريق تنفيذي. تكون محدّداً. تذكر أدواراً فعلية وحركات تشغيلية. لا تحشو بكلام تحفيزي. لا تبدأ بـ"بصفتي ذكاءً اصطناعياً". لا تكتب عناوين مثل "خطة العمل:" — اكتب المحتوى مباشرة.

أدوار المالك رموز قصيرة بالحروف الكبيرة الإنجليزية: PROCUREMENT, OPS_HOTEL, OPS_DAIRY, OPS_FARM, FINANCE, MARKETING, OPS_GROUP.

أجب بكائن JSON فقط بنفس الشكل أعلاه (لا نص قبله أو بعده).
`.trim();

async function draftPlan(args: {
  sourceTitle: string;
  sourceBody: string;
  sourceKind: "insight" | "council";
  sourceModule: string;
  severity: string;
  locale: "ar" | "en";
}): Promise<PlanDraft> {
  const isAr = args.locale === "ar";
  const userPrompt = isAr
    ? `المصدر (${args.sourceKind === "council" ? "جلسة مجلس" : "إشارة"}):\nالعنوان: ${args.sourceTitle}\nالنص: ${args.sourceBody}\n\nالخطورة: ${args.severity} · القسم: ${args.sourceModule}\n\nاكتب الخطة الآن.`
    : `Source (${args.sourceKind === "council" ? "council session" : "insight"}):\nTitle: ${args.sourceTitle}\nBody: ${args.sourceBody}\n\nSeverity: ${args.severity} · Module: ${args.sourceModule}\n\nWrite the plan now.`;

  const req: LlmRequest = {
    system: isAr ? SYSTEM_AR : SYSTEM_EN,
    user: userPrompt,
    maxTokens: 1100,
    temperature: 0.55,
    expectJson: true,
    // Fast model — "Generate plan" was the slowest LIVE button (Sonnet, 10s+).
    // Haiku produces this compact JSON plan in ~2-4s; flaky JSON safely falls
    // back to the stub plan. Override via BRAIN_PLANNER_MODEL.
    model: plannerModel(),
  };

  const stub = (_r: LlmRequest) => JSON.stringify(stubPlan(args));
  const res = await callLlm(req, stub);
  const parsed = extractJson<PlanDraft>(res.text);
  if (!parsed) return stubPlan(args);

  // Normalize / clamp.
  return {
    goal: String(parsed.goal ?? "").slice(0, 220),
    rationale: String(parsed.rationale ?? "").slice(0, 1200),
    targetMetric: String(parsed.targetMetric ?? "revenue").toLowerCase(),
    targetDelta: clamp(toNum(parsed.targetDelta) ?? 0, -2, 2),
    targetDeadlineDays: Math.max(1, Math.min(365, Math.round(toNum(parsed.targetDeadlineDays) ?? 14))),
    rollbackCondition: parsed.rollbackCondition ? String(parsed.rollbackCondition).slice(0, 320) : undefined,
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.slice(0, 7).map((s: any) => ({
          action: String(s.action ?? "").slice(0, 320),
          ownerRole: String(s.ownerRole ?? "OPS_GROUP").toUpperCase().slice(0, 32),
          durationDays: Math.max(1, Math.min(120, Math.round(toNum(s.durationDays) ?? 7))),
        }))
      : [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Stub generator — produces a credible 3-5 step plan for any source.
// ─────────────────────────────────────────────────────────────────────

function stubPlan(args: {
  sourceTitle: string;
  sourceBody: string;
  sourceKind: "insight" | "council";
  sourceModule: string;
  severity: string;
  locale: "ar" | "en";
}): PlanDraft {
  const isAr = args.locale === "ar";
  const t = (args.sourceTitle + " " + args.sourceBody).toLowerCase();
  const isDairy = /dairy|milk|cheese|labneh|expir|maha|ألبان|حليب|جبن|لبنة|انتهاء|المها/i.test(t);
  const isFarm = /farm|crop|harvest|moisture|loran|مزرع|محصول|حصاد|رطوبة|لوران/i.test(t);
  const isHotel = /hotel|booking|occupancy|arena|فندق|حجز|إشغال|أرينا/i.test(t);
  const isFinance = /margin|revenue|cost|cash|مال|هامش|إيراد/i.test(t);

  if (isDairy) {
    return {
      goal: isAr
        ? "تثبيت مخزون الألبان قبل نهاية الربع وإغلاق نافذة الانتهاء الوشيك."
        : "Stabilize dairy inventory before quarter-end and close the near-expiry window.",
      rationale: isAr
        ? "دفعتان قاربتا تاريخ الانتهاء وتمثلان ضغطاً مباشراً على الهامش. التحرك الآن يحوّل المخزون إلى إيراد وحماية للعلامة بدلاً من خسارة. الخطة تجمع بين تصريف فوري عبر شريك التوزيع، تحفيز سريع للطلب الداخلي عبر فنادق أرينا، وتعديل نقطة إعادة الطلب لتفادي تكرار المشكلة."
        : "Two batches are 3 days from expiry and represent direct margin pressure. Acting now converts inventory into revenue and brand protection rather than write-off. The plan combines immediate redirection via the distributor, an Arena F&B promo to lift internal pull, and a reorder-point adjustment to prevent recurrence.",
      targetMetric: "expiry_risk",
      targetDelta: -0.6,
      targetDeadlineDays: 14,
      rollbackCondition: isAr
        ? "إذا انخفض هامش المساهمة في الأسبوعين القادمين تحت 12٪، نُلغي خصم F&B ونعود لجدول التوريد السابق."
        : "If contribution margin drops below 12% within 14 days, halt the F&B promo and revert procurement to the prior schedule.",
      steps: [
        {
          action: isAr
            ? "تحويل 1,180 لتر لبنة إلى موزع المها مع تخفيض موسمي 8٪، وإصدار طلب نقل اليوم."
            : "Redirect 1,180L of labneh to the Maha distributor at an 8% seasonal discount; issue the transport order today.",
          ownerRole: "PROCUREMENT",
          durationDays: 2,
        },
        {
          action: isAr
            ? "إطلاق عرض F&B بنسبة 15٪ على الأطباق المعتمدة على الجبنة في فنادق أرينا لمدة 7 أيام."
            : "Launch a 15% F&B promo on cheese-anchored dishes across Arena hotels for 7 days.",
          ownerRole: "OPS_HOTEL",
          durationDays: 7,
        },
        {
          action: isAr
            ? "خفض نقطة إعادة الطلب للدفعات التالية بـ12٪ وإبلاغ التزويد بالقيمة الجديدة."
            : "Lower the next batch reorder point by 12% and broadcast the new value to procurement.",
          ownerRole: "OPS_DAIRY",
          durationDays: 1,
        },
        {
          action: isAr
            ? "مراجعة هامش المساهمة بعد 14 يوماً واتخاذ قرار التراجع إن لزم."
            : "Review contribution margin at 14 days and trigger rollback if conditions are met.",
          ownerRole: "FINANCE",
          durationDays: 14,
        },
      ],
    };
  }

  if (isFarm) {
    return {
      goal: isAr
        ? "إصلاح وضع الرطوبة في الدفيئة الذكية قبل أن ينزلق الحصاد."
        : "Fix the smart greenhouse moisture situation before the harvest slips.",
      rationale: isAr
        ? "الرطوبة عند 29٪ منذ 72 ساعة، أقل بست نقاط من الحد الأدنى. كل يوم تأخير في تعديل الري يُضاف إلى نافذة الحصاد. الخطة تركّز على التشخيص الميداني، تعديل الجدول، وإغلاق حلقة التغذية الراجعة بمتابعة قراءة المستشعر."
        : "Moisture has been at 29% for 72 hours, six points below the floor. Every day of irrigation lag adds to the harvest slip window. The plan centers on a field diagnosis, an irrigation reset, and closing the feedback loop with a sensor-cadence check.",
      targetMetric: "yield",
      targetDelta: +0.08,
      targetDeadlineDays: 10,
      rollbackCondition: isAr
        ? "إذا لم ترتفع الرطوبة فوق 35٪ خلال 48 ساعة بعد التعديل، استدعِ مهندس زراعي خارجي."
        : "If moisture has not risen above 35% within 48 hours of the adjustment, escalate to an external agronomist.",
      steps: [
        {
          action: isAr
            ? "إجراء فحص ميداني للري والصمامات في الدفيئة، وتحديد العطل الميكانيكي إن وُجد."
            : "Run a field check on irrigation lines and valves; isolate any mechanical fault.",
          ownerRole: "OPS_FARM",
          durationDays: 1,
        },
        {
          action: isAr
            ? "إعادة جدولة الري لزيادة الدورات بنسبة 30٪ خلال 5 أيام، ومراقبة الرطوبة كل 6 ساعات."
            : "Reset the irrigation schedule for a 30% cycle increase over 5 days; monitor moisture every 6 hours.",
          ownerRole: "OPS_FARM",
          durationDays: 5,
        },
        {
          action: isAr
            ? "مراجعة قراءات المستشعر اليومية مع تقرير ملخص لإدارة لوران."
            : "Review daily sensor readings; produce a daily summary report for Loran management.",
          ownerRole: "OPS_GROUP",
          durationDays: 7,
        },
      ],
    };
  }

  if (isHotel) {
    return {
      goal: isAr
        ? "تخفيف أثر تراجع الإشغال المتوقع وتأمين تدفق الإيراد للأسابيع المقبلة."
        : "Cushion the projected occupancy dip and protect revenue flow for the coming weeks.",
      rationale: isAr
        ? "التوقعات تشير إلى انخفاض الإشغال بنسبة 15٪ الشهر القادم. الفنادق تحتاج إلى تحريك سريع نحو شرائح طلب بديلة (فعاليات الشركات، إقامات طويلة، عقود سفر) لتعويض الفرق قبل أن يتحول إلى خسارة في الإيراد التراكمي."
        : "Forecasts show a 15% occupancy dip next month. Hotels need to pivot quickly toward alternative demand pools — corporate events, extended stays, travel-trade contracts — to offset before it compounds into a meaningful revenue loss.",
      targetMetric: "occupancy",
      targetDelta: +0.1,
      targetDeadlineDays: 21,
      rollbackCondition: isAr
        ? "إذا لم يرتفع الإشغال بأكثر من 5٪ خلال 14 يوماً، أعد توجيه الميزانية إلى تسويق B2B بدلاً من حملة B2C."
        : "If occupancy hasn't moved up by at least 5% within 14 days, redirect spend from B2C to B2B sales activation.",
      steps: [
        {
          action: isAr
            ? "إطلاق حملة عقود الشركات لمدة 14 يوماً مع تركيز على ثلاث صناعات محورية."
            : "Launch a 14-day corporate-contracts push targeting three priority verticals.",
          ownerRole: "MARKETING",
          durationDays: 14,
        },
        {
          action: isAr
            ? "تفعيل عرض الإقامات الطويلة (3+ ليالٍ) بخصم 18٪ في الفنادق المتأثرة."
            : "Activate long-stay (3+ nights) promotion at -18% across affected hotels.",
          ownerRole: "OPS_HOTEL",
          durationDays: 21,
        },
        {
          action: isAr
            ? "مراجعة لوحة الحجوزات الأسبوعية لتقييم الأثر وإعادة الضبط."
            : "Review the weekly bookings dashboard for impact, recalibrate as needed.",
          ownerRole: "OPS_GROUP",
          durationDays: 21,
        },
      ],
    };
  }

  if (isFinance) {
    return {
      goal: isAr
        ? "تعزيز هامش المجموعة عبر فحص فجوات السيولة وكلفة التشغيل."
        : "Lift group margin by closing the cash-conversion and operating-cost gaps.",
      rationale: isAr
        ? "المؤشر المالي الحالي يستحق فحصاً جراحياً أكثر من قراءة سطحية. الخطة تركز على تشخيص بنود الكلفة المتسبّبة في الانضغاط، فحص جودة سلسلة الموردين، ومراجعة مدخلات الإنتاج العالية الكلفة قبل أي تحرك على السعر."
        : "The current financial reading deserves surgical examination, not a headline summary. The plan focuses on diagnosing the line items driving the squeeze, auditing supplier-quality cost, and reviewing high-cost production inputs before any pricing move.",
      targetMetric: "margin",
      targetDelta: +0.05,
      targetDeadlineDays: 30,
      rollbackCondition: isAr
        ? "إذا لم يتحرك الهامش بنسبة 2٪ على الأقل خلال 21 يوماً، صعّد للجنة المالية."
        : "If margin hasn't moved by at least 2% within 21 days, escalate to the finance committee.",
      steps: [
        {
          action: isAr
            ? "تشغيل تقرير تشخيصي على بنود الكلفة الستة الأعلى تأثيراً في الـ90 يوماً الماضية."
            : "Run a diagnostic report across the six highest-impact cost lines from the last 90 days.",
          ownerRole: "FINANCE",
          durationDays: 5,
        },
        {
          action: isAr
            ? "مراجعة جودة الموردين الثلاثة الأعلى حجماً وفتح مسار توريد بديل لكلٍ منهم."
            : "Audit the top-three suppliers by volume; open an alternative path for each.",
          ownerRole: "PROCUREMENT",
          durationDays: 14,
        },
        {
          action: isAr
            ? "اقتراح تعديل تسعير على فئتين رئيسيتين بناءً على نتائج التشخيص."
            : "Propose a pricing adjustment for two leading SKUs based on diagnostic findings.",
          ownerRole: "FINANCE",
          durationDays: 21,
        },
      ],
    };
  }

  // Generic fallback
  return {
    goal: isAr
      ? "وضع خطة عمل مرتّبة استجابةً للإشارة الحالية ومتابعتها حتى الإغلاق."
      : "Stand up an ordered response plan to the current signal and track it to closure.",
    rationale: isAr
      ? "الإشارة الحالية تتطلب استجابة مُنظّمة بدلاً من ردود فعل متفرقة. الخطة تجمع التشخيص، التنفيذ السريع، ومراجعة الأثر في نافذة محددة."
      : "The current signal warrants a structured response rather than scattered reactions. The plan packages diagnosis, fast execution, and an impact review inside a fixed window.",
    targetMetric: "revenue",
    targetDelta: +0.04,
    targetDeadlineDays: 21,
    rollbackCondition: isAr
      ? "إذا لم تتحقق نسبة 50٪ من الهدف خلال 14 يوماً، أعد التقييم."
      : "If less than 50% of the target is achieved within 14 days, reassess.",
    steps: [
      {
        action: isAr
          ? "تشخيص أساسي للإشارة وتحديد الكيانات المتأثرة المباشرة."
          : "Run a baseline diagnosis of the signal and name the directly affected entities.",
        ownerRole: "OPS_GROUP",
        durationDays: 3,
      },
      {
        action: isAr
          ? "تنفيذ الإجراء التشغيلي الأساسي بقيادة الفريق المعني."
          : "Execute the primary operational move under the relevant team's lead.",
        ownerRole: "OPS_GROUP",
        durationDays: 10,
      },
      {
        action: isAr ? "مراجعة الأثر بعد 14 يوماً والإبلاغ." : "Review impact at 14 days and report.",
        ownerRole: "OPS_GROUP",
        durationDays: 14,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────

async function persistPlan(
  draft: PlanDraft,
  source: { sourceInsightId?: string; sourceCouncilSessionId?: string }
) {
  const targetDeadline = new Date(Date.now() + draft.targetDeadlineDays * 24 * 3600 * 1000);
  const plan = await prisma.plan.create({
    data: {
      goal: draft.goal,
      rationale: draft.rationale,
      targetMetric: draft.targetMetric,
      targetDelta: draft.targetDelta,
      targetDeadline,
      rollbackCondition: draft.rollbackCondition ?? null,
      status: "DRAFT",
      sourceInsightId: source.sourceInsightId ?? null,
      sourceCouncilSessionId: source.sourceCouncilSessionId ?? null,
      steps: {
        create: draft.steps.map((s, i) => ({
          orderIndex: i,
          action: s.action,
          ownerRole: s.ownerRole,
          durationDays: s.durationDays,
          status: "PENDING",
        })),
      },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  return plan;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function toNum(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
