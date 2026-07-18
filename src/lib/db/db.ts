import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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
// Prisma 6.19 (Rust-free client, engineType="client"): the legacy `$use`
// middleware no longer exists on the generated client — only `$extends`. The
// scoping is therefore wired through a `$extends` query hook (below) instead
// of `$use`. We cast the extended client back to `PrismaClient` so the export
// type is unchanged and none of the ~628 existing call sites need edits.

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

// A driver adapter is MANDATORY on the Rust-free client — there is no built-in
// connector anymore. Neon serverless (WebSocket) on the Cloudflare edge; plain
// node-postgres everywhere else. Both wrap the same Postgres.
//
// Neon's WebSocket driver is HTTP/WS based and safe to reuse across Workers
// requests. Node < 22 has no global WebSocket, so feed it `ws`; on Workers /
// Node 22+ the native WebSocket global is used.
function neonAdapterClient(connectionString: string): PrismaClient {
  if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter, log: logLevels() });
}

// node-postgres adapter: the path for Railway prod and local dev (plain
// DATABASE_URL) and for a non-Neon Postgres reached over TCP from Workers
// (PG_DATABASE_URL, workerd's nodejs_compat provides the socket layer).
function pgAdapterClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: logLevels() });
}

// Reads bindings/secrets via OpenNext's Cloudflare context first (the
// officially-documented way to reach Worker bindings — `env.KEY`, same
// object regardless of whether KEY was declared as a plain var or a
// `wrangler secret put` secret). Falls back to process.env, which is what
// Railway/local Node actually populate; getCloudflareContext() throws
// outside a Workers request, so that path is skipped there entirely.
function readEnv(key: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const value = (env as unknown as Record<string, string | undefined>)[key];
    if (value) return value;
  } catch {
    // Not running inside a Cloudflare Worker request — fall through.
  }
  return process.env[key];
}

function baseClient(): PrismaClient {
  // Neon FIRST on the edge: its serverless driver is WebSocket-based and safe
  // to reuse across Workers isolates. Both prefixed vars are only ever set on
  // Cloudflare. Railway/local set only DATABASE_URL and fall to the pg adapter.
  const neonUrl = readEnv("NEON_DATABASE_URL");
  if (neonUrl) return neonAdapterClient(neonUrl);
  const pgUrl = readEnv("PG_DATABASE_URL") ?? readEnv("DATABASE_URL");
  if (pgUrl) return pgAdapterClient(pgUrl);
  throw new Error(
    "No database URL configured: set DATABASE_URL (Railway/local) or NEON_DATABASE_URL / PG_DATABASE_URL (Cloudflare).",
  );
}

// Connectivity probe for /api/health: try each configured database URL with
// its matching adapter and report ok/fail per source WITHOUT ever exposing
// the URL, host, or error detail to the caller — detail goes to the server
// log only (readable via `wrangler tail`, which requires account auth).
export type DbProbeResult = Record<string, "ok" | "fail" | "not_configured">;

export async function probeDatabases(): Promise<DbProbeResult> {
  const sources: Array<[name: string, mk: (url: string) => PrismaClient]> = [
    ["NEON_DATABASE_URL", neonAdapterClient],
    ["PG_DATABASE_URL", pgAdapterClient],
    ["DATABASE_URL", pgAdapterClient],
  ];
  const out: DbProbeResult = {};
  for (const [name, mk] of sources) {
    const url = readEnv(name);
    if (!url) {
      out[name] = "not_configured";
      continue;
    }
    let client: PrismaClient | undefined;
    try {
      client = mk(url);
      await client.$queryRaw`SELECT 1`;
      out[name] = "ok";
    } catch (err) {
      out[name] = "fail";
      console.error(`[health] ${name} probe failed:`, err);
    } finally {
      await client?.$disconnect().catch(() => {});
    }
  }
  return out;
}

// PascalCase model name (as delivered by the $extends query hook) → the
// camelCase delegate on the client (`User` → `user`, `DairyBatch` → `dairyBatch`).
function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function makeScopedClient(): PrismaClient {
  const base = baseClient();
  // Bridge the pure `applyWorkspaceScope` middleware (still $use-shaped:
  // (params, next, workspaceId, tenantSlug)) onto the $extends query API.
  //  - `next(p)` for the CURRENT operation → run it via `query(p.args)`.
  //  - `next(p)` for a DIFFERENT action (the by-id write-guard probe, which
  //    reads the target row with a synthetic findUnique) → run it on the RAW
  //    unextended `base` client so it neither recurses through this hook nor
  //    gets re-scoped — exactly what the old $use `next(probe)` did.
  const scoped = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const workspaceId = await getActiveWorkspaceId();
          const tenantSlug = await getActiveTenantSlug();
          const params = { model, action: operation, args };
          const next = async (p: { action: string; args?: unknown }) => {
            if (p.action === operation) return query(p.args ?? {});
            const delegate = (base as unknown as Record<string, Record<string, (a: unknown) => Promise<unknown>>>)[
              delegateName(model)
            ];
            return delegate[p.action](p.args);
          };
          return applyWorkspaceScope(params, next, workspaceId, tenantSlug);
        },
      },
    },
  });
  return scoped as unknown as PrismaClient;
}

// Cloudflare Workers gotcha (fixed): `baseClient()` reads env (NEON_DATABASE_URL
// etc.) to build the driver adapter. Constructing the real PrismaClient eagerly
// at module scope read that env before the Workers request context existed (see
// readEnv()). A lazy Proxy defers construction to the first property access,
// which always happens inside a request. Railway/local Node are unaffected.
//
// The former "eval" gotcha (library query engine's loader uses eval, which
// workerd blocks) is resolved at the root: the Rust-free client (engineType=
// "client") has no such engine. See prisma/schema/schema.prisma.
function lazyClient(factory: () => PrismaClient, globalKey: "prismaRaw" | "prismaScoped"): PrismaClient {
  let instance: PrismaClient | undefined = globalForPrisma[globalKey];
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (!instance) {
        instance = factory();
        if (process.env.NODE_ENV !== "production") {
          globalForPrisma[globalKey] = instance;
        }
      }
      return Reflect.get(instance as object, prop, instance);
    },
  });
}

export const prismaUnscoped: PrismaClient = lazyClient(baseClient, "prismaRaw");

export const prisma: PrismaClient = lazyClient(makeScopedClient, "prismaScoped");
