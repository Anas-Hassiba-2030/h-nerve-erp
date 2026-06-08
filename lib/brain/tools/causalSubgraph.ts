// lib/brain/tools/causalSubgraph.ts
import { z } from "zod";
import { retrieveGraphContext } from "../graphrag.live";
import type { BrainTool } from "./types";

export const causalSubgraphInput = z.object({
  question: z.string().min(1),
  k: z.number().int().positive().max(20).optional(),
  topSeeds: z.number().int().positive().max(10).optional(),
});
export type CausalSubgraphInput = z.infer<typeof causalSubgraphInput>;

export const causalSubgraphTool: BrainTool<
  CausalSubgraphInput,
  { nodes: Array<{ id: string; kind: string; label: string; score: number; isSeed: boolean }>; links: string[] }
> = {
  name: "causalSubgraph",
  description:
    "Retrieve the causal subgraph most relevant to a question: related business entities and signed causal links (e.g. 'Arena bookings →(+) Maha demand'). Use to reason about second-order effects between business units.",
  inputSchema: causalSubgraphInput,
  run: async (input) => {
    const ctx = await retrieveGraphContext(input.question, { k: input.k, topSeeds: input.topSeeds });
    return { nodes: ctx.nodes, links: ctx.links };
  },
};
