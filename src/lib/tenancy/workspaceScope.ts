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
  // Phase 27 — Invoice/Billing (docs/spec/ENTITY-ENGINE-PATTERN.md).
  "Invoice",
  "Estimate",
  "Treasury",
  "Payment",
  "PurchaseInvoice",
  "SupplierPayment",
  "FixedAsset",
  "DepreciationEntry",
  "Employee",
  "LeaveRequest",
  "PayrollRun",
  "Payslip",
  "BillOfMaterials",
  "ManufacturingOrder",
  "ReorderRule",
  "MpsForecast",
  "StockLot",
  "WorkCenter",
  "WorkOrder",
  "ProductionScrap",
  "CashSession",
  "PosSale",
  "CustomerPortalAccount",
  "EInvoiceSupplierProfile",
  "EInvoiceRecord",
  "TaxRate",
  "NumberingScheme",
  "TenantImportMapping",
  "BrainInsight",
  // Phase F4 — Booking + Crop now carry a denormalized tenantId
  // backfilled from their parent Hotel/Farm. See migration
  // 20260520_add_tenant_id_to_booking_crop.
  "Booking",
  "Crop",
  // Phase V3-P5 — shared-to-Council threads. Each tenant sees only
  // its own admins' shares (cross-tenant brain federation would use
  // FederationPattern, not CouncilDiscussion).
  "CouncilDiscussion",
  // Phase V3-NEW-5 — replies on those threads. Denormalized tenantId
  // so middleware filters without joining through the parent.
  "CouncilReply",
  // Phase 20 — the Living Protocol. Each tenant's constitution clauses
  // are scoped by the opaque tenantId slug like Product/BrainInsight.
  "ProtocolClause",
  // ISOLATION-FIX — import-audit ledger. Keyed by the opaque `tenantId`
  // slug (NULLABLE — un-attributed/legacy rows carry null). Added so a
  // pinned operator on /admin/imports sees only their own tenant's import
  // batches (the page reads via the scoped client) and clearTestImports'
  // bulk delete is tenant-stamped. ADMIN (no tenant cookie) and the
  // bearer-token import API / brain cron run with no slug → pass-through,
  // unchanged. Null-tenant rows are simply filtered out for pinned users.
  "ImportLog",
  // Phase 27 — CRM. Lead / Opportunity / CrmActivity carry the opaque
  // tenantId slug like Customer/Supplier. Each tenant sees only its own
  // pipeline; ADMIN (no tenant cookie) sees all.
  "Lead",
  "Opportunity",
  "CrmActivity",
  // Bank reconciliation (docs/HOURANI-ERP-GAPS.md #1). BankStatementLine
  // carries a denormalized tenantId (same precedent as Booking/Crop) so
  // the middleware filters without joining through BankStatement.
  "BankStatement",
  "BankStatementLine",
  // Cost centres (docs/HOURANI-ERP-GAPS.md #2). Same opaque tenantId
  // convention as every other analytic/entity-registry model here.
  "CostCenter",
  // QMS (docs/HOURANI-ERP-GAPS.md #6). Same opaque tenantId convention.
  "QualityCheckPoint",
  "QualityCheck",
  // Maintenance (docs/HOURANI-ERP-GAPS.md #5). Same opaque tenantId convention.
  "MaintenanceOrder",
  // Attendance/shifts (docs/HOURANI-ERP-GAPS.md #7). Same opaque tenantId convention.
  "Shift",
  "ShiftAssignment",
  "Attendance",
  // Landed cost (docs/HOURANI-ERP-GAPS.md #8). Same opaque tenantId
  // convention. LandedCostLine has no tenantId column (scoped through
  // its parent LandedCost, same precedent as JournalLine/JournalEntry).
  "LandedCost",
  // Project accounting / timesheets (docs/HOURANI-ERP-GAPS.md #9). Same
  // opaque tenantId convention. ProjectExpense has its own tenantId
  // column too (unlike LandedCostLine) since it's queried directly by
  // tenant in reports, not only ever read through its parent.
  "Project",
  "TimesheetEntry",
  "ProjectExpense",
  // Budgeting (docs/HOURANI-ERP-GAPS.md #10). Same opaque tenantId convention.
  "Budget",
  // Recurring invoices (docs/HOURANI-ERP-GAPS.md #11). Same opaque tenantId
  // convention.
  "RecurringInvoiceTemplate",
]);

// Phase ISO-2 — models owned by TWO Company FKs at once (a bridge row).
// A workspace is in-scope when it is EITHER endpoint (sourceCompanyId OR
// targetCompanyId). SupplyForecast is the only such model today; the
// endpoint field names are hard-coded in the dual block below.
export const DUAL_COMPANY_SCOPED_MODELS = new Set<string>(["SupplyForecast"]);

// Phase ISO-4 — models with a NULLABLE `companyId` where NULL means
// GROUP-WIDE (shared, visible in every workspace) and a non-null value pins
// the row to one company. A workspace is in-scope for a row when the row is
// group-wide (companyId IS NULL) OR the row's companyId is the active
// workspace. This differs from SCOPED_MODELS (which require a non-null
// companyId and would HIDE the group-wide rows). AIInsight is the only such
// model today; the column name is hard-coded as `companyId` in the block.
export const SHARED_COMPANY_SCOPED_MODELS = new Set<string>(["AIInsight"]);

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
  dualScopedModels: Set<string> = DUAL_COMPANY_SCOPED_MODELS,
  sharedScopedModels: Set<string> = SHARED_COMPANY_SCOPED_MODELS,
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

  // Phase ISO-2 — dual-company-FK scoping (SupplyForecast). The row is
  // owned by BOTH endpoints, so a workspace is in-scope when it is EITHER
  // the sourceCompanyId OR the targetCompanyId. Same pass-through invariant
  // when there's no workspace cookie (ADMIN / cron).
  if (model && dualScopedModels.has(model) && workspaceId) {
    const action = params.action;
    const own = {
      OR: [{ sourceCompanyId: workspaceId }, { targetCompanyId: workspaceId }],
    };
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
      const base = params.args.where;
      // AND the ownership OR with any existing where so a caller's own
      // OR/filters are never clobbered.
      params.args.where = base ? { AND: [base, own] } : own;
      return next(params);
    }
    if (action === "findUnique" || action === "findUniqueOrThrow") {
      const row = await next(params);
      if (
        row &&
        row.sourceCompanyId !== workspaceId &&
        row.targetCompanyId !== workspaceId
      ) {
        if (action === "findUniqueOrThrow") {
          throw new Error("Record not found in the active workspace");
        }
        return null;
      }
      return row;
    }
    if (action === "create") {
      const data = params.args?.data ?? {};
      if (
        data.sourceCompanyId !== workspaceId &&
        data.targetCompanyId !== workspaceId
      ) {
        throw new Error("Cross-workspace create blocked");
      }
      return next(params);
    }
    if (action === "createMany") {
      const d = params.args?.data;
      const rows = Array.isArray(d) ? d : d ? [d] : [];
      for (const r of rows) {
        if (
          r.sourceCompanyId !== workspaceId &&
          r.targetCompanyId !== workspaceId
        ) {
          throw new Error("Cross-workspace create blocked");
        }
      }
      return next(params);
    }
    // by-id update/delete/upsert: probe the row, allow only when the active
    // workspace is one of its two endpoints. A non-id where passes through.
    if (action === "update" || action === "delete" || action === "upsert") {
      const where = params.args?.where ?? {};
      const idValue = where.id;
      if (typeof idValue === "string") {
        const savedAction = params.action;
        const savedArgs = params.args;
        const probe = { ...params, action: "findUnique", args: { where: { id: idValue } } } as any;
        const row = await next(probe);
        params.action = savedAction;
        params.args = savedArgs;
        if (
          !row ||
          (row.sourceCompanyId !== workspaceId &&
            row.targetCompanyId !== workspaceId)
        ) {
          throw new Error("Cross-workspace write blocked");
        }
        return next(params);
      }
      return next(params);
    }
    return next(params);
  }

  // Phase ISO-4 — shared-company scoping (AIInsight). companyId is NULLABLE:
  // a NULL row is group-wide and stays visible in EVERY workspace; a non-null
  // row is pinned to one company. In-scope iff companyId IS NULL OR
  // companyId === workspaceId. Pass-through with no workspace (ADMIN / cron).
  if (model && sharedScopedModels.has(model) && workspaceId) {
    const action = params.action;
    // group-wide (NULL) OR mine
    const own = { OR: [{ companyId: null }, { companyId: workspaceId }] };
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
      const base = params.args.where;
      // AND the shared ownership onto any existing where so a caller's own
      // filters are preserved.
      params.args.where = base ? { AND: [base, own] } : own;
      return next(params);
    }
    if (action === "findUnique" || action === "findUniqueOrThrow") {
      const row = await next(params);
      if (row && row.companyId != null && row.companyId !== workspaceId) {
        if (action === "findUniqueOrThrow") {
          throw new Error("Record not found in the active workspace");
        }
        return null;
      }
      return row;
    }
    // create: a group-wide insight (companyId null/absent) is allowed from any
    // workspace; a company-pinned insight may only target the active workspace.
    if (action === "create") {
      const data = params.args?.data ?? {};
      if (data.companyId != null && data.companyId !== workspaceId) {
        throw new Error("Cross-workspace create blocked");
      }
      return next(params);
    }
    if (action === "createMany") {
      const d = params.args?.data;
      const rows = Array.isArray(d) ? d : d ? [d] : [];
      for (const r of rows) {
        if (r.companyId != null && r.companyId !== workspaceId) {
          throw new Error("Cross-workspace create blocked");
        }
      }
      return next(params);
    }
    // by-id update/delete/upsert: probe the row; allow when it is group-wide
    // (companyId null) or belongs to the active workspace. A non-id where
    // passes through.
    if (action === "update" || action === "delete" || action === "upsert") {
      const where = params.args?.where ?? {};
      const idValue = where.id;
      if (typeof idValue === "string") {
        const savedAction = params.action;
        const savedArgs = params.args;
        const probe = { ...params, action: "findUnique", args: { where: { id: idValue } } } as any;
        const row = await next(probe);
        params.action = savedAction;
        params.args = savedArgs;
        if (!row || (row.companyId != null && row.companyId !== workspaceId)) {
          throw new Error("Cross-workspace write blocked");
        }
        return next(params);
      }
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

  // Phase F6 (companyId plane) — by-id write guard, mirroring the
  // tenant-side guard above. update / delete / upsert by a unique {id}
  // can't be where-stamped (id is the only unique field), so we read the
  // target row first and reject the write when it belongs to another
  // workspace. updateMany / deleteMany are already gated above (the
  // where-clause is stamped). A non-string-id where (e.g. a compound
  // unique) passes through — the key already carries the company or is
  // intrinsically scoped through its parent.
  if (action === "update" || action === "delete" || action === "upsert") {
    const where = params.args?.where ?? {};
    const idValue = where.id;
    if (typeof idValue === "string") {
      const savedAction = params.action;
      const savedArgs = params.args;
      const probe = { ...params, action: "findUnique", args: { where: { id: idValue } } } as any;
      const row = await next(probe);
      params.action = savedAction;
      params.args = savedArgs;
      if (!row || row.companyId !== workspaceId) {
        throw new Error("Cross-workspace write blocked");
      }
      return next(params);
    }
    return next(params);
  }

  return next(params);
}
