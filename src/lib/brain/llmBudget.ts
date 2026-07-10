// lib/brain/llmBudget.ts — per-tenant daily LLM-call budget.
//
// Complements the two guards that already exist:
//   - rateLimit (lib/import/rateLimit.ts): per-USER, short window — blunts bursts.
//   - BRAIN_MAX_LLM_CALLS (lib/brain/llm.ts): per-PROCESS lifetime cap — stops
//     runaway loops from draining the whole API budget.
// This one is per-TENANT per-DAY: one noisy workspace can't spend every other
// tenant's share. On breach the caller degrades to STUB mode (the answer still
// arrives, canned) rather than erroring — same philosophy as llm.ts.
//
// Scope-honest, mirrors rateLimit: in-memory, per-process, resets on restart,
// NOT shared across instances. Swap the Map for Redis behind this same
// signature when scaling horizontally.

type TenantBucket = { day: string; used: number };

const tenantBuckets = new Map<string, TenantBucket>();

export type TenantBudgetResult = {
  allowed: boolean;
  used: number;
  cap: number;
};

/** UTC day key — the budget window rolls at midnight UTC. */
function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function capFromEnv(): number {
  const raw = Number(process.env.BRAIN_TENANT_DAILY_LLM_CALLS ?? 300);
  return Number.isFinite(raw) ? raw : 300;
}

/**
 * Check (without consuming) whether `tenant` still has daily budget.
 * cap <= 0 disables the guard entirely (allowed, cap 0).
 */
export function checkTenantLlmBudget(
  tenant: string,
  now: Date = new Date(),
  cap: number = capFromEnv(),
): TenantBudgetResult {
  if (cap <= 0) return { allowed: true, used: 0, cap };
  const day = dayKey(now);
  const b = tenantBuckets.get(tenant);
  const used = b && b.day === day ? b.used : 0;
  return { allowed: used < cap, used, cap };
}

/**
 * Record one LLM-bound request for `tenant`. Call only on the LIVE path —
 * stub answers are free and must not eat the budget.
 */
export function consumeTenantLlmBudget(tenant: string, now: Date = new Date()): void {
  const day = dayKey(now);
  // Opportunistic sweep: buckets from previous days are dead weight.
  if (tenantBuckets.size > 500) {
    for (const [k, b] of tenantBuckets) {
      if (b.day !== day) tenantBuckets.delete(k);
    }
  }
  const b = tenantBuckets.get(tenant);
  if (!b || b.day !== day) {
    tenantBuckets.set(tenant, { day, used: 1 });
    return;
  }
  b.used++;
}

/** Test seam — clear all buckets. */
export function __resetTenantLlmBudgets(): void {
  tenantBuckets.clear();
}
