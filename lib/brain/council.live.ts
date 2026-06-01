// council.live.ts — concrete Council implementation.
//
// Orchestration:
//   1. Load relevant subgraph from the causal graph (top hub nodes only).
//   2. Build a compact AgentInput (summary + metrics + relevantNodes).
//   3. Run all SPECIALIST_AGENTS in parallel.
//   4. Run the Moderator with their voices as input.
//   5. Persist a CouncilSession + CouncilVoices in Prisma.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db";
import { causalGraph } from "./graph.prisma";
import { SPECIALIST_AGENTS, runAgent, runModerator } from "./agents";
import type { Council, CouncilSession, AgentVoice } from "./council";
import { log } from "@/lib/logger";
import { llmConfig } from "./llm";

class LiveCouncil implements Council {
  async convene(topic: string, contextRefs: string[] = []): Promise<CouncilSession> {
    const t0 = Date.now();
    const locale: "ar" | "en" =
      /[؀-ۿ]/.test(topic) ? "ar" : "en";

    // 1. Build the context — top hub nodes + their immediate neighbors if refs given.
    const context = await buildAgentContext(contextRefs, topic, locale);

    // 2. Persist the running session up-front so the UI can poll it if streaming.
    const session = await prisma.councilSession.create({
      data: {
        topic,
        contextRefs: JSON.stringify(contextRefs),
        status: "RUNNING",
        usedLiveLlm: llmConfig().enabled,
      },
    });

    try {
      // 3. Run specialists in parallel.
      const voices = await Promise.all(
        SPECIALIST_AGENTS.map((agent) =>
          runAgent(agent, { topic, context, locale })
        )
      );

      // 4. Run moderator.
      const moderation = await runModerator({ topic, voices, locale });

      // 5. Persist voices + synthesis.
      const allVoices: Array<AgentVoice & { isStub?: boolean }> = [
        ...voices,
        {
          agentId: "moderator",
          speakerLabel: moderation.speakerLabel,
          position: "qualify",
          thesis: moderation.recommendation,
          evidence: [],
        },
      ];

      await prisma.$transaction([
        ...allVoices.map((v, i) =>
          prisma.councilVoice.create({
            data: {
              sessionId: session.id,
              agentId: v.agentId,
              speakerLabelAr: v.speakerLabel.ar,
              speakerLabelEn: v.speakerLabel.en,
              position: v.position,
              thesis: v.thesis,
              evidenceJson: JSON.stringify(v.evidence ?? []),
              orderIndex: i,
              isStub: !llmConfig().enabled,
              llmModel: llmConfig().enabled ? llmConfig().model : null,
            },
          })
        ),
        prisma.councilSession.update({
          where: { id: session.id },
          data: {
            status: "DONE",
            recommendation: moderation.recommendation,
            confidence: moderation.confidence,
            dissentNote: moderation.dissentNote ?? null,
            durationMs: Date.now() - t0,
          },
        }),
      ]);

      return {
        id: session.id,
        topic,
        ranAt: session.ranAt,
        voices,
        synthesis: {
          recommendation: moderation.recommendation,
          confidence: moderation.confidence,
          dissentNote: moderation.dissentNote,
        },
      };
    } catch (err) {
      log.error("brain.council: convene failed", { err: String(err) });
      await prisma.councilSession.update({
        where: { id: session.id },
        data: { status: "FAILED", durationMs: Date.now() - t0 },
      });
      throw err;
    }
  }

  async replay(sessionId: string): Promise<CouncilSession | null> {
    const row = await prisma.councilSession.findUnique({
      where: { id: sessionId },
      include: { voices: { orderBy: { orderIndex: "asc" } } },
    });
    if (!row) return null;
    // Pull moderator out of the voices array to populate `synthesis`.
    const specialistRows = row.voices.filter((v) => v.agentId !== "moderator");
    const voices: AgentVoice[] = specialistRows.map((v) => ({
      agentId: v.agentId,
      speakerLabel: { ar: v.speakerLabelAr, en: v.speakerLabelEn },
      position: v.position as AgentVoice["position"],
      thesis: v.thesis,
      evidence: safeJson(v.evidenceJson),
    }));
    return {
      id: row.id,
      topic: row.topic,
      ranAt: row.ranAt,
      voices,
      synthesis: {
        recommendation: row.recommendation ?? "",
        confidence: row.confidence ?? 0,
        dissentNote: row.dissentNote ?? undefined,
      },
    };
  }
}

let _instance: LiveCouncil | null = null;
export function council(): LiveCouncil {
  if (!_instance) _instance = new LiveCouncil();
  return _instance;
}

// ─────────────────────────────────────────────────────────────────────
// Context builder — produces a compact, agent-friendly snapshot.
// ─────────────────────────────────────────────────────────────────────

async function buildAgentContext(
  contextRefs: string[],
  topic: string,
  locale: "ar" | "en"
) {
  // Pull the most central nodes (Companies + Hotels + Forecasts) plus any explicit refs.
  const [companies, hotels, dairyBatches, farms, openInsights, forecasts, transactions] = await Promise.all([
    prisma.company.findMany(),
    prisma.hotel.findMany(),
    prisma.dairyBatch.findMany({ orderBy: { expiryDate: "asc" }, take: 5 }),
    prisma.farm.findMany(),
    prisma.aIInsight.findMany({
      where: { status: "OPEN", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.supplyForecast.findMany({ where: { status: "APPROVED" }, take: 5 }),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const totalRevenue = transactions
    .filter((t) => t.kind === "REVENUE")
    .reduce((a, b) => a + b.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.kind === "EXPENSE")
    .reduce((a, b) => a + b.amount, 0);

  const farmsAlerting = farms.filter((f) => f.alertLevel !== "OK").length;

  const summary = locale === "ar"
    ? `مجموعة من ${companies.length} شركات. ${hotels.length} فنادق. ${farms.length} مزارع (${farmsAlerting} في تنبيه). ${dairyBatches.length} دفعة ألبان قيد المتابعة. الإيرادات (90ي): ${Math.round(totalRevenue).toLocaleString()} د.أ، المصاريف: ${Math.round(totalExpense).toLocaleString()} د.أ.`
    : `Group has ${companies.length} companies. ${hotels.length} hotels. ${farms.length} farms (${farmsAlerting} alerting). ${dairyBatches.length} dairy batches under watch. Revenue (90d): JOD ${Math.round(totalRevenue).toLocaleString()}, Expense: JOD ${Math.round(totalExpense).toLocaleString()}.`;

  const metrics: Record<string, number | string> = {
    companies: companies.length,
    hotels: hotels.length,
    farms_alerting: farmsAlerting,
    dairy_batches_near_expiry: dairyBatches.length,
    open_insights: openInsights.length,
    revenue_90d: Math.round(totalRevenue),
    expense_90d: Math.round(totalExpense),
    margin_pct: totalRevenue > 0 ? Number(((totalRevenue - totalExpense) / totalRevenue * 100).toFixed(1)) : 0,
  };

  const relevantNodes = [
    ...companies.map((c) => ({ id: c.id, kind: "Company", label: c.nameEn || c.name })),
    ...hotels.map((h) => ({ id: h.id, kind: "Hotel", label: h.name })),
    ...openInsights.map((i) => ({ id: i.id, kind: "Insight", label: i.title })),
    ...dairyBatches.map((b) => ({ id: b.id, kind: "DairyBatch", label: `${b.product} · ${b.batchNumber}` })),
    ...farms.filter((f) => f.alertLevel !== "OK").map((f) => ({ id: f.id, kind: "Farm", label: f.name })),
    ...forecasts.map((f) => ({ id: f.id, kind: "Forecast", label: f.productLabel })),
  ];

  return { summary, metrics, relevantNodes };
}

function safeJson(s: string | null | undefined): any[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
