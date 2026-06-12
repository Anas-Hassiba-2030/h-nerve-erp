// lib/adminActionScope.ts — Phase 11 tenant-scope guard for admin actions.
//
// The admin/ server actions (mappings, products, suppliers, purchase-orders)
// previously took a `tenantId` from FormData and trusted it. A malicious POST
// could specify any tenant's id and the action would act on it — the TODOs in
// those files documented this. This helper closes the hole:
//
//   • ADMIN with no companyId is a cross-tenant superadmin (Phase F2 posture);
//     the submitted tenantId stands.
//   • A user pinned to a workspace (user.tenantSlug set) can only act on their
//     own tenant; if the form's tenantId differs we OVERRIDE it with theirs.
//     This is fail-safe: an attacker submitting a foreign id ends up scoped to
//     themselves, not them — they never reach other tenants.
//   • Empty tenantId for a pinned user is filled from their session.
//
// Pure (no Prisma, no Next) so it unit-tests in isolation.

import type { SessionUser } from "@/lib/auth/session";

export type ScopeResolution = {
  /** The tenantId the action should act on. */
  tenantId: string;
  /** True if the caller submitted a tenantId different from their own. */
  overridden: boolean;
};

/**
 * Resolve the effective tenantId for an admin action. Returns null when no
 * tenantId can be determined (caller should reject the action with a 4xx).
 */
export function resolveAdminTenantId(
  user: Pick<SessionUser, "role" | "tenantSlug" | "companyId">,
  submittedTenantId: string | null | undefined,
): ScopeResolution | null {
  const submitted = (submittedTenantId ?? "").trim();
  const ownSlug = (user.tenantSlug ?? "").trim();
  const isAdmin = user.role === "ADMIN";
  const isPinned = ownSlug.length > 0;

  // Cross-tenant superadmin: trust the submitted id (must be non-empty).
  if (isAdmin && !isPinned) {
    return submitted ? { tenantId: submitted, overridden: false } : null;
  }

  // Pinned user: their own tenant is the only valid scope.
  if (isPinned) {
    return {
      tenantId: ownSlug,
      overridden: submitted.length > 0 && submitted !== ownSlug,
    };
  }

  // Non-admin without a pinned tenant — nothing to scope to.
  return null;
}

/**
 * Phase ISO-3 — the companyId-plane analog of resolveAdminTenantId, for
 * SCOPED_MODELS create actions (Hotel / DairyBatch / Farm / Program /
 * FutureProject …). A workspace-PINNED operator (an active workspace cookie
 * is set) may only write to their OWN workspace, so a client-submitted
 * companyId is OVERRIDDEN to it; a cross-company ADMIN (no active workspace)
 * keeps the submitted value. The scoped-prisma middleware already blocks a
 * foreign create — this makes the action correct by construction (#174
 * discipline) rather than relying on the backstop.
 *
 * Pure (the caller passes `getActiveWorkspaceId()`) so it unit-tests in
 * isolation.
 */
export function resolveOwnCompanyId(
  submittedCompanyId: string,
  activeWorkspaceId: string | null,
): string {
  const ws = (activeWorkspaceId ?? "").trim();
  return ws.length > 0 ? ws : submittedCompanyId;
}
