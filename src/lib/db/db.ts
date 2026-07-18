import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool as PgPool } from "pg";
import { Pool, neonConfig } from "@neondatabase/serverless";
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

// Phase 4 §2 (Cloudflare audit) — Neon serverless driver adapter, env-gated.
// NEON_DATABASE_URL set → Prisma runs over Neon's WebSocket driver against the
// pooled (-pooler) URL. Unset → the plain direct-TCP client below, so Railway
// keeps its current path from the same codebase.
function neonAdapterClient(connectionString: string): PrismaClient {
  // Node < 22 has no global WebSocket; the Neon driver needs one for Pool.
  // On Workers/Node 22+ the native WebSocket global is used instead of ws.
  if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon(new Pool({ connectionString }));
  return new PrismaClient({ adapter, log: logLevels() });
}

// PG_DATABASE_URL set → Prisma runs over node-postgres via the pg driver
// adapter. This is the Cloudflare Workers path to a plain (non-Neon) Postgres
// such as the Railway prod DB — workerd's nodejs_compat provides the TCP
// socket layer pg needs. Unset everywhere else, so Railway/local keep their
// existing paths from the same codebase.
function pgAdapterClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg(new PgPool({ connectionString, max: 5 }));
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
  const pgUrl = readEnv("PG_DATABASE_URL");
  if (pgUrl) return pgAdapterClient(pgUrl);
  const neonUrl = readEnv("NEON_DATABASE_URL");
  if (neonUrl) return neonAdapterClient(neonUrl);
  // Direct connection; pool size = Prisma default (num_cpus × 2 + 1) unless
  // DATABASE_URL carries ?connection_limit=. At ~15+ concurrent users the
  // direct Postgres budget exhausts — the fix is the PgBouncer sidecar, an
  // env-only switch documented in docs/DEPLOYMENT.md § Connection pooling.
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

// Cloudflare Workers gotcha (1 of 2, fixed here): `baseClient()`/
// `makeScopedClient()` read env (PG_DATABASE_URL etc.) to pick the driver
// adapter. Building the real PrismaClient eagerly at module scope read
// that env before it was ready and/or via a channel Workers doesn't
// expose it on (see readEnv() below). A lazy Proxy defers construction
// to the first property access, which always happens inside a request.
// Railway/local Node aren't affected either way.
//
// Cloudflare Workers gotcha (2 of 2, STILL OPEN — verified against
// Prisma's own docs 2026-07-18, not fixable from this file): even with
// an adapter passed and the env read correctly, Prisma 5.22's legacy
// `prisma-client-js` generator (this repo's generator, see
// prisma/schema/schema.prisma) still boots its WASM query engine
// internally, and that engine's loader uses eval — which Workers blocks
// (`EvalError: Code generation from strings disallowed for this
// context`, thrown from loadLibrary→loadEngine→instantiateLibrary).
// Prisma's official Cloudflare Workers guide
// (prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare)
// uses `generator client { provider = "prisma-client" }` — the Prisma 6.x
// ESM-native generator, which is fully adapter-only with no WASM engine.
// Fixing this for real means upgrading to Prisma 6 and migrating the
// generator (a real, invasive change — new import paths, regenerated
// client, needs its own PR and testing on Railway too, not a one-file
// patch). Until then this Worker deploy will 500 on any DB-touching
// route; Railway prod is unaffected (plain Node, no eval restriction).
function lazyClient(factory: () => PrismaClient, globalKey: "prismaRaw" | "prismaScoped"): PrismaClient {
  let instance: PrismaClient | undefined = globalForPrisma[globalKey];
  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
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
