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

import { prisma } from "@/lib/db/db";
import { causalGraph } from "./graph.prisma";
import { SPECIALIST_AGENTS, runAgent, runModerator } from "./agents";
import type { Council, CouncilSession, AgentVoice, CouncilScope, CouncilLens } from "./council";
import { log } from "@/lib/utils/logger";
import { llmConfig } from "./llm";
import { retrieveDocuments, docHitsToContext, type DocContext } from "./documents.retrieve";
import { retrieveGraphContext } from "./graphrag.live";
import { evaluateRetrieval } from "./crag";

// Bilingual labels for each lens — used to spell the focus out to the agents.
const LENS_LABEL: Record<CouncilLens, { ar: string; en: string }> = {
  finance:        { ar: "المالية والهوامش", en: "finances & margins" },
  operations:     { ar: "العمليات",          en: "operations" },
  supply:         { ar: "سلسلة التوريد",      en: "supply chain" },
  sustainability: { ar: "الاستدامة وESG",     en: "sustainability & ESG" },
  people:         { ar: "الموظفون والفرق",    en: "people & teams" },
  analytics:      { ar: "التحليلات والأداء",  en: "analytics & performance" },
};

class LiveCouncil implements Council {
  async convene(
    topic: string,
    contextRefs: string[] = [],
    scope?: CouncilScope,
    forcedLocale?: "ar" | "en",
  ): Promise<CouncilSession> {
    const t0 = Date.now();
    // The debate language follows the UI locale when the caller passes one.
    // Only fall back to sniffing the topic text when it is unknown — the
    // auto-prefixed subject labels can contain the other language's characters
    // and would otherwise flip the whole debate (English user, Arabic answer).
    const locale: "ar" | "en" =
      forcedLocale ?? (/[؀-ۿ]/.test(topic) ? "ar" : "en");

    // 1. Build the context. When the user briefed the council on specific units
    //    and/or a lens, the agents see ONLY that slice — no other business units
    //    bleed in, and the lens narrows which facet they reason about, so the
    //    debate is fenced to the chosen brief instead of the whole group.
    const context = await buildAgentContext(contextRefs, topic, locale, scope);

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
  locale: "ar" | "en",
  scope?: CouncilScope,
) {
  const companyIds = scope?.companyIds?.filter(Boolean) ?? [];
  const scoped = companyIds.length > 0;
  const idSet = new Set(companyIds);
  const lenses = scope?.lenses ?? [];

  // Pull the most central nodes (Companies + Hotels + Forecasts) plus any explicit refs.
  // Phase RAG-3 — also retrieve the tenant's documents most relevant to the
  // topic, so each agent can ground its argument in real contract/policy text.
  // When the brief is fenced to specific units we retrieve fewer, stronger doc
  // matches so an off-unit contract can't sneak into the citations.
  /* eslint-disable prefer-const */
  let [companies, hotels, dairyBatches, farms, openInsights, forecasts, txnSums, docHits] = await Promise.all([
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
    // Sum revenue/expense in the DB rather than loading 90 days of rows into
    // memory just to reduce them — the window can scale to thousands of rows.
    prisma.transaction.groupBy({
      by: ["kind"],
      where: { occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
    }),
    retrieveDocuments(topic, { k: scoped ? 2 : 4, minScore: scoped ? 0.12 : 0.06, locale }).catch(() => []),
  ]);

  // FENCE the context to the chosen subject companies: strip every other unit's
  // data so the sub-agents debate ONLY the briefed units (no cross-contamination).
  // Group-wide insights (companyId === null) are dropped too — a fenced debate
  // is about the chosen units, not the whole federation.
  if (scoped) {
    companies = companies.filter((c) => idSet.has(c.id));
    hotels = hotels.filter((h) => idSet.has(h.companyId));
    dairyBatches = dairyBatches.filter((b) => idSet.has(b.companyId));
    farms = farms.filter((f) => idSet.has(f.companyId));
    openInsights = openInsights.filter((i) => i.companyId != null && idSet.has(i.companyId));
    forecasts = forecasts.filter(
      (f) => idSet.has(f.sourceCompanyId) || idSet.has(f.targetCompanyId),
    );
  }
  /* eslint-enable prefer-const */

  // Phase RAG-5 — Corrective RAG: only let the council cite documents the
  // evaluator judged relevant. A weak/irrelevant top match is dropped rather
  // than handed to every agent as evidence.
  const documents: DocContext[] = docHitsToContext(evaluateRetrieval(docHits).keep, locale);

  // Phase RAG-4 — multi-hop causal context from the brain graph for this topic.
  let graph = await retrieveGraphContext(topic, { k: scoped ? 6 : 8, topSeeds: 3 }).catch(() => ({
    nodes: [] as Array<{ kind: string; label: string }>,
    links: [] as string[],
  }));

  // FENCE the graph too: when units are chosen, drop graph nodes/links that name
  // entities outside the brief — otherwise the agents cite another company's
  // contracts/leases while debating yours (the cross-entity leak). We keep nodes
  // whose label matches an in-scope entity, and links that mention one.
  if (scoped) {
    const allowed = new Set(
      [
        ...companies.map((c) => c.nameEn || c.name),
        ...companies.map((c) => c.name),
        ...hotels.map((h) => h.name),
        ...farms.map((f) => f.name),
      ].map((s) => s.toLowerCase()),
    );
    const mentionsAllowed = (s: string) => {
      const low = s.toLowerCase();
      for (const a of allowed) if (a && low.includes(a)) return true;
      return false;
    };
    graph = {
      nodes: graph.nodes.filter((n) => mentionsAllowed(n.label)),
      links: graph.links.filter((l) => mentionsAllowed(l)),
    };
  }

  const sumByKind = (k: string) =>
    txnSums.find((r) => r.kind === k)?._sum.amount ?? 0;
  const totalRevenue = sumByKind("REVENUE");
  const totalExpense = sumByKind("EXPENSE");

  const farmsAlerting = farms.filter((f) => f.alertLevel !== "OK").length;

  let summary = locale === "ar"
    ? `مجموعة من ${companies.length} شركات. ${hotels.length} فنادق. ${farms.length} مزارع (${farmsAlerting} في تنبيه). ${dairyBatches.length} دفعة ألبان قيد المتابعة. الإيرادات (90ي): ${Math.round(totalRevenue).toLocaleString()} د.أ، المصاريف: ${Math.round(totalExpense).toLocaleString()} د.أ.`
    : `Group has ${companies.length} companies. ${hotels.length} hotels. ${farms.length} farms (${farmsAlerting} alerting). ${dairyBatches.length} dairy batches under watch. Revenue (90d): JOD ${Math.round(totalRevenue).toLocaleString()}, Expense: JOD ${Math.round(totalExpense).toLocaleString()}.`;

  // The lens narrows what the council argues about. Spell it out so each agent
  // restricts its thesis to the chosen facet(s) instead of ranging over the
  // whole operation — this is what makes a "finances only" brief stay on finances.
  if (lenses.length > 0) {
    summary += locale === "ar"
      ? ` ركّز النقاش حصراً على: ${lenses.map((l) => LENS_LABEL[l].ar).join("، ")}. تجاهل ما عدا ذلك.`
      : ` Focus the debate ONLY on: ${lenses.map((l) => LENS_LABEL[l].en).join(", ")}. Set everything else aside.`;
  }

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

  return {
    summary,
    metrics,
    relevantNodes,
    documents,
    graph: {
      nodes: graph.nodes.map((n) => ({ kind: n.kind, label: n.label })),
      links: graph.links,
    },
  };
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
