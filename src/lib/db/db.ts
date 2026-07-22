import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { createRequire } from "node:module";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// D1Database without depending on @cloudflare/workers-types: exactly the
// type the adapter's constructor accepts.
type D1Database = ConstructorParameters<typeof PrismaD1>[0];
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
// connector anymore. Cloudflare D1 in production (the `DB` binding in
// wrangler.jsonc); better-sqlite3 against a `file:` URL for local dev, seeds,
// and ops scripts. Same SQLite dialect either way.
//
// NOTE: D1 has no interactive transactions — `$transaction(callback)` runs the
// statements without atomicity (a documented Prisma/D1 limitation). Acceptable
// at pilot scale; revisit before multi-writer accounting loads.
function d1AdapterClient(db: D1Database): PrismaClient {
  const adapter = new PrismaD1(db);
  return new PrismaClient({ adapter, log: logLevels() });
}

function sqliteFileClient(url: string): PrismaClient {
  // libsql over a local file — prebuilt N-API, no node-gyp toolchain needed
  // on dev machines (better-sqlite3 requires VS build tools on Windows).
  //
  // Loaded via createRequire, NOT a static import: libsql ships native .node
  // binaries that can never be bundled for workerd, and the Workers build
  // only ever takes the D1 branch above. createRequire is invisible to
  // webpack's static analysis, so the dependency stays out of the bundle
  // while resolving normally under Node (dev server, seeds, scripts).
  //
  // Base path is ALWAYS process.cwd(), never __filename: under `next dev`
  // (Turbopack), __filename inside a bundled server module is a fake
  // POSIX-style virtual path (e.g. "/ROOT/Downloads/BMV2026/src/lib/db/db.ts"
  // on Windows) that doesn't exist on disk — createRequire from it can't
  // find node_modules and throws "Cannot find module '@prisma/adapter-libsql'"
  // on every DB-touching route, including /login. process.cwd() is the repo
  // root in every context this branch runs in (dev server, seeds, scripts —
  // same fix already proven in scripts/_prisma.ts), so it's the only base
  // that's reliable here.
  const nodeRequire = createRequire(`${process.cwd()}/`);
  const { PrismaLibSQL } = nodeRequire(
    "@prisma/adapter-libsql",
  ) as typeof import("@prisma/adapter-libsql");
  const adapter = new PrismaLibSQL({ url });
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

// The D1 binding when running inside a Workers request; undefined elsewhere.
function readD1Binding(): D1Database | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as { DB?: D1Database }).DB;
  } catch {
    return undefined; // not a Workers request (local Node, seeds, tests)
  }
}

function baseClient(): PrismaClient {
  const d1 = readD1Binding();
  if (d1) return d1AdapterClient(d1);
  const url = readEnv("DATABASE_URL");
  if (url?.startsWith("file:")) return sqliteFileClient(url);
  throw new Error(
    "No database configured: expected the D1 `DB` binding (Cloudflare) or a file: DATABASE_URL (local dev/scripts).",
  );
}

// Connectivity probe for /api/health: try each configured database URL with
// its matching adapter and report ok/fail per source WITHOUT ever exposing
// the URL, host, or error detail to the caller — detail goes to the server
// log only (readable via `wrangler tail`, which requires account auth).
export type DbProbeResult = Record<string, "ok" | "fail" | "not_configured">;

export async function probeDatabases(): Promise<DbProbeResult> {
  const sources: Array<[name: string, mk: () => PrismaClient | undefined]> = [
    [
      "D1",
      () => {
        const d1 = readD1Binding();
        return d1 ? d1AdapterClient(d1) : undefined;
      },
    ],
    [
      "DATABASE_URL",
      () => {
        const url = readEnv("DATABASE_URL");
        return url?.startsWith("file:") ? sqliteFileClient(url) : undefined;
      },
    ],
  ];
  const out: DbProbeResult = {};
  for (const [name, mk] of sources) {
    let client: PrismaClient | undefined;
    try {
      client = mk();
      if (!client) {
        out[name] = "not_configured";
        continue;
      }
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
  const ensure = (): PrismaClient => {
    if (!instance) {
      instance = factory();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma[globalKey] = instance;
      }
    }
    return instance;
  };
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const inst = ensure();
      // D1 has NO interactive transactions. Prisma's engine HARD-THROWS
      // ("Cloudflare D1 does not support interactive transactions") the moment
      // `$transaction(callback)` is called — which silently broke EVERY write
      // that wrapped its steps in one (all ~30 ERP create/mutation actions:
      // invoices, payments, POS, payroll, assets, manufacturing, …). The batch
      // form `$transaction([...])` IS supported by D1, so keep delegating that.
      //
      // For the callback form we run the callback against the client directly:
      // no BEGIN/COMMIT, statements auto-commit individually. That is exactly
      // D1's own "transactions are ignored and run as individual queries"
      // behaviour, and it is safe here because the one place atomicity mattered
      // — posting a journal entry — is already crash-safe by construction
      // (createPostedJournalEntry writes DRAFT then flips to POSTED, and every
      // ledger reader counts POSTED only). A mid-sequence failure can leave an
      // inert orphan (a DRAFT entry, an unreferenced doc) but never a corrupt,
      // half-visible record.
      if (prop === "$transaction") {
        return (arg: unknown, ...rest: unknown[]) => {
          if (typeof arg === "function") {
            return (arg as (client: PrismaClient) => unknown)(inst);
          }
          const realTx = Reflect.get(inst as object, "$transaction", inst) as (
            ...a: unknown[]
          ) => unknown;
          return realTx.call(inst, arg, ...rest);
        };
      }
      return Reflect.get(inst as object, prop, inst);
    },
  });
}

export const prismaUnscoped: PrismaClient = lazyClient(baseClient, "prismaRaw");

export const prisma: PrismaClient = lazyClient(makeScopedClient, "prismaScoped");
