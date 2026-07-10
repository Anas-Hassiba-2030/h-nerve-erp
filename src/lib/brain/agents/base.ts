// agents/base.ts — shared types and prompt scaffolding for all council agents.
//
// Every agent returns a structured AgentVoice via the LLM. The model is
// asked to emit JSON with a strict shape; if it fails or is in stub mode,
// the agent's deterministic fallback runs.
//
// Phase 3 of docs/governance/PHASES-INTELLIGENCE.md.

import { callLlm, councilModel, extractJson, type LlmRequest } from "../llm";
import type { AgentVoice } from "../council";
import type { DocContext } from "../documents.retrieve";

export type AgentInput = {
  topic: string;
  // Compact subgraph snapshot — agents reason over this without needing DB access.
  context: {
    summary: string;
    metrics: Record<string, number | string>;
    relevantNodes: Array<{ id: string; kind: string; label: string }>;
    // Phase RAG-3 — retrieved snippets from the tenant's own documents
    // (contracts, policies, reports). Agents cite these by ref ("doc1").
    documents?: DocContext[];
    // Phase RAG-4 — multi-hop causal context from the brain graph: the nodes
    // most relevant to the topic and the causal links among them.
    graph?: { nodes: Array<{ kind: string; label: string }>; links: string[] };
  };
  locale: "ar" | "en";
};

/**
 * Merge the top retrieved document in as an evidence item so it's visible on
 * every voice — even in stub mode where the deterministic fallback can't read
 * the document context. Pure; never exceeds 3 evidence items; idempotent
 * (won't duplicate a ref already cited). Phase RAG-3.
 */
export function withDocumentEvidence(
  evidence: AgentVoice["evidence"],
  documents: DocContext[] | undefined,
): AgentVoice["evidence"] {
  const base = Array.isArray(evidence) ? evidence.slice(0, 3) : [];
  const top = documents?.[0];
  if (!top) return base;
  if (base.some((e) => e.ref === top.ref)) return base.slice(0, 3);
  const label = top.snippet ? `${top.title}: ${top.snippet.slice(0, 80)}` : top.title;
  return [...base, { ref: top.ref, label, weight: 0.5 }].slice(0, 3);
}

export type AgentDef = {
  id: string;
  speakerLabelAr: string;
  speakerLabelEn: string;
  systemPrompt: string;
  // Builds the user-facing prompt for THIS topic + context.
  buildUserPrompt: (input: AgentInput) => string;
  // Deterministic fallback used in stub mode (no API key) or when the LLM fails.
  stubVoice: (input: AgentInput) => Pick<AgentVoice, "position" | "thesis" | "evidence">;
};

/** Standard council instruction every agent's system prompt closes with. */
export const COUNCIL_INSTRUCTION_EN = `
You are a member of an executive council convened to deliberate on a strategic question.
Speak in editorial English (or Arabic if asked). Be specific. Cite metrics when you have them.
When the provided documents support your point, cite them by ref (e.g. doc1) in your evidence — quote only what the document actually says.
Do not preface with "As an AI". Do not list bullet points. Write as a senior advisor would speak.

Respond ONLY with a JSON object of this shape:
{
  "position": "support" | "oppose" | "qualify",
  "thesis": "<2-4 sentences in your voice>",
  "evidence": [
    { "ref": "<short tag>", "label": "<short human-readable claim>", "weight": <0..1> }
  ]
}
Maximum 3 evidence items. Do not include any text outside the JSON object.
`.trim();

export const COUNCIL_INSTRUCTION_AR = `
أنت عضو في مجلس تنفيذي يجتمع للتداول في سؤال استراتيجي.
تكلّم بنبرة تحريرية احترافية. كُن محدداً. اذكر الأرقام عند توفّرها.
عند وجود مستندات تدعم رأيك، استشهد بها عبر المُعرّف (مثل doc1) ضمن الأدلة — واقتبس فقط ما تقوله المستندات فعلاً.
لا تبدأ بـ"بصفتي ذكاءً اصطناعياً". لا تستخدم نقاطاً. اكتب كما يتحدث مستشار كبير.

أجب بكائن JSON فقط بهذا الشكل:
{
  "position": "support" | "oppose" | "qualify",
  "thesis": "<جملتان إلى أربع جمل بصوتك>",
  "evidence": [
    { "ref": "<وسم قصير>", "label": "<ادعاء قصير قابل للقراءة>", "weight": <0..1> }
  ]
}
حد أقصى 3 عناصر للأدلة. لا تُضف أي نص خارج كائن JSON.
`.trim();

/** Run an agent: call the LLM, parse the JSON, fall back to the stub on any failure. */
export async function runAgent(def: AgentDef, input: AgentInput): Promise<AgentVoice> {
  const isAr = input.locale === "ar";
  const req: LlmRequest = {
    system: def.systemPrompt + "\n\n" + (isAr ? COUNCIL_INSTRUCTION_AR : COUNCIL_INSTRUCTION_EN),
    user: def.buildUserPrompt(input),
    context: {
      metrics: input.context.metrics,
      relevantNodes: input.context.relevantNodes.slice(0, 12),
      // Phase RAG-3 — retrieved document snippets the agent may cite.
      documents: (input.context.documents ?? []).slice(0, 4),
      // Phase RAG-4 — multi-hop causal context (related nodes + links).
      causalGraph: input.context.graph ?? undefined,
    },
    expectJson: true,
    maxTokens: 600,
    temperature: 0.7,
    model: councilModel(),
  };

  const stubAsText = (r: LlmRequest) => {
    const v = def.stubVoice(input);
    return JSON.stringify(v);
  };

  const res = await callLlm(req, stubAsText);
  const parsed = extractJson<{
    position: AgentVoice["position"];
    thesis: string;
    evidence: AgentVoice["evidence"];
  }>(res.text);

  const docs = input.context.documents;
  if (!parsed) {
    const fallback = def.stubVoice(input);
    return {
      agentId: def.id,
      speakerLabel: { ar: def.speakerLabelAr, en: def.speakerLabelEn },
      position: fallback.position,
      thesis: fallback.thesis,
      evidence: withDocumentEvidence(fallback.evidence, docs),
    };
  }

  return {
    agentId: def.id,
    speakerLabel: { ar: def.speakerLabelAr, en: def.speakerLabelEn },
    position: parsed.position,
    thesis: parsed.thesis,
    evidence: withDocumentEvidence(parsed.evidence, docs),
  };
}
