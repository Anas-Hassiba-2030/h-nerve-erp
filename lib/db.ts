import { PrismaClient } from "@prisma/client";
import { getActiveWorkspaceId } from "./workspace";

// Phase C — workspace isolation.
//
// `prisma`         — workspace-scoped client. ONLY the models in
//                    SCOPED_MODELS are filtered, and ONLY when a workspace
//                    cookie is set. No cookie => pure pass-through, so the
//                    app is byte-identical to pre-Phase-C (pitch-safe).
// `prismaUnscoped` — raw client, never filtered. Use for genuinely
//                    cross-company views: the Empire dashboard, group P&L,
//                    and the workspace switcher itself.
//
// We use $use middleware (not $extends) on purpose: it keeps the exported
// type as `PrismaClient`, so none of the ~628 existing call sites change
// type. $extends would alter the export type and risk a typecheck cascade
// across the whole codebase right before the pitch.
//
// SCOPED_MODELS = every model with a REQUIRED `companyId String`.
//
// EXCLUDED ON PURPOSE:
//  - User / MarketStock: companyId is OPTIONAL. Scoping User would make
//    `prisma.user.findUnique({where:{id}})` return null inside a foreign
//    workspace, and both layouts then redirect("/logout") — auth breakage.
//    MarketStock is a global markets feature with optional links.
//  - Company / Tenant: the workspace switcher must see them all.
//  - Booking / Crop: no companyId column; they inherit isolation
//    indirectly (their parent Hotel/Farm lists are scoped). Direct
//    by-parent-id queries stay unscoped — documented follow-up.
//
// Still deferred (documented follow-ups): cross-workspace write-by-id
// guard (update/delete/upsert); routing group/Empire views to
// `prismaUnscoped`. The no-cookie invariant holds regardless.

const globalForPrisma = globalThis as unknown as {
  prismaScoped: PrismaClient | undefined;
  prismaRaw: PrismaClient | undefined;
};

function baseClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const SCOPED_MODELS = new Set<string>([
  "Hotel",
  "DairyBatch",
  "Farm",
  "Program",
  "Transaction",
  "FutureProject",
  "SustainabilityScore",
]);

function makeScopedClient(): PrismaClient {
  const client = baseClient();

  client.$use(async (params, next) => {
    const model = params.model;
    if (!model || !SCOPED_MODELS.has(model)) return next(params);

    const workspaceId = getActiveWorkspaceId();
    if (!workspaceId) return next(params); // no workspace => unchanged

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

    // findUnique(OrThrow): `where` only accepts unique fields, so we can't
    // add companyId there. Run it, then reject rows outside the workspace.
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
    // documented follow-up. Pass through for now (read isolation is the
    // pattern proof; the no-cookie invariant still holds).
    return next(params);
  });

  return client;
}

export const prismaUnscoped: PrismaClient =
  globalForPrisma.prismaRaw ?? baseClient();

export const prisma: PrismaClient =
  globalForPrisma.prismaScoped ?? makeScopedClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaRaw = prismaUnscoped;
  globalForPrisma.prismaScoped = prisma;
}
