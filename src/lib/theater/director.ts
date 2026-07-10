// theater/director.ts — composes the 5 acts of a Decision Theater run.
//
// One council session in, one editorial spread out:
//   Act I    SITUATION       — narrator paragraph + group context
//   Act II   HISTORY         — memory-lake recall (analogous past events)
//   Act III  SIMULATION      — what-if propagation summary
//   Act IV   COUNCIL         — voice transcript, distilled to pull-quotes
//   Act V    RECOMMENDATION  — moderator synthesis + plan (if generated)
//
// Phase 9 of docs/governance/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import { council as councilStore } from "@/lib/brain/council.live";
import { narrator } from "@/lib/brain/narrator.claude";
import { memoryLake } from "@/lib/brain/memory.live";
import { simulateOnSnapshot } from "@/lib/brain/simulator.bfs";
import { causalGraph } from "@/lib/brain/graph.prisma";
import type { CouncilSession, AgentVoice } from "@/lib/brain/council";

export type SituationAct = {
  kind: "situation";
  topic: string;
  narrative: string;
  metrics: Array<{ label: string; value: string; tone?: "pos" | "neg" | "neutral" }>;
};

export type HistoryAct = {
  kind: "history";
  memories: Array<{
    id: string;
    occurredAt: Date;
    module: string;
    headline: { ar: string; en: string };
    body: { ar: string; en: string };
    lesson: { ar?: string | null; en?: string | null };
    tags: string[];
    similarity: number;
    outcome?: { metric: string; delta: number };
  }>;
};

export type SimulationAct = {
  kind: "simulation";
  perturbation: { label: string; pct: number };
  rows: Array<{ label: string; kind: string; deltaPct: number; hops: number }>;
  totalAffected: number;
};

export type CouncilAct = {
  kind: "council";
  voices: AgentVoice[];
};

export type RecommendationAct = {
  kind: "recommendation";
  moderator: {
    recommendation: string;
    confidence: number;
    dissentNote?: string;
  };
  plan?: {
    id: string;
    goal: string;
    rationale: string | null;
    targetMetric: string;
    targetDelta: number;
    targetDeadline: Date;
    rollbackCondition: string | null;
    status: string;
    steps: Array<{ orderIndex: number; action: string; ownerRole: string; durationDays: number; status: string }>;
  };
};

export type TheaterScript = {
  sessionId: string;
  topic: string;
  ranAt: Date;
  acts: [SituationAct, HistoryAct, SimulationAct, CouncilAct, RecommendationAct];
};

const ACT_TITLES_EN = ["Situation", "History", "Simulation", "Council", "Recommendation"];
const ACT_TITLES_AR = ["الوضع", "التاريخ", "المُحاكاة", "المجلس", "التوصية"];

export function actTitle(idx: 0 | 1 | 2 | 3 | 4, locale: "ar" | "en"): string {
  return locale === "ar" ? ACT_TITLES_AR[idx] : ACT_TITLES_EN[idx];
}

export async function composeFromCouncil(
  sessionId: string,
  locale: "ar" | "en"
): Promise<TheaterScript | null> {
  const session = await councilStore().replay(sessionId);
  if (!session) return null;

  // Acts I-III and V each derive independently from `session` and are read-only
  // (DB / causal-graph / narrator). Composed serially they stacked — a narrator
  // LLM call + a full graph loadAll + BFS + two more DB reads — and blocked the
  // theater's first byte. Compose them concurrently; Act IV is pure in-memory.
  const [situation, history, simulation, recommendation] = await Promise.all([
    composeSituation(session, locale), // Act I — SITUATION (narrator LLM)
    composeHistory(session, locale), //   Act II — HISTORY
    composeSimulation(session), //        Act III — SIMULATION (graph + BFS)
    composeRecommendation(session), //    Act V — RECOMMENDATION
  ]);

  // ── Act IV — COUNCIL ─────────────────────────────────────────────
  const councilAct: CouncilAct = { kind: "council", voices: session.voices };

  return {
    sessionId: session.id,
    topic: session.topic,
    ranAt: session.ranAt,
    acts: [situation, history, simulation, councilAct, recommendation],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Act composers
// ─────────────────────────────────────────────────────────────────────

async function composeSituation(
  session: CouncilSession,
  locale: "ar" | "en"
): Promise<SituationAct> {
  const [transactions, dairyBatches, farms] = await Promise.all([
    prisma.transaction.findMany({
      where: { occurredAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
    }),
    prisma.dairyBatch.findMany({
      orderBy: { expiryDate: "asc" },
      take: 5,
    }),
    prisma.farm.findMany({}),
  ]);

  const revenue = transactions.filter((t) => t.kind === "REVENUE").reduce((a, b) => a + b.amount, 0);
  const expense = transactions.filter((t) => t.kind === "EXPENSE").reduce((a, b) => a + b.amount, 0);
  const farmsAlerting = farms.filter((f) => f.alertLevel !== "OK").length;
  const dairyExpiringIn3 = dairyBatches.filter(
    (b) => b.expiryDate.getTime() - Date.now() < 3 * 24 * 3600 * 1000
  ).length;

  const facts = {
    topic: session.topic,
    revenue30d: Math.round(revenue),
    expense30d: Math.round(expense),
    margin30d: revenue > 0 ? (revenue - expense) / revenue : 0,
    farmsAlerting,
    dairyExpiringIn3,
  };

  // Narrator writes an editorial paragraph for the opening.
  const narrative = await narrator().write({
    register: "editorial",
    locale,
    topic: "theater_situation",
    facts,
    summary: session.topic,
  });

  const metrics: SituationAct["metrics"] = [
    {
      label: locale === "ar" ? "إيراد 30 يوم" : "30d revenue",
      value: `JOD ${Math.round(revenue).toLocaleString("en-US")}`,
      tone: "neutral",
    },
    {
      label: locale === "ar" ? "هامش 30 يوم" : "30d margin",
      value: `${(facts.margin30d * 100).toFixed(1)}%`,
      tone: facts.margin30d > 0.15 ? "pos" : facts.margin30d > 0 ? "neutral" : "neg",
    },
    {
      label: locale === "ar" ? "مزارع تنبيه" : "Farms alerting",
      value: String(farmsAlerting),
      tone: farmsAlerting === 0 ? "pos" : "neg",
    },
    {
      label: locale === "ar" ? "ألبان قرب الانتهاء" : "Dairy expiring",
      value: String(dairyExpiringIn3),
      tone: dairyExpiringIn3 === 0 ? "pos" : "neg",
    },
  ];

  return {
    kind: "situation",
    topic: session.topic,
    narrative: narrative.text,
    metrics,
  };
}

async function composeHistory(
  session: CouncilSession,
  locale: "ar" | "en"
): Promise<HistoryAct> {
  const matches = await memoryLake().recall({
    situation: session.topic,
    topK: 3,
    minSimilarity: 0.04,
  });
  return {
    kind: "history",
    memories: matches.map((m) => ({
      id: m.id,
      occurredAt: m.ts,
      module: m.module,
      headline: m.headline,
      body: m.body,
      lesson: (m as any).lesson ?? { ar: null, en: m.outcome?.lessonLearned ?? null },
      tags: m.tags,
      similarity: (m as any).similarity ?? 0,
      outcome: m.outcome ? { metric: m.outcome.metric, delta: m.outcome.delta } : undefined,
    })),
  };
}

async function composeSimulation(session: CouncilSession): Promise<SimulationAct> {
  // Pick the most plausible "central" node from the topic — for the demo,
  // we default to the first hub Company found (Arena hospitality).
  const { nodes, edges } = await causalGraph().loadAll();
  if (nodes.length === 0) {
    return { kind: "simulation", perturbation: { label: "—", pct: 0 }, rows: [], totalAffected: 0 };
  }
  // Try to find a topic-matching node; otherwise, default to the most
  // important Company/Hotel.
  const t = session.topic.toLowerCase();
  const guess =
    nodes.find((n) => n.kind === "Hotel" && t.includes(n.label.toLowerCase().split(" ")[0])) ??
    nodes.find((n) => n.kind === "Company" && /arena/i.test(n.label)) ??
    nodes
      .filter((n) => n.kind === "Hotel" || n.kind === "Company")
      .sort((a, b) => ((b as any).importance ?? 0) - ((a as any).importance ?? 0))[0];
  if (!guess) {
    return { kind: "simulation", perturbation: { label: "—", pct: 0 }, rows: [], totalAffected: 0 };
  }

  const delta = -0.4; // canonical "what if -40%" propagation
  const impacts = simulateOnSnapshot(
    { nodes, edges },
    { nodeId: guess.id, delta },
    4
  );

  return {
    kind: "simulation",
    perturbation: {
      label: guess.label,
      pct: delta * 100,
    },
    totalAffected: impacts.length,
    rows: impacts.slice(0, 6).map((r) => ({
      label: r.node.label,
      kind: r.node.kind,
      deltaPct: r.projectedDelta * 100,
      hops: r.hops,
    })),
  };
}

async function composeRecommendation(session: CouncilSession): Promise<RecommendationAct> {
  // Find an existing plan generated from this session, if any.
  const plan = await prisma.plan.findFirst({
    where: { sourceCouncilSessionId: session.id },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    kind: "recommendation",
    moderator: {
      recommendation: session.synthesis.recommendation,
      confidence: session.synthesis.confidence,
      dissentNote: session.synthesis.dissentNote,
    },
    plan: plan
      ? {
          id: plan.id,
          goal: plan.goal,
          rationale: plan.rationale,
          targetMetric: plan.targetMetric,
          targetDelta: plan.targetDelta,
          targetDeadline: plan.targetDeadline,
          rollbackCondition: plan.rollbackCondition,
          status: plan.status,
          steps: plan.steps.map((s) => ({
            orderIndex: s.orderIndex,
            action: s.action,
            ownerRole: s.ownerRole,
            durationDays: s.durationDays,
            status: s.status,
          })),
        }
      : undefined,
  };
}
