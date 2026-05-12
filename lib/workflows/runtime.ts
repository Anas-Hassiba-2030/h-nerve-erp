// runtime.ts — workflow executor.
//
// Walks a workflow's nodes in topological order (trigger → conditions →
// actions). Each node returns { fired: boolean, message: string, ms: number }.
// Conditions short-circuit a branch when they don't pass; actions always
// run when reached.
//
// In dryRun mode (test from the studio), actions don't actually mutate
// domain data — they return what they WOULD do. Real run mode (Phase 13
// integrations) will wire the action handlers to live destinations.
//
// Phase 12 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db";
import { TEMPLATES, type Template } from "./templates";

export type RunMode = "test" | "real";

export type TraceEvent = {
  nodeId: string;
  templateKey: string;
  kind: "trigger" | "condition" | "action";
  status: "fired" | "passed" | "skipped" | "failed";
  message: string;
  ms: number;
};

type RuntimeNode = {
  id: string;
  kind: "trigger" | "condition" | "action";
  templateKey: string;
  label: string | null;
  params: Record<string, any>;
};

export async function runWorkflow(
  workflowId: string,
  mode: RunMode = "test"
): Promise<{
  runId: string;
  status: "SUCCESS" | "FAILED" | "DRY_RUN";
  trace: TraceEvent[];
  durationMs: number;
}> {
  const t0 = Date.now();
  const wf = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      nodes: true,
      edges: true,
    },
  });
  if (!wf) throw new Error("workflow not found");

  // Build adjacency from each node id to the nodes it points to.
  const adj = new Map<string, string[]>();
  for (const e of wf.edges) {
    const list = adj.get(e.fromNodeId) ?? [];
    list.push(e.toNodeId);
    adj.set(e.fromNodeId, list);
  }

  const nodes = new Map<string, RuntimeNode>();
  for (const n of wf.nodes) {
    nodes.set(n.id, {
      id: n.id,
      kind: n.kind as RuntimeNode["kind"],
      templateKey: n.templateKey,
      label: n.label,
      params: safeJson(n.configJson),
    });
  }

  // Persist a RUNNING run we can return.
  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      status: mode === "test" ? "DRY_RUN" : "RUNNING",
      triggeredBy: mode === "test" ? "test" : "manual",
      startedAt: new Date(),
    },
  });

  const trace: TraceEvent[] = [];
  let failedAny = false;

  // 1. Walk every trigger; if it fires, BFS its outbound chain.
  const triggers = [...nodes.values()].filter((n) => n.kind === "trigger");
  for (const trig of triggers) {
    const tev = await evalNode(trig, mode);
    trace.push(tev);
    if (tev.status === "fired") {
      await walkFrom(trig.id, nodes, adj, mode, trace, () => {
        failedAny = true;
      });
    }
  }

  const ms = Date.now() - t0;
  const finalStatus: "SUCCESS" | "FAILED" | "DRY_RUN" =
    mode === "test" ? "DRY_RUN" : failedAny ? "FAILED" : "SUCCESS";

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      durationMs: ms,
      traceJson: JSON.stringify(trace),
    },
  });
  if (mode === "real") {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    });
  }

  return { runId: run.id, status: finalStatus, trace, durationMs: ms };
}

async function walkFrom(
  fromId: string,
  nodes: Map<string, RuntimeNode>,
  adj: Map<string, string[]>,
  mode: RunMode,
  trace: TraceEvent[],
  onFail: () => void
) {
  const next = adj.get(fromId) ?? [];
  for (const nextId of next) {
    const n = nodes.get(nextId);
    if (!n) continue;
    const ev = await evalNode(n, mode);
    trace.push(ev);
    if (ev.status === "failed") onFail();
    // Conditions short-circuit when they don't pass.
    if (n.kind === "condition" && ev.status !== "passed") continue;
    // Actions: even if fired, walk the rest in case downstream actions chain.
    await walkFrom(nextId, nodes, adj, mode, trace, onFail);
  }
}

async function evalNode(n: RuntimeNode, mode: RunMode): Promise<TraceEvent> {
  const t0 = Date.now();
  const tpl = TEMPLATES[n.templateKey];
  if (!tpl) {
    return {
      nodeId: n.id,
      templateKey: n.templateKey,
      kind: n.kind,
      status: "failed",
      message: `unknown template: ${n.templateKey}`,
      ms: Date.now() - t0,
    };
  }

  try {
    if (n.kind === "trigger") {
      const result = await evalTrigger(tpl, n.params);
      return {
        nodeId: n.id,
        templateKey: n.templateKey,
        kind: "trigger",
        status: result.fired ? "fired" : "skipped",
        message: result.message,
        ms: Date.now() - t0,
      };
    }
    if (n.kind === "condition") {
      const result = evalCondition(tpl, n.params);
      return {
        nodeId: n.id,
        templateKey: n.templateKey,
        kind: "condition",
        status: result.passed ? "passed" : "skipped",
        message: result.message,
        ms: Date.now() - t0,
      };
    }
    // action
    const result = await evalAction(tpl, n.params, mode);
    return {
      nodeId: n.id,
      templateKey: n.templateKey,
      kind: "action",
      status: "fired",
      message: result.message,
      ms: Date.now() - t0,
    };
  } catch (e: any) {
    return {
      nodeId: n.id,
      templateKey: n.templateKey,
      kind: n.kind,
      status: "failed",
      message: e?.message ?? "execution failed",
      ms: Date.now() - t0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Trigger evaluators — query the live domain to decide if firing is
// warranted RIGHT NOW. Test runs use the same logic (no special path).
// ─────────────────────────────────────────────────────────────────────

async function evalTrigger(tpl: Template, params: any): Promise<{ fired: boolean; message: string }> {
  switch (tpl.key) {
    case "dairy.expiry_within": {
      const days = Number(params?.days ?? 3);
      const cutoff = new Date(Date.now() + days * 24 * 3600 * 1000);
      const count = await prisma.dairyBatch.count({
        where: {
          expiryDate: { gte: new Date(), lte: cutoff },
          status: { not: "RECALLED" },
        },
      });
      return {
        fired: count > 0,
        message: count > 0
          ? `${count} batch${count === 1 ? "" : "es"} within ${days} days of expiry`
          : `no batches within ${days}d of expiry`,
      };
    }
    case "hotel.occupancy_below": {
      const threshold = Number(params?.pct ?? 30) / 100;
      const [activeBookings, totalRoomsAgg] = await Promise.all([
        prisma.booking.count({ where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } } }),
        prisma.hotel.aggregate({ _sum: { totalRooms: true } }),
      ]);
      const total = totalRoomsAgg._sum.totalRooms ?? 0;
      const occ = total > 0 ? activeBookings / total : 0;
      return {
        fired: occ < threshold,
        message: `occupancy ${(occ * 100).toFixed(1)}% (${occ < threshold ? "below" : "≥"} ${(threshold * 100).toFixed(0)}%)`,
      };
    }
    case "farm.moisture_below": {
      const pct = Number(params?.pct ?? 30);
      const farms = await prisma.farm.findMany({
        where: { soilMoisture: { lt: pct } },
      });
      return {
        fired: farms.length > 0,
        message: farms.length > 0
          ? `${farms.length} farm${farms.length === 1 ? "" : "s"} below ${pct}% moisture`
          : `all farms ≥ ${pct}% moisture`,
      };
    }
    case "revenue.delta_above": {
      const pct = Number(params?.pct ?? 15) / 100;
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const prev = new Date(since.getTime() - 30 * 24 * 3600 * 1000);
      const tx = await prisma.transaction.findMany({
        where: { kind: "REVENUE", occurredAt: { gte: prev } },
      });
      const cur = tx.filter((t) => t.occurredAt >= since).reduce((a, b) => a + b.amount, 0);
      const prevSum = tx.filter((t) => t.occurredAt < since).reduce((a, b) => a + b.amount, 0);
      const delta = prevSum > 0 ? (cur - prevSum) / prevSum : 0;
      return {
        fired: Math.abs(delta) > pct,
        message: `revenue Δ ${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}% (threshold ${(pct * 100).toFixed(0)}%)`,
      };
    }
    case "time.daily": {
      const hour = Number(params?.hour ?? 9);
      const now = new Date();
      const fired = now.getHours() === hour;
      return {
        fired,
        message: fired
          ? `firing — current hour matches ${String(hour).padStart(2, "0")}:00`
          : `current hour ${String(now.getHours()).padStart(2, "0")} ≠ ${String(hour).padStart(2, "0")}`,
      };
    }
    default:
      return { fired: false, message: "unknown trigger" };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Condition evaluators — pure-functional, no DB.
// ─────────────────────────────────────────────────────────────────────

function evalCondition(tpl: Template, params: any): { passed: boolean; message: string } {
  switch (tpl.key) {
    case "filter.business_hours": {
      const h = new Date().getHours();
      const passed = h >= 8 && h < 17;
      return { passed, message: passed ? "within 08–17" : `outside business hours (${h}:00)` };
    }
    case "filter.weekday": {
      const d = new Date().getDay();
      // Sunday=0, Thursday=4 — Sunday-Thursday in MENA
      const passed = d >= 0 && d <= 4;
      return { passed, message: passed ? "weekday (Sun–Thu)" : "weekend" };
    }
    case "filter.severity_at_least": {
      const level = String(params?.level ?? "WARN");
      // Test runs default to WARN payload — production would read from trigger event.
      const order = ["INFO", "WARN", "CRITICAL"];
      const cur = "WARN";
      const passed = order.indexOf(cur) >= order.indexOf(level);
      return { passed, message: `payload severity ${cur} ${passed ? "≥" : "<"} ${level}` };
    }
    case "filter.tenant_pack": {
      const pack = String(params?.pack ?? "dairy");
      // For the demo we always pass — every tenant has every pack enabled.
      return { passed: true, message: `pack ${pack} enabled` };
    }
    default:
      return { passed: false, message: "unknown condition" };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Action evaluators. In test mode they return what they would do.
// ─────────────────────────────────────────────────────────────────────

async function evalAction(tpl: Template, params: any, mode: RunMode): Promise<{ message: string }> {
  switch (tpl.key) {
    case "action.notify_slack":
      return {
        message:
          mode === "test"
            ? `[dry] would post to #${params?.channel ?? "procurement"}`
            : `posted to #${params?.channel ?? "procurement"}`,
      };
    case "action.notify_email":
      return {
        message:
          mode === "test"
            ? `[dry] would email ${params?.to ?? "ops@…"}`
            : `emailed ${params?.to ?? "ops@…"}`,
      };
    case "action.create_insight":
      return {
        message:
          mode === "test"
            ? `[dry] would create insight @ ${params?.severity ?? "WARN"}`
            : `created insight @ ${params?.severity ?? "WARN"}`,
      };
    case "action.generate_plan":
      return { message: mode === "test" ? "[dry] would generate plan" : "generated plan" };
    case "action.convene_council":
      return {
        message:
          mode === "test"
            ? `[dry] would convene council on "${(params?.topic ?? "topic").slice(0, 32)}…"`
            : `convened council`,
      };
    case "action.record_memory":
      return {
        message: mode === "test" ? "[dry] would record memory" : "recorded memory",
      };
    default:
      return { message: "unknown action" };
  }
}

function safeJson(s: string | null | undefined): Record<string, any> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return typeof v === "object" && v !== null ? v : {};
  } catch {
    return {};
  }
}
