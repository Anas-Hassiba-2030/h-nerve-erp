// simulator.ts — the what-if propagator.
//
// Given a hypothetical change to a node ("Arena occupancy = 30% next
// month"), propagate the effect along causal edges to produce a
// projected delta on every reachable downstream node.
//
// Algorithm: weighted BFS with attenuation. Each hop multiplies by the
// edge weight × confidence; cycles are broken by depth cap; nodes get a
// ranked impact score.
//
// The simulator is also the engine behind the "Time Machine" (Phase 11)
// when used in counterfactual mode — replay history with a different
// decision and see how outcomes diverge.
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 2.

import type { CausalGraph, GraphNode } from "./graph";

export type Perturbation = {
  nodeId: string;
  field: string;
  delta: number; // signed relative change e.g. -0.4 = drop by 40%
  validFrom: Date;
  validTo?: Date;
};

export type ImpactRow = {
  node: GraphNode;
  projectedDelta: number;
  confidence: number;
  hops: number;
  pathSummary: string; // human-readable causal chain
};

export interface Simulator {
  run(graph: CausalGraph, perturbation: Perturbation, depthCap?: number): Promise<ImpactRow[]>;
  counterfactual(graph: CausalGraph, atDate: Date, alternateDecision: any): Promise<ImpactRow[]>;
}
