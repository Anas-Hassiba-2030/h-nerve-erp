// lib/brain/tools/recallMemory.ts
import { z } from "zod";
import { memoryLake } from "../memory.live";
import type { BrainTool } from "./types";

export const recallMemoryInput = z.object({
  situation: z.string().min(1),
  topK: z.number().int().positive().max(10).optional(),
});
export type RecallMemoryInput = z.infer<typeof recallMemoryInput>;

export const recallMemoryTool: BrainTool<
  RecallMemoryInput,
  {
    memories: Array<{
      id: string;
      module: string;
      headline: { ar: string; en: string };
      similarity: number;
      outcome?: { metric: string; delta: number; lessonLearned?: string };
    }>;
  }
> = {
  name: "recallMemory",
  description:
    "Recall analogous past situations from episodic memory, ranked by similarity. Use to ground a recommendation in what happened last time.",
  inputSchema: recallMemoryInput,
  run: async (input) => {
    const hits = await memoryLake().recall({ situation: input.situation, topK: input.topK ?? 5 });
    return {
      memories: hits.map((m) => ({
        id: m.id,
        module: m.module,
        headline: m.headline,
        similarity: m.similarity,
        outcome: m.outcome,
      })),
    };
  },
};
