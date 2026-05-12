// agents/base.ts — shared types and prompt scaffolding for all council agents.
//
// Every agent returns a structured AgentVoice via the LLM. The model is
// asked to emit JSON with a strict shape; if it fails or is in stub mode,
// the agent's deterministic fallback runs.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import { callLlm, extractJson, type LlmRequest } from "../llm";
import type { AgentVoice } from "../council";

export type AgentInput = {
  topic: string;
  // Compact subgraph snapshot — agents reason over this without needing DB access.
  context: {
    summary: string;
    metrics: Record<string, number | string>;
    relevantNodes: Array<{ id: string; kind: string; label: string }>;
  };
  locale: "ar" | "en";
};

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
    },
    expectJson: true,
    maxTokens: 600,
    temperature: 0.7,
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

  if (!parsed) {
    const fallback = def.stubVoice(input);
    return {
      agentId: def.id,
      speakerLabel: { ar: def.speakerLabelAr, en: def.speakerLabelEn },
      position: fallback.position,
      thesis: fallback.thesis,
      evidence: fallback.evidence,
    };
  }

  return {
    agentId: def.id,
    speakerLabel: { ar: def.speakerLabelAr, en: def.speakerLabelEn },
    position: parsed.position,
    thesis: parsed.thesis,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 3) : [],
  };
}
