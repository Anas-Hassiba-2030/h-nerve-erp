// lib/brain/ragEval.ts — Phase RAG-6: decomposed RAG evaluation (the triad).
//
// One trust number hides where a RAG answer went wrong. The standard fix
// (ch. 21) is to decompose quality into three independent axes:
//
//   • context-relevance  — did we retrieve the right material for the query?
//   • faithfulness        — is the answer grounded in that retrieved material
//                           (no invented claims)? a.k.a. groundedness.
//   • answer-relevance    — does the answer actually address the query?
//
// A weak score on any axis localizes the failure: bad retrieval vs. a
// hallucinating generator vs. an off-topic answer. The aggregate feeds the
// Brain-IQ trust telemetry (ragEval.live.ts → meta.reflector.ts).
//
// Pure + dependency-light (only the verifier's claim extractor): deterministic,
// no DB/network, unit-testable. The CONTEXT-relevance axis is best sourced
// from the retriever's own scores (CRAG grounding), so it's an input here.

import { extractClaims, normalizeDigits } from "./verifier";

// Compact bilingual stopword set — kept local so this module stays import-light.
const STOP = new Set([
  "a","an","the","and","or","but","if","then","of","to","for","with","at","on",
  "in","is","are","was","were","be","been","by","as","that","this","it","its",
  "from","into","what","which","who","whom","how","why","when","does","do","did",
  "our","your","their","we","you","they","i","he","she","will","would","should",
  "في","من","على","إلى","عن","مع","هذا","هذه","ما","لا","أن","هل","كيف","لماذا",
  "كم","التي","الذي","نحن","هم","هي","هو","عند","بين",
]);

const WORD_RE = /[\p{L}\p{N}_]+/gu;

function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of (text || "").toLowerCase().match(WORD_RE) ?? []) {
    if (m.length >= 2 && !STOP.has(m)) out.add(m);
  }
  return out;
}

/**
 * Faithfulness / groundedness: of the concrete claims in the answer (numbers,
 * percentages, currency, named tokens), what fraction appear in the retrieved
 * context text? An answer with no checkable claims scores 1 (nothing to
 * contradict). 1 = fully grounded, 0 = every claim is unsupported.
 */
export function scoreFaithfulness(answer: string, contextText: string): number {
  const claims = extractClaims(answer || "");
  if (claims.length === 0) return 1;
  const haystack = (contextText || "").toLowerCase();
  // Digit-normalize so an Arabic-numeral claim (٨٤٬٠٠٠) grounds against ASCII
  // context (84,000) and vice versa; strip thousands separators (, ، ٬) too.
  const haystackDigits = normalizeDigits(haystack).replace(/[,،٬\s]/g, "");
  let grounded = 0;
  for (const c of claims) {
    const tok = c.token.toLowerCase();
    const tokDigits = normalizeDigits(tok).replace(/[,،٬\s]/g, "");
    if (haystack.includes(tok) || (tokDigits && haystackDigits.includes(tokDigits))) grounded++;
  }
  return grounded / claims.length;
}

/**
 * Answer-relevance: recall of the query's content terms in the answer — does
 * the answer engage with what was asked? 1 = every query term is addressed.
 * A query with no content terms scores 1 (nothing specific to miss).
 */
export function scoreAnswerRelevance(query: string, answer: string): number {
  const q = contentTokens(query);
  if (q.size === 0) return 1;
  const a = contentTokens(answer);
  let hit = 0;
  for (const t of q) if (a.has(t)) hit++;
  return hit / q.size;
}

export type RagTriad = {
  contextRelevance: number;
  faithfulness: number;
  answerRelevance: number;
  /** Weighted aggregate in [0,1]. Faithfulness weighted highest (groundedness matters most). */
  overall: number;
};

export type RagTriadInput = {
  query: string;
  answer: string;
  /** Flattened text of the retrieved context the answer was grounded on. */
  contextText: string;
  /**
   * Context-relevance in [0,1], ideally the retriever/CRAG grounding score.
   * Falls back to lexical query↔context overlap when omitted.
   */
  contextRelevance?: number;
};

/** Compute the decomposed RAG triad + a weighted aggregate. */
export function evaluateRagTriad(input: RagTriadInput): RagTriad {
  const faithfulness = scoreFaithfulness(input.answer, input.contextText);
  const answerRelevance = scoreAnswerRelevance(input.query, input.answer);
  const contextRelevance =
    typeof input.contextRelevance === "number"
      ? clamp01(input.contextRelevance)
      : scoreAnswerRelevance(input.query, input.contextText); // lexical fallback

  // Faithfulness is the heaviest axis — a confident, on-topic, ungrounded
  // answer is the most dangerous failure, so it should drag the aggregate.
  const overall = clamp01(0.3 * contextRelevance + 0.45 * faithfulness + 0.25 * answerRelevance);

  return {
    contextRelevance,
    faithfulness,
    answerRelevance,
    overall: Number(overall.toFixed(4)),
  };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
