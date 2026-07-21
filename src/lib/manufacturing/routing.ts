// Manufacturing v2 — production-routing math (Odoo mrp model, translated).
// Pure functions only (unit-tested in routing.test.ts); DB wiring lives in
// manufacturing.ts and the /manufacturing server actions. Conventions match
// rollupCost: plain numbers in, 2-decimal money out.

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Expected minutes for one work order covering a whole manufacturing
 * order: the BOM operation's per-run duration scales with runs and is
 * slowed/sped by the work center's efficiency % (Odoo time_efficiency:
 * 50% ⇒ twice as long), while setup/cleanup are flat per work order
 * (Odoo time_start/time_stop). Throws on a non-positive efficiency —
 * a center that can't work can't be scheduled.
 */
export function plannedWorkOrderMinutes(args: {
  durationMinutes: number;
  runs: number;
  efficiency: number;
  setupMinutes?: number;
  cleanupMinutes?: number;
}): number {
  const { durationMinutes, runs, efficiency } = args;
  if (efficiency <= 0) throw new Error("plannedWorkOrderMinutes: efficiency must be > 0");
  const setup = args.setupMinutes ?? 0;
  const cleanup = args.cleanupMinutes ?? 0;
  return r2(setup + cleanup + (durationMinutes * runs * 100) / efficiency);
}

/** Labor cost of a work order: minutes at the frozen hourly rate. */
export function workOrderLaborCost(args: { minutes: number; costPerHour: number }): number {
  return r2((args.minutes / 60) * args.costPerHour);
}

export type ByproductShare = {
  /** Byproduct units per ONE run of the BOM. */
  quantity: number;
  /** % of total order cost carried by this byproduct (0–100). */
  costSharePercent: number;
};

export type ByproductAllocation = {
  /** Total units this order yields of the byproduct (quantity × runs). */
  units: number;
  /** Money allocated to this byproduct out of the order's total cost. */
  cost: number;
  /** cost / units — the MFG_PRODUCE movement's unitCost. */
  unitCost: number;
};

/**
 * Splits an order's total cost between the main output and its
 * byproducts by cost-share % (Odoo mrp.bom.byproduct cost_share).
 * The main output carries the remainder. Throws when shares exceed
 * 100% or a positive share comes with zero yielded units (the cost
 * would have no stock to land on).
 */
export function allocateByproductCost(args: {
  totalCost: number;
  outputUnits: number;
  runs: number;
  byproducts: ByproductShare[];
}): { main: { cost: number; unitCost: number }; byproducts: ByproductAllocation[] } {
  const { totalCost, outputUnits, runs, byproducts } = args;
  if (outputUnits <= 0) throw new Error("allocateByproductCost: zero output units");

  const shareSum = byproducts.reduce((s, b) => s + b.costSharePercent, 0);
  if (shareSum > 100) {
    throw new Error(`allocateByproductCost: cost shares sum to ${shareSum}% (> 100%)`);
  }

  const allocations: ByproductAllocation[] = byproducts.map((b) => {
    const units = b.quantity * runs;
    const cost = r2((totalCost * b.costSharePercent) / 100);
    if (cost > 0 && units <= 0) {
      throw new Error("allocateByproductCost: positive cost share on a zero-quantity byproduct");
    }
    return { units, cost, unitCost: units > 0 ? r2(cost / units) : 0 };
  });

  const byproductCost = r2(allocations.reduce((s, a) => s + a.cost, 0));
  const mainCost = r2(totalCost - byproductCost);
  return {
    main: { cost: mainCost, unitCost: r2(mainCost / outputUnits) },
    byproducts: allocations,
  };
}

/**
 * True when every generated work order has reached a terminal state —
 * the completion gate for a routed manufacturing order. Orders without
 * routing (no work orders) always pass.
 */
export function workOrdersComplete(statuses: string[]): boolean {
  return statuses.every((s) => s === "DONE" || s === "CANCELLED");
}

/**
 * Routing labor for the cost rollup: the frozen laborCost of every DONE
 * work order (cancelled stages cost nothing; null-frozen cost = 0).
 */
export function routingLaborTotal(workOrders: { status: string; laborCost: number | null }[]): number {
  return r2(
    workOrders.reduce((s, w) => s + (w.status === "DONE" ? (w.laborCost ?? 0) : 0), 0),
  );
}

// ── Operation dependencies (Odoo "Operation Dependencies" — arbitrary DAG) ──

export type DependencyEdge = { operationId: string; blockedByOperationId: string };

/**
 * True when the blocked-by graph over `operationIds` has a cycle (Kahn's
 * algorithm). A cyclic routing can never be scheduled — every stage
 * would wait on a stage that's waiting on it — so BOM save rejects it
 * before it ever reaches a work order.
 */
export function hasDependencyCycle(operationIds: string[], edges: DependencyEdge[]): boolean {
  const indegree = new Map(operationIds.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(operationIds.map((id) => [id, []]));
  for (const e of edges) {
    if (!indegree.has(e.operationId) || !indegree.has(e.blockedByOperationId)) continue;
    // edge direction for topo order: blockedByOperationId -> operationId
    adj.get(e.blockedByOperationId)!.push(e.operationId);
    indegree.set(e.operationId, (indegree.get(e.operationId) ?? 0) + 1);
  }
  const queue = operationIds.filter((id) => indegree.get(id) === 0);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited++;
    for (const next of adj.get(id) ?? []) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return visited !== operationIds.length;
}

/**
 * True when a stage may start: every operation that blocks it (by id)
 * has a sibling work order that's DONE or CANCELLED. A stage with no
 * blockers (or whose blocker never got a work order — e.g. skipped by
 * a partial routing) is unblocked.
 */
export function stageUnblocked(
  blockedByOperationIds: string[],
  siblingWorkOrders: { operationId: string | null; status: string }[],
): boolean {
  if (blockedByOperationIds.length === 0) return true;
  const doneOrCancelled = new Set(
    siblingWorkOrders
      .filter((w) => w.status === "DONE" || w.status === "CANCELLED")
      .map((w) => w.operationId),
  );
  return blockedByOperationIds.every((id) => doneOrCancelled.has(id));
}

// ── Auto duration (Odoo time_mode "based on last N work orders") ──

/**
 * Expected minutes for a routing stage in "auto" mode: the average of
 * the most recent `n` DONE work orders' actual-or-planned minutes for
 * that operation, most recent first. Falls back to the BOM's authored
 * manual duration until at least one data point exists — a brand-new
 * operation has no history to average.
 */
export function autoStageDuration(args: {
  recentMinutes: number[]; // most-recent-first, already capped by the caller
  fallbackManualMinutes: number;
  n?: number;
}): number {
  const n = args.n ?? 5;
  const sample = args.recentMinutes.slice(0, n);
  if (sample.length === 0) return r2(args.fallbackManualMinutes);
  return r2(sample.reduce((s, m) => s + m, 0) / sample.length);
}
