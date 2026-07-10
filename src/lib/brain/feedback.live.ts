// feedback.live.ts — concrete FeedbackLoop.
//
// Two responsibilities:
//   1. RECORD — every user action on a brain artefact creates a row.
//   2. LEARN — periodically, the analyzer aggregates the log into
//              human-readable BrainPatterns. Patterns are toggleable
//              and reweight future brain output.
//
// Phase 7 of docs/governance/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import { callLlm, extractJson, type LlmRequest } from "./llm";
import { log } from "@/lib/utils/logger";
import type {
  FeedbackLoop,
  FeedbackKind,
  FeedbackRecord,
} from "./feedback";

// ─────────────────────────────────────────────────────────────────────
// 1. Record
// ─────────────────────────────────────────────────────────────────────

export async function recordFeedback(input: {
  kind: FeedbackKind;
  targetRef: string;
  targetType?: "insight" | "plan" | "council" | "memory";
  module?: string;
  category?: string;
  signalDelta?: number;
  note?: string;
  userId?: string | null;
  scope?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  // Best-effort — never let a feedback insert break the user-facing flow.
  try {
    await prisma.brainFeedback.create({
      data: {
        scope: input.scope ?? "default",
        userId: input.userId ?? null,
        kind: input.kind,
        targetRef: input.targetRef,
        targetType: input.targetType ?? null,
        module: input.module ?? null,
        category: input.category ?? null,
        signalDelta: input.signalDelta ?? null,
        note: input.note ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (e) {
    log.error("brain.feedback: record failed", { err: String(e) });
  }
}

// ─────────────────────────────────────────────────────────────────────
// 2. Aggregate signal weights — what the brain reweights to.
// ─────────────────────────────────────────────────────────────────────

export async function getWeights(scope: string = "default"): Promise<Record<string, number>> {
  const patterns = await prisma.brainPattern.findMany({
    where: { scope, status: "ENABLED" },
  });
  const map: Record<string, number> = {};
  for (const p of patterns) {
    try {
      const rule = JSON.parse(p.ruleJson);
      // Build a synthetic key per rule type so callers can quickly check
      // "is this kind of artefact being re-weighted?".
      const key = `${rule.action ?? "rule"}:${rule.module ?? "*"}:${rule.category ?? "*"}`;
      map[key] = (map[key] ?? 0) + p.confidence;
    } catch {
      /* ignore malformed */
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────
// 3. Digest — counts for the past window
// ─────────────────────────────────────────────────────────────────────

export async function digest(window: "day" | "week" | "month") {
  const ms =
    window === "day" ? 24 * 3600 * 1000
      : window === "week" ? 7 * 24 * 3600 * 1000
      : 30 * 24 * 3600 * 1000;
  const since = new Date(Date.now() - ms);
  const rows = await prisma.brainFeedback.findMany({
    where: { ts: { gte: since } },
  });
  const accepted = rows.filter((r) =>
    [
      "INSIGHT_HELPFUL",
      "INSIGHT_RESOLVED",
      "PLAN_COMMITTED",
      "PLAN_COMPLETED",
      "PLAN_STEP_DONE",
      "MEMORY_USEFUL",
      "OUTCOME_RIGHT",
    ].includes(r.kind)
  ).length;
  const rejected = rows.filter((r) =>
    [
      "INSIGHT_DISMISSED",
      "PLAN_ABANDONED",
      "PLAN_STEP_BLOCKED",
      "MEMORY_IRRELEVANT",
      "OUTCOME_WRONG",
      "RECOMMENDATION_OVERRIDDEN",
    ].includes(r.kind)
  ).length;
  const learnedPatterns = await prisma.brainPattern.findMany({
    where: { lastObservedAt: { gte: since } },
    select: { statementEn: true },
    take: 20,
  });
  return {
    accepted,
    rejected,
    learnedPatterns: learnedPatterns.map((p) => p.statementEn),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 4. Pattern analyzer — read the feedback log, write learned rules.
// ─────────────────────────────────────────────────────────────────────

type Cluster = {
  module: string | null;
  category: string | null;
  kinds: Record<string, number>;
  total: number;
  earliest: Date;
  latest: Date;
};

export async function learnPatterns(opts: {
  scope?: string;
  windowDays?: number;
  minEvidence?: number;
} = {}): Promise<{ written: number; clusters: number }> {
  const scope = opts.scope ?? "default";
  const windowDays = opts.windowDays ?? 60;
  const minEvidence = opts.minEvidence ?? 3;
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);

  const rows = await prisma.brainFeedback.findMany({
    where: { scope, ts: { gte: since } },
    orderBy: { ts: "asc" },
  });
  if (rows.length === 0) return { written: 0, clusters: 0 };

  // Cluster by (module, category) — anything where 70%+ of events share a
  // single kind becomes a candidate pattern.
  const buckets = new Map<string, Cluster>();
  for (const r of rows) {
    const key = `${r.module ?? ""}::${r.category ?? ""}`;
    const c = buckets.get(key) ?? {
      module: r.module ?? null,
      category: r.category ?? null,
      kinds: {},
      total: 0,
      earliest: r.ts,
      latest: r.ts,
    };
    c.kinds[r.kind] = (c.kinds[r.kind] ?? 0) + 1;
    c.total += 1;
    if (r.ts < c.earliest) c.earliest = r.ts;
    if (r.ts > c.latest) c.latest = r.ts;
    buckets.set(key, c);
  }

  let written = 0;
  let clusters = 0;
  for (const [, c] of buckets) {
    if (c.total < minEvidence) continue;
    // Find the dominant kind in this bucket.
    const sortedKinds = Object.entries(c.kinds).sort((a, b) => b[1] - a[1]);
    const [topKind, topCount] = sortedKinds[0];
    const dominance = topCount / c.total;
    if (dominance < 0.65) continue;
    clusters++;

    const candidate = {
      module: c.module,
      category: c.category,
      dominantKind: topKind,
      dominantShare: dominance,
      total: c.total,
      kinds: c.kinds,
    };

    const drafted = await draftPatternStatement(candidate);
    const ruleJson = JSON.stringify(deriveRule(candidate));

    // Stable id so re-running learn doesn't duplicate.
    const id = `pat-${(c.module ?? "any").toLowerCase()}-${(c.category ?? "any").toLowerCase()}-${topKind.toLowerCase()}`;

    await prisma.brainPattern.upsert({
      where: { id },
      create: {
        id,
        scope,
        statementEn: drafted.en,
        statementAr: drafted.ar,
        ruleJson,
        kindsJson: JSON.stringify(Object.keys(c.kinds)),
        evidenceCount: c.total,
        confidence: Math.min(0.95, 0.45 + dominance * 0.45),
        module: c.module ?? null,
        status: "ENABLED",
        authoredBy: "auto",
        firstObservedAt: c.earliest,
        lastObservedAt: c.latest,
      },
      update: {
        statementEn: drafted.en,
        statementAr: drafted.ar,
        ruleJson,
        kindsJson: JSON.stringify(Object.keys(c.kinds)),
        evidenceCount: c.total,
        confidence: Math.min(0.95, 0.45 + dominance * 0.45),
        lastObservedAt: c.latest,
      },
    });
    written++;
  }
  return { written, clusters };
}

// ─────────────────────────────────────────────────────────────────────
// 5. Pattern statement drafting — LLM with stub fallback.
// ─────────────────────────────────────────────────────────────────────

type DraftedStatement = { en: string; ar: string };

const SYSTEM_EN = `
You convert raw feedback statistics into a single human-readable sentence describing what the brain has learned about how this organization makes decisions. You are concise. You quote numbers. You write as a senior chief-of-staff would speak.

Respond ONLY with a JSON object of this shape (no surrounding prose, no markdown fences):
{
  "en": "<single sentence stating the learned pattern in English>",
  "ar": "<same sentence in Arabic>"
}
The sentence should:
- be 14-26 words
- name the module/category if present
- name the dominant action ("dismiss", "commit", "abandon", "complete", "block")
- name the volume ("8 of 9 times", "100% of the time", etc.)
- end on what the brain will do going forward
`.trim();

async function draftPatternStatement(candidate: {
  module: string | null;
  category: string | null;
  dominantKind: string;
  dominantShare: number;
  total: number;
}): Promise<DraftedStatement> {
  const stub = (_r: LlmRequest) => JSON.stringify(stubStatement(candidate));
  const userPrompt = `Cluster:\nmodule=${candidate.module ?? "ANY"}\ncategory=${candidate.category ?? "ANY"}\ndominantKind=${candidate.dominantKind}\nshare=${(candidate.dominantShare * 100).toFixed(0)}%\nevidence=${candidate.total} events\n\nWrite the pattern.`;
  const res = await callLlm(
    {
      system: SYSTEM_EN,
      user: userPrompt,
      maxTokens: 220,
      temperature: 0.4,
      expectJson: true,
    },
    stub
  );
  const parsed = extractJson<DraftedStatement>(res.text);
  if (!parsed || !parsed.en) return stubStatement(candidate);
  return {
    en: String(parsed.en).slice(0, 320),
    ar: String(parsed.ar ?? "").slice(0, 320),
  };
}

function stubStatement(c: {
  module: string | null;
  category: string | null;
  dominantKind: string;
  dominantShare: number;
  total: number;
}): DraftedStatement {
  const sharePct = Math.round(c.dominantShare * 100);
  const M = c.module ? c.module.toUpperCase() : "all modules";
  const Cat = c.category ? ` ${c.category.replace(/_/g, " ")}` : "";

  switch (c.dominantKind) {
    case "INSIGHT_DISMISSED":
      return {
        en: `You dismiss ${sharePct}% of${Cat} insights from ${M} (${c.total} events). I'll suppress them unless severity warrants escalation.`,
        ar: `تتجاهل ${sharePct}٪ من إشارات${Cat} في ${M} (${c.total} حدث). سأكتمها ما لم تستحق التصعيد.`,
      };
    case "INSIGHT_HELPFUL":
    case "INSIGHT_RESOLVED":
      return {
        en: `You resolve ${sharePct}% of${Cat} insights from ${M} (${c.total} events). I'll surface them more aggressively.`,
        ar: `تحلّ ${sharePct}٪ من إشارات${Cat} في ${M} (${c.total} حدث). سأبرزها بشكل أكثر فاعلية.`,
      };
    case "PLAN_COMMITTED":
      return {
        en: `Your team commits ${sharePct}% of${Cat} plans in ${M} (${c.total} events). I'll fast-track similar drafts.`,
        ar: `يلتزم فريقك بـ${sharePct}٪ من خطط${Cat} في ${M} (${c.total} حدث). سأسرّع مثيلاتها مستقبلاً.`,
      };
    case "PLAN_ABANDONED":
      return {
        en: `${sharePct}% of${Cat} plans in ${M} get abandoned (${c.total} events). I'll require an extra review step before publishing.`,
        ar: `يُلغى ${sharePct}٪ من خطط${Cat} في ${M} (${c.total} حدث). سأضيف خطوة مراجعة قبل النشر.`,
      };
    case "PLAN_STEP_DONE":
    case "PLAN_COMPLETED":
      return {
        en: `${sharePct}% of${Cat} plan steps in ${M} get completed on time (${c.total} events). I'll lean into similar templates.`,
        ar: `يُكمل ${sharePct}٪ من خطوات خطط${Cat} في ${M} في وقتها (${c.total} حدث). سأعتمد قوالب مماثلة.`,
      };
    case "PLAN_STEP_BLOCKED":
      return {
        en: `${sharePct}% of${Cat} steps in ${M} get blocked (${c.total} events). I'll flag dependency risk earlier in similar plans.`,
        ar: `يُعطَّل ${sharePct}٪ من خطوات${Cat} في ${M} (${c.total} حدث). سأرفع الإنذار على التبعيات في خطط مماثلة.`,
      };
    case "MEMORY_USEFUL":
      return {
        en: `${sharePct}% of recalls from${Cat} ${M} memories were marked useful (${c.total} events). I'll boost their similarity weight.`,
        ar: `${sharePct}٪ من استرجاعات${Cat} ذاكرة ${M} وُسمت كمفيدة (${c.total} حدث). سأزيد وزن تشابهها.`,
      };
    default:
      return {
        en: `Recurring pattern observed in ${M}${Cat}: ${c.dominantKind} ${sharePct}% (${c.total} events).`,
        ar: `نمط متكرر في ${M}${Cat}: ${c.dominantKind} ${sharePct}٪ (${c.total} حدث).`,
      };
  }
}

function deriveRule(c: {
  module: string | null;
  category: string | null;
  dominantKind: string;
}): Record<string, any> {
  switch (c.dominantKind) {
    case "INSIGHT_DISMISSED":
      return { action: "suppress_alert", module: c.module, category: c.category };
    case "INSIGHT_HELPFUL":
    case "INSIGHT_RESOLVED":
      return { action: "boost_alert", module: c.module, category: c.category };
    case "PLAN_COMMITTED":
      return { action: "fast_track_plan", module: c.module };
    case "PLAN_ABANDONED":
      return { action: "review_extra", module: c.module };
    case "PLAN_STEP_BLOCKED":
      return { action: "flag_dependency_risk", module: c.module };
    case "MEMORY_USEFUL":
      return { action: "boost_memory", module: c.module };
    default:
      return { action: "noop", module: c.module };
  }
}

// ─────────────────────────────────────────────────────────────────────
// FeedbackLoop interface implementation
// ─────────────────────────────────────────────────────────────────────

class LiveFeedbackLoop implements FeedbackLoop {
  async record(r: Omit<FeedbackRecord, "id" | "ts">): Promise<void> {
    await recordFeedback({
      kind: r.kind,
      targetRef: r.targetRef,
      userId: r.userId,
      scope: r.orgId,
      note: r.note,
      signalDelta: r.signalDelta,
    });
  }
  async weights(scope: { orgId: string; tag?: string }): Promise<Record<string, number>> {
    return getWeights(scope.orgId);
  }
  async digest(window: "day" | "week" | "month") {
    return digest(window);
  }
}

let _instance: LiveFeedbackLoop | null = null;
export function feedbackLoop(): LiveFeedbackLoop {
  if (!_instance) _instance = new LiveFeedbackLoop();
  return _instance;
}
