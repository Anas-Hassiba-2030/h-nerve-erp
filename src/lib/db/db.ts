import { PrismaClient } from "@prisma/client";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { applyWorkspaceScope } from "@/lib/tenancy/workspaceScope";

// Phase C — workspace isolation.
//
// `prisma`         — workspace-scoped client. The scoping decision lives
//                    in lib/workspaceScope.ts (pure, unit-tested). With no
//                    workspace cookie it is a pure pass-through, so the app
//                    is byte-identical to pre-Phase-C (pitch-safe).
// `prismaUnscoped` — raw client, never filtered. Use for genuinely
//                    cross-company views: the Empire dashboard, group P&L,
//                    and the workspace switcher itself.
//
// We use $use middleware (not $extends) on purpose: it keeps the exported
// type as `PrismaClient`, so none of the ~628 existing call sites change
// type. $extends would alter the export type and risk a typecheck cascade
// across the whole codebase right before the pitch.

const globalForPrisma = globalThis as unknown as {
  prismaScoped: PrismaClient | undefined;
  prismaRaw: PrismaClient | undefined;
};

// Log levels: errors always, warnings in dev. Set PRISMA_LOG=query to also
// echo every SQL statement — useful when debugging the /admin/db browser or
// a slow query, without editing code.
function logLevels(): ("query" | "info" | "warn" | "error")[] {
  const base: ("query" | "info" | "warn" | "error")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  if (process.env.PRISMA_LOG === "query") base.push("query");
  return base;
}

function baseClient(): PrismaClient {
  // Direct connection; pool size = Prisma default (num_cpus × 2 + 1) unless
  // DATABASE_URL carries ?connection_limit=. At ~15+ concurrent users the
  // direct Postgres budget exhausts — the fix is the PgBouncer sidecar, an
  // env-only switch documented in docs/ops/DEPLOYMENT.md § Connection pooling.
  return new PrismaClient({ log: logLevels() });
}

function makeScopedClient(): PrismaClient {
  const client = baseClient();
  client.$use(async (params, next) =>
    applyWorkspaceScope(
      params,
      next,
      await getActiveWorkspaceId(),
      await getActiveTenantSlug(),
    ),
  );
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
