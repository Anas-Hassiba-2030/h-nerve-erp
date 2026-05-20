// lib/workspaceScope.ts — the PURE Phase C scoping decision.
//
// Deliberately has ZERO imports (no Prisma, no next/headers): it is a
// plain function of (params, next, workspaceId) so it can be unit-tested
// with no database, no server, no API. lib/db.ts wires it into Prisma's
// $use; this file holds the logic so the logic is provable.
//
// SCOPED_MODELS = every model with a REQUIRED `companyId String`.
// EXCLUDED ON PURPOSE:
//  - User / MarketStock: companyId is OPTIONAL. Scoping User would make
//    user.findUnique({where:{id}}) return null inside a foreign workspace
//    and both layouts then redirect("/logout") — auth breakage.
//  - Company / Tenant: the workspace switcher must see them all.
//  - Booking / Crop: no companyId; isolated indirectly via their parent.

export const SCOPED_MODELS = new Set<string>([
  "Hotel",
  "DairyBatch",
  "Farm",
  "Program",
  "Transaction",
  "FutureProject",
  "SustainabilityScore",
]);

// Phase F3 — models keyed by the OPAQUE `tenantId String` column (no FK
// to Tenant). Scoped by Tenant.slug, sourced from the h_nerve_tenant
// cookie (lib/tenancy.ts). Same pass-through invariant as SCOPED_MODELS
// when tenantSlug is null (ADMIN / unassigned roamers).
export const TENANT_SCOPED_MODELS = new Set<string>([
  "Product",
  "Supplier",
  "Customer",
  "Warehouse",
  "PurchaseOrder",
  "SalesOrder",
  "InventoryMovement",
  "LedgerAccount",
  "FinancialPeriod",
  "JournalEntry",
  "TenantImportMapping",
  "BrainInsight",
  // Phase F4 — Booking + Crop now carry a denormalized tenantId
  // backfilled from their parent Hotel/Farm. See migration
  // 20260520_add_tenant_id_to_booking_crop.
  "Booking",
  "Crop",
]);

export type ScopeParams = { model?: string; action: string; args?: any };

/**
 * INVARIANT: when `workspaceId` is null OR the model is not scoped, the
 * params are passed through UNCHANGED — so with no workspace cookie the
 * app behaves byte-identically to pre-Phase-C. That is the pitch-safety
 * guarantee, and it is the first thing the tests assert.
 *
 * Phase F3 layers tenant-id scoping on top: models in
 * `tenantScopedModels` are filtered by `tenantSlug` (opaque string;
 * matches `tenantId String` columns). Same pass-through invariant when
 * `tenantSlug` is null. The tenant-side runs FIRST and short-circuits
 * before the company-id-side so the two clauses don't double-stamp.
 */
export async function applyWorkspaceScope(
  params: ScopeParams,
  next: (p: any) => Promise<any>,
  workspaceId: string | null,
  tenantSlug: string | null = null,
  scopedModels: Set<string> = SCOPED_MODELS,
  tenantScopedModels: Set<string> = TENANT_SCOPED_MODELS,
): Promise<any> {
  const model = params.model;

  // Tenant-scoped models: same shape as companyId scoping below, but
  // keyed off the opaque tenantId column.
  if (model && tenantScopedModels.has(model) && tenantSlug) {
    const action = params.action;
    if (
      action === "findMany" ||
      action === "findFirst" ||
      action === "findFirstOrThrow" ||
      action === "count" ||
      action === "aggregate" ||
      action === "groupBy" ||
      action === "updateMany" ||
      action === "deleteMany"
    ) {
      params.args = params.args ?? {};
      params.args.where = { ...(params.args.where ?? {}), tenantId: tenantSlug };
      return next(params);
    }
    if (action === "findUnique" || action === "findUniqueOrThrow") {
      const row = await next(params);
      if (row && row.tenantId !== tenantSlug) {
        if (action === "findUniqueOrThrow") {
          throw new Error("Record not found in the active tenant");
        }
        return null;
      }
      return row;
    }
    if (action === "create") {
      params.args = params.args ?? {};
      const data = params.args.data ?? {};
      if (data.tenantId == null) data.tenantId = tenantSlug;
      else if (data.tenantId !== tenantSlug) {
        throw new Error("Cross-tenant create blocked");
      }
      params.args.data = data;
      return next(params);
    }
    if (action === "createMany") {
      params.args = params.args ?? {};
      const d = params.args.data;
      const rows = Array.isArray(d) ? d : d ? [d] : [];
      for (const r of rows) {
        if (r.tenantId == null) r.tenantId = tenantSlug;
        else if (r.tenantId !== tenantSlug) {
          throw new Error("Cross-tenant create blocked");
        }
      }
      return next(params);
    }

    // Phase F6 — by-id write guard. update/delete/upsert by unique
    // {id} pass the where-clause untouched (id is a unique field, can't
    // safely stamp tenantId on top). Verify the target row's tenantId
    // matches before letting the write through; otherwise throw.
    // updateMany / deleteMany are already gated above (where-clause
    // stamping). Counts come from the matched row → 0 affected if not
    // in tenant.
    if (action === "update" || action === "delete" || action === "upsert") {
      const where = params.args?.where ?? {};
      const idValue = where.id;
      if (typeof idValue === "string") {
        // Read the row through `next` with a tiny passthrough findUnique
        // so we don't recurse middleware. We send a synthetic findUnique
        // call upstream — but `next` here only handles the current op,
        // so use a side channel: read via Prisma raw is overkill; the
        // simpler path is `params.args.where = { id, tenantId }` for
        // update and delete, which silently no-ops on foreign rows.
        // For upsert that doesn't work (where must match one unique
        // index), so we fall back to a hard runtime check via a tagged
        // call. To stay reliable across all three actions, we run the
        // findUnique we already need to do, but route it through the
        // SAME next() with a swapped params object — and restore after.
        const savedAction = params.action;
        const savedArgs = params.args;
        const probe = { ...params, action: "findUnique", args: { where: { id: idValue } } } as any;
        const row = await next(probe);
        params.action = savedAction;
        params.args = savedArgs;
        if (!row || row.tenantId !== tenantSlug) {
          throw new Error("Cross-tenant write blocked");
        }
        return next(params);
      }
      // where is not by-id (e.g. compound unique like
      // {tenantId_sku_warehouseId}) — let it pass; the unique key
      // either already carries tenantId or is intrinsically scoped.
      return next(params);
    }

    return next(params);
  }

  if (!model || !scopedModels.has(model)) return next(params);
  if (!workspaceId) return next(params);

  const action = params.action;

  // Reads + bulk writes: constrain the where-clause to the workspace.
  if (
    action === "findMany" ||
    action === "findFirst" ||
    action === "findFirstOrThrow" ||
    action === "count" ||
    action === "aggregate" ||
    action === "groupBy" ||
    action === "updateMany" ||
    action === "deleteMany"
  ) {
    params.args = params.args ?? {};
    params.args.where = { ...(params.args.where ?? {}), companyId: workspaceId };
    return next(params);
  }

  // findUnique(OrThrow): `where` only accepts unique fields, so we run it
  // then reject rows outside the workspace.
  if (action === "findUnique" || action === "findUniqueOrThrow") {
    const row = await next(params);
    if (row && row.companyId !== workspaceId) {
      if (action === "findUniqueOrThrow") {
        throw new Error("Record not found in the active workspace");
      }
      return null;
    }
    return row;
  }

  // create: stamp the workspace; block explicit cross-workspace writes.
  if (action === "create") {
    params.args = params.args ?? {};
    const data = params.args.data ?? {};
    if (data.companyId == null) data.companyId = workspaceId;
    else if (data.companyId !== workspaceId) {
      throw new Error("Cross-workspace create blocked");
    }
    params.args.data = data;
    return next(params);
  }

  if (action === "createMany") {
    params.args = params.args ?? {};
    const d = params.args.data;
    const rows = Array.isArray(d) ? d : d ? [d] : [];
    for (const r of rows) {
      if (r.companyId == null) r.companyId = workspaceId;
      else if (r.companyId !== workspaceId) {
        throw new Error("Cross-workspace create blocked");
      }
    }
    return next(params);
  }

  // update / delete / upsert by unique id: write-by-id guard is a
  // documented follow-up. Pass through (read isolation is the proof).
  return next(params);
}
