"use server";

// Server action that produces an editorial narrative on demand.
// Called by the <Narrate> tooltip after a 1.2s hover threshold.
//
// Phase 4 of docs/PHASES-INTELLIGENCE.md.

import { requireUser } from "@/lib/session";
import { narrator } from "@/lib/brain/narrator.claude";
import type { NarrativeRegister } from "@/lib/brain/narrator";

export type NarrateInput = {
  topic: string;
  register?: NarrativeRegister;
  locale: "ar" | "en";
  facts: Record<string, any>;
  summary?: string;
  citations?: { ref: string; label: string }[];
};

export type NarrateResult = {
  text: string;
  cacheHit: boolean;
  isStub: boolean;
  ms: number;
  wordCount: number;
};

export async function narrate(input: NarrateInput): Promise<NarrateResult> {
  await requireUser();

  // Sanity-check the topic length so this can't be abused as an open-ended LLM endpoint.
  const topic = (input.topic ?? "general").slice(0, 64);
  const summary = input.summary?.slice(0, 240);
  const facts = sanitizeFacts(input.facts);

  const result = await narrator().write({
    topic,
    register: input.register ?? "editorial",
    locale: input.locale,
    facts,
    summary,
    citations: input.citations?.slice(0, 8),
  });

  return {
    text: result.text,
    cacheHit: result.cacheHit,
    isStub: result.isStub,
    ms: result.ms,
    wordCount: result.wordCount,
  };
}

/** Constrain payload size so a malicious caller can't inflate the LLM bill. */
function sanitizeFacts(facts: any): Record<string, any> {
  if (!facts || typeof facts !== "object") return {};
  const out: Record<string, any> = {};
  let count = 0;
  for (const k of Object.keys(facts)) {
    if (count++ > 32) break;
    const v = facts[k];
    if (v === null) out[k] = null;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 240);
  }
  return out;
}
