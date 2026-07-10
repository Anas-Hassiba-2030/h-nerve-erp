// lib/brain/actionGuard.ts — one guard call for LLM-triggering server actions.
//
// /api/converse got the full three-layer cost stack in PR #286 (per-user rate
// limit → per-tenant daily budget → per-process lifetime cap). The LLM-heavy
// SERVER ACTIONS (council convene, narrate, docintel upload, plan generation)
// had none of the first two layers — middleware only rate-limits /login, and
// server actions POST to page routes it never inspects. This module closes
// that gap with the same primitives, so every AI button costs from the same
// per-tenant purse as the converse overlay.
//
// Semantics differ from converse on breach: converse degrades to a stub answer
// (a chat must always reply); an action button BLOCKS with a toast instead —
// a stub council session or stub plan silently saved to the DB would violate
// the "visible confirmation" doctrine.
//
// Same scope-honesty as the underlying stores: in-memory, per-process.

import { rateLimit } from "@/lib/import/rateLimit";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { checkTenantLlmBudget, consumeTenantLlmBudget } from "./llmBudget";
import { llmConfig } from "./llm";

export type LlmActionGuardResult =
  | { allowed: true }
  | { allowed: false; reason: "rate" | "budget"; retryAfterSec: number };

/**
 * Guard one LLM-triggering server action for `userId`.
 *
 * - Always applies a per-user fixed-window rate limit (`max` per `windowMs`).
 * - When a real LLM key is configured AND `consumesBudget` (default true),
 *   also checks + consumes the per-tenant daily budget. Pass
 *   `consumesBudget: false` for surfaces that are heavy but LLM-free in the
 *   current request (e.g. the heuristics engine, or an upload with Vision off)
 *   — they should be throttled, not billed.
 */
export async function guardLlmAction(
  surface: string,
  userId: string,
  opts: { max: number; windowMs?: number; consumesBudget?: boolean },
): Promise<LlmActionGuardResult> {
  const rl = rateLimit(`${surface}:${userId}`, opts.max, opts.windowMs ?? 60_000);
  if (!rl.allowed) {
    return { allowed: false, reason: "rate", retryAfterSec: rl.retryAfterSec };
  }
  if ((opts.consumesBudget ?? true) && llmConfig().enabled) {
    const tenant = (await getActiveTenantSlug()) ?? "default";
    const budget = checkTenantLlmBudget(tenant);
    if (!budget.allowed) {
      return { allowed: false, reason: "budget", retryAfterSec: 0 };
    }
    consumeTenantLlmBudget(tenant);
  }
  return { allowed: true };
}

/** Bilingual toast label for a blocked action. Pure — unit-tested. */
export function llmGuardLabel(
  result: { reason: "rate" | "budget"; retryAfterSec: number },
  ar: boolean,
): string {
  if (result.reason === "rate") {
    const s = Math.max(1, result.retryAfterSec);
    return ar
      ? `طلبات متتالية كثيرة — حاول بعد ${s} ثانية`
      : `Too many requests — try again in ${s}s`;
  }
  return ar
    ? "استُهلكت حصة الذكاء اليومية لهذه المساحة — تتجدد منتصف الليل (UTC)"
    : "Today's AI budget for this workspace is used up — resets at midnight UTC";
}
