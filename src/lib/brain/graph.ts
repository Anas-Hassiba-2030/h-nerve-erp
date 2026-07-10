// graph.ts — the causal graph of the entire business.
//
// Every business entity (Hotel, Booking, DairyBatch, Farm, Crop,
// Transaction, Forecast, Plan, etc.) is a NODE. Edges are directed
// causal relationships with a weight in [-1, 1] — positive means
// "more of source → more of target", negative is the inverse.
//
// Edges may be either:
//   - structural (declared by the schema: a Booking belongs to a Hotel)
//   - causal    (learned or hand-authored: BookingsUp → DairyDemandUp)
//
// The graph is the substrate the Simulator propagates over, the
// Memory indexes against, and the Narrator references for citations.
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 1.

export type NodeKind =
  | "Hotel" | "Booking" | "Room"
  | "DairyBatch" | "MilkSource"
  | "Farm" | "Crop" | "SensorReading"
  | "Program" | "Cohort"
  | "Transaction" | "Account"
  | "Forecast" | "Plan" | "Insight"
  | "Company" | "User";

export type CausalEdgeKind = "structural" | "causal" | "learned" | "manual";

export type GraphNode = {
  id: string;
  kind: NodeKind;
  label: string;
  ts: Date;
  // arbitrary domain payload — kept lean so the graph stays small
  payload: Record<string, number | string | boolean | null>;
};

export type GraphEdge = {
  from: string;
  to: string;
  kind: CausalEdgeKind;
  weight: number;       // [-1, 1]
  confidence: number;   // [0, 1]
  evidenceCount: number;
};

export interface CausalGraph {
  upsertNode(node: GraphNode): Promise<void>;
  upsertEdge(edge: GraphEdge): Promise<void>;
  neighbors(id: string, depth?: number): Promise<GraphNode[]>;
  shortestCausalPath(from: string, to: string): Promise<GraphEdge[]>;
  subgraph(seedIds: string[], depth: number): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
}
