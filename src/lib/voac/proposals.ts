// lib/voac/proposals.ts — turning a role's narrative answer into structured
// proposals, or honestly reporting that it did not produce any.
//
// The skill documents each end with an "Output format" section in prose. Prose
// is right for the human-facing narrative and useless for a queue that has to
// rank, cap and persist. So the driver appends a strict output contract to the
// skill document at runtime, and this module parses what comes back.
//
// THE RULE THAT MATTERS: when the contract is not honoured, this returns ZERO
// proposals and a parse error. It never salvages a proposal out of the prose.
// A proposal invented by a parser would carry a confidence nobody assigned and
// a value nobody computed, and it would land in front of a manager looking
// exactly like one the agent actually stood behind.
//
// The contract lives here rather than inside the .md files because those files
// are SkillOpt's trainable surface — the optimizer rewrites them, and a machine
// rewriting its own output contract is how a pipeline silently stops parsing.

import { z } from "zod";

/**
 * Appended to the skill document by the driver. Deliberately terse: every token
 * here competes with the role's actual instructions for the model's attention.
 */
export const PROPOSAL_OUTPUT_CONTRACT = `
---
When you have something a human should act on, end your reply with ONE fenced
json block of this exact shape (and nothing after it):

\`\`\`json
{"proposals":[{"title":"...","rationale":"...","estimatedValueJod":1234,"confidence":0.7,"counterparty":"COMPANY_CODE"}]}
\`\`\`

Rules:
- confidence is 0..1 and is YOUR belief in your own estimate.
- estimatedValueJod: omit it entirely if you cannot compute it. Do not guess.
  An unquantified proposal is ranked below every quantified one, which is the
  correct outcome — it is not a reason to invent a number.
- counterparty: only for a cross-company proposal, naming who must also act.
- If you have nothing worth a human's attention, use {"proposals":[]}.
  An empty list is a valid and often correct answer.
`.trim();

const proposalSchema = z.object({
  title: z.string().min(1).max(200),
  rationale: z.string().min(1).max(4000),
  estimatedValueJod: z.number().finite().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  counterparty: z.string().max(60).optional(),
});

const envelopeSchema = z.object({ proposals: z.array(proposalSchema).max(25) });

export type ParsedProposal = z.infer<typeof proposalSchema>;

export type ExtractResult = {
  proposals: ParsedProposal[];
  /** Null when parsing succeeded. Non-null is recorded on the run, not hidden. */
  parseError: string | null;
};

/** Pull the LAST fenced json block out of a reply. */
function lastJsonBlock(text: string): string | null {
  const re = /```(?:json)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let last: string | null = null;
  while ((match = re.exec(text))) last = match[1].trim();
  return last;
}

/**
 * Extract proposals from a role's reply.
 *
 * Takes the LAST json block because the contract says the block ends the reply,
 * and a model that reasons out loud will often show an earlier draft block.
 * Taking the first would persist a draft the model then revised.
 */
export function extractProposals(text: string | null | undefined): ExtractResult {
  if (!text || !text.trim()) {
    return { proposals: [], parseError: "Empty reply — no proposals extracted." };
  }

  const block = lastJsonBlock(text);
  if (!block) {
    return { proposals: [], parseError: "No fenced json block found; the output contract was not honoured." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(block);
  } catch {
    return { proposals: [], parseError: "The json block was not valid JSON." };
  }

  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      proposals: [],
      parseError: `Proposal envelope failed validation: ${first ? `${first.path.join(".")} — ${first.message}` : "unknown"}.`,
    };
  }

  return { proposals: parsed.data.proposals, parseError: null };
}

/**
 * The narrative part of a reply — everything before the contract block.
 *
 * Stored as the run's narrative step so the manager reads prose, not JSON.
 */
export function stripProposalBlock(text: string): string {
  return text.replace(/```(?:json)?\s*[\s\S]*?```\s*$/, "").trim();
}
