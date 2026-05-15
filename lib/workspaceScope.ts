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

export type ScopeParams = { model?: string; action: string; args?: any };

/**
 * INVARIANT: when `workspaceId` is null OR the model is not scoped, the
 * params are passed through UNCHANGED — so with no workspace cookie the
 * app behaves byte-identically to pre-Phase-C. That is the pitch-safety
 * guarantee, and it is the first thing the tests assert.
 */
export async function applyWorkspaceScope(
  params: ScopeParams,
  next: (p: any) => Promise<any>,
  workspaceId: string | null,
  scopedModels: Set<string> = SCOPED_MODELS,
): Promise<any> {
  const model = params.model;
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
