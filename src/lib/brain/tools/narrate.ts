// lib/brain/tools/narrate.ts
import { z } from "zod";
import { narrator } from "../narrator.claude";
import type { BrainTool } from "./types";

export const narrateInput = z.object({
  register: z.enum(["headline", "editorial", "executive"]),
  locale: z.enum(["ar", "en"]),
  topic: z.string().optional(),
  facts: z.record(z.any()),
});
export type NarrateInput = z.infer<typeof narrateInput>;

export const narrateTool: BrainTool<NarrateInput, { text: string; wordCount: number; isStub: boolean }> = {
  name: "narrate",
  description:
    "Render facts as editorial bilingual prose in one of three registers (headline/editorial/executive). Use to turn structured findings into a readable answer.",
  inputSchema: narrateInput,
  run: async (input) => {
    const n = await narrator().write({ register: input.register, locale: input.locale, topic: input.topic, facts: input.facts });
    return { text: n.text, wordCount: n.wordCount, isStub: n.isStub };
  },
};
