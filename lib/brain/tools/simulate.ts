// lib/brain/tools/simulate.ts
import { z } from "zod";
import { causalGraph } from "../graph.prisma";
import { simulateOnSnapshot } from "../simulator.bfs";
import type { BrainTool } from "./types";

export const simulateInput = z.object({
  nodeId: z.string().min(1),
  delta: z.number(),
  depthCap: z.number().int().positive().max(8).optional(),
});
export type SimulateInput = z.infer<typeof simulateInput>;

export type SimulateImpact = {
  nodeId: string;
  label: string;
  projectedDelta: number;
  confidence: number;
  hops: number;
  pathSummary: string;
};

export const simulateTool: BrainTool<SimulateInput, { impacts: SimulateImpact[] }> = {
  name: "simulate",
  description:
    "Project the downstream impact of perturbing one causal-graph node by a relative delta. Returns ranked impacts with confidence and the causal path. Use for what-if questions.",
  inputSchema: simulateInput,
  run: async (input) => {
    const snapshot = await causalGraph().loadAll();
    const rows = simulateOnSnapshot(snapshot, { nodeId: input.nodeId, delta: input.delta }, input.depthCap);
    return {
      impacts: rows.map((r) => ({
        nodeId: r.node.id,
        label: r.node.label,
        projectedDelta: r.projectedDelta,
        confidence: r.confidence,
        hops: r.hops,
        pathSummary: r.pathSummary,
      })),
    };
  },
};
