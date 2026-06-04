// seed.ts — produce 2 example workflows so the index isn't empty.
// Phase 12 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import { defaultParams, getTemplate } from "./templates";

type SeedNode = { kind: "trigger" | "condition" | "action"; key: string; params?: Record<string, any> };
type SeedEdge = { from: number; to: number };

async function seedOne(args: {
  name: string;
  description: string;
  enabled: boolean;
  nodes: SeedNode[];
  edges: SeedEdge[];
}) {
  // Build node creates.
  const nodeCreates = args.nodes.map((n, i) => {
    const t = getTemplate(n.key);
    if (!t) throw new Error(`missing template ${n.key}`);
    const params = { ...defaultParams(t), ...(n.params ?? {}) };
    return {
      kind: t.kind,
      templateKey: t.key,
      configJson: JSON.stringify(params),
      // x = column index; y = node order within column. The studio canvas
      // uses these as initial positions but supports drag-to-reposition.
      posX: t.defaultColumn,
      posY: i,
    };
  });

  const wf = await prisma.workflow.create({
    data: {
      scope: "default",
      name: args.name,
      description: args.description,
      enabled: args.enabled,
      status: args.enabled ? "ACTIVE" : "DRAFT",
      nodes: { create: nodeCreates },
    },
    include: { nodes: { orderBy: { createdAt: "asc" } } },
  });

  // Build edges by index → node id.
  for (const e of args.edges) {
    const fromNode = wf.nodes[e.from];
    const toNode = wf.nodes[e.to];
    if (!fromNode || !toNode) continue;
    await prisma.workflowEdge.create({
      data: {
        workflowId: wf.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
      },
    });
  }
  return wf;
}

export async function seedWorkflows(): Promise<{ written: number; durationMs: number }> {
  const t0 = Date.now();
  // Idempotent — clear any prior seed-named workflows.
  await prisma.workflow.deleteMany({
    where: {
      OR: [
        { name: "Dairy expiry → distributor channel" },
        { name: "Critical farm alert → escalation" },
      ],
    },
  });

  // Workflow #1 — the canonical "dairy expiry redirect" demo flow.
  await seedOne({
    name: "Dairy expiry → distributor channel",
    description:
      "When any Maha batch is within 3 days of expiry, ping procurement on Slack, generate a draft redirect plan, and record the event to memory.",
    enabled: true,
    nodes: [
      { kind: "trigger",   key: "dairy.expiry_within",   params: { days: 3 } },
      { kind: "condition", key: "filter.severity_at_least", params: { level: "WARN" } },
      { kind: "action",    key: "action.notify_slack",   params: { channel: "procurement" } },
      { kind: "action",    key: "action.generate_plan",  params: {} },
      { kind: "action",    key: "action.record_memory",  params: {} },
    ],
    edges: [
      { from: 0, to: 1 }, // trigger → severity
      { from: 1, to: 2 }, // severity → slack
      { from: 1, to: 3 }, // severity → plan
      { from: 1, to: 4 }, // severity → memory
    ],
  });

  // Workflow #2 — farm critical → escalation.
  await seedOne({
    name: "Critical farm alert → escalation",
    description:
      "When soil moisture stays under 30% for 24h on any farm, create a CRITICAL insight, email ops, and convene the council.",
    enabled: false,
    nodes: [
      { kind: "trigger",   key: "farm.moisture_below", params: { pct: 30, hours: 24 } },
      { kind: "condition", key: "filter.weekday",      params: {} },
      { kind: "action",    key: "action.create_insight", params: { severity: "CRITICAL" } },
      { kind: "action",    key: "action.notify_email",   params: { to: "ops@hourani.jo" } },
      { kind: "action",    key: "action.convene_council",params: { topic: "Farm moisture failure — triage now" } },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ],
  });

  return { written: 2, durationMs: Date.now() - t0 };
}
