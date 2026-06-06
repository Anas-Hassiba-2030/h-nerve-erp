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
// See docs/PHASES-INTELLIGENCE.md — Phase 3.

export type AgentVoice = {
  agentId: string;          // "dairy-expert", "finance-brain", etc.
  speakerLabel: { ar: string; en: string };
  position: "support" | "oppose" | "qualify" | "moderate";
  thesis: string;
  evidence: { ref: string; weight: number; label?: string }[];
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
};

export interface Council {
  convene(topic: string, contextRefs: string[], scopeCompanyId?: string): Promise<CouncilSession>;
  replay(sessionId: string): Promise<CouncilSession | null>;
}
