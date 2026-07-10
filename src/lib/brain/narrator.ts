// narrator.ts — the editorial voice of the brain.
//
// Every brain output is run through the narrator before it reaches the
// user. The narrator's job is to convert structured findings into
// editorial-quality prose: an opening line that's not "data went up",
// causal chains expressed in natural language, and a closing line that
// names the next decision the human owns.
//
// Three registers:
//   - "headline"   — 6-12 words, no preamble, used in cards/tooltips
//   - "editorial"  — 60-120 words, used in the Decision Theater & details
//   - "executive"  — 200-400 words, used in the digest emails & reports
//
// The narrator is bilingual (ar/en). Each register has its own prompt
// template; outputs are cached per (orgId, dataDigest, register).
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 4.

export type NarrativeRegister = "headline" | "editorial" | "executive";

export type NarrativeRequest = {
  register: NarrativeRegister;
  locale: "ar" | "en";
  facts: Record<string, any>;          // structured input
  citations?: { ref: string; label: string }[];
  toneOverride?: "neutral" | "urgent" | "celebratory" | "cautious";
  // Cache keying — same (scope, topic, register, locale, factsHash) returns cached text.
  scope?: string;                       // tenant id; defaults to "default"
  topic?: string;                       // "revenue" | "occupancy" | "dairy-expiry" | etc.
  // Optional summary the editorial should expand on (helps the model).
  summary?: string;
  // Cache TTL override (ms). Defaults to 1 hour.
  ttlMs?: number;
};

export type Narrative = {
  text: string;
  wordCount: number;
  ms: number;
  cacheHit: boolean;
  isStub: boolean;
  model?: string;
};

export interface Narrator {
  write(req: NarrativeRequest): Promise<Narrative>;
  invalidate(scope: { orgId: string; tag?: string }): Promise<void>;
}
