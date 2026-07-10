// council.ts — the multi-agent council.
//
// A panel of domain expert agents reasons through a decision the way a
// real board meeting would. Each agent gets:
//   - the relevant subgraph
//   - the recent memory hits
//   - a domain-specific system prompt
//
// Agents speak in turn, with structured opinions. A moderator agent
// synthesizes the discussion into a single recommendation with a
// confidence score and a dissent record.
//
// The user sees the full transcript ("Decision Theater" — Phase 9). The
// brain stores it for later review and for feedback-loop training.
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 3.

export type AgentVoice = {
  agentId: string;          // "dairy-expert", "finance-brain", etc.
  speakerLabel: { ar: string; en: string };
  position: "support" | "oppose" | "qualify" | "moderate";
  thesis: string;
  evidence: { ref: string; weight: number; label?: string }[];
};

// The evidence base a council session reasoned over — persisted so the saved
// transcript can show the proofs behind the recommendation: the live metrics
// the agents saw, the documents they could cite, and the in-scope entities.
export type CouncilSources = {
  engine: "live" | "stub";
  metrics: { key: string; value: string }[];
  documents: { title: string; kind: string }[];
  entities: { kind: string; label: string }[];
};

export type CouncilSession = {
  id: string;
  topic: string;
  ranAt: Date;
  voices: AgentVoice[];
  synthesis: {
    recommendation: string;
    confidence: number;
    dissentNote?: string;
  };
  pinned?: boolean;
  sources?: CouncilSources;
};

// The scope fences the debate. `companyIds` restricts which business units the
// sub-agents see (empty = the whole group). `lenses` narrows WHICH aspect they
// reason about — "finance", "operations", "supply", "sustainability", "people",
// "analytics" — so the council can debate a single facet of a single unit
// instead of everything about everyone. Both optional and composable.
export type CouncilLens =
  | "finance" | "operations" | "supply" | "sustainability" | "people" | "analytics";

export type CouncilScope = {
  companyIds?: string[];
  lenses?: CouncilLens[];
};

export interface Council {
  // `locale` forces the debate language. When omitted it is inferred from the
  // topic text, but callers with a known UI locale should always pass it so the
  // council answers in the user's language regardless of what characters the
  // (possibly auto-prefixed) topic contains.
  convene(
    topic: string,
    contextRefs?: string[],
    scope?: CouncilScope,
    locale?: "ar" | "en",
  ): Promise<CouncilSession>;
  replay(sessionId: string): Promise<CouncilSession | null>;
}
