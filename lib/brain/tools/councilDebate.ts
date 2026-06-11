// lib/brain/tools/councilDebate.ts
import { z } from "zod";
import { council } from "../council.live";
import type { BrainTool } from "./types";

export const councilDebateInput = z.object({
  topic: z.string().min(1),
  contextRefs: z.array(z.string()).optional(),
  locale: z.enum(["ar", "en"]).optional(),
});
export type CouncilDebateInput = z.infer<typeof councilDebateInput>;

export const councilDebateTool: BrainTool<
  CouncilDebateInput,
  {
    recommendation: string;
    confidence: number;
    dissentNote?: string;
    voices: Array<{ agentId: string; position: string; thesis: string }>;
  }
> = {
  name: "councilDebate",
  description:
    "Convene the multi-agent council on a decision topic. Returns each domain expert's position and thesis plus a synthesized recommendation and confidence. Use for contested or cross-domain decisions.",
  inputSchema: councilDebateInput,
  run: async (input) => {
    const session = await council().convene(input.topic, input.contextRefs ?? [], undefined, input.locale);
    return {
      recommendation: session.synthesis.recommendation,
      confidence: session.synthesis.confidence,
      dissentNote: session.synthesis.dissentNote,
      voices: session.voices.map((v) => ({ agentId: v.agentId, position: v.position, thesis: v.thesis })),
    };
  },
};
