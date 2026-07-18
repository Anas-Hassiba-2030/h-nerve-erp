// scripts/_prisma.ts
//
// Prisma 6's Rust-free client (engineType="client") requires a driver adapter
// in EVERY environment — including standalone seed/ops scripts run via tsx
// (Railway preDeploy, local `npm run db:seed`, etc.). Before, these scripts did
// `new PrismaClient()` with no adapter, which now throws:
//   "Missing configured driver adapter. Engine type `client` requires an
//    active driver adapter."
//
// This factory centralises the adapter wiring. Kept deliberately Next-free (no
// next/headers, no getCloudflareContext) so it is safe to import from a plain
// node/tsx process — unlike src/lib/db/db.ts, which is request-scoped.
// IMPORTANT: the "@prisma/client" tsconfig alias points at the CLOUDFLARE-
// runtime generated client, whose wasm-module loading only works on workerd —
// on Node it throws "The loaded wasm module was unexpectedly undefined".
// Scripts run under Node (tsx), so use the Node-runtime twin directly
// (same schema, same API — see the clientNode generator in schema.prisma).
import type { PrismaClient } from "@prisma/client";
import { PrismaClient as PrismaClientNode } from "../src/generated/prisma-node/client";
import { createRequire } from "node:module";

export function makePrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL must be a file: SQLite URL (e.g. file:./dev.db) — the app is D1/SQLite now.",
    );
  }
  // createRequire (not a static import): libsql ships native binaries that can
  // never bundle for workerd. This module is bundled into the Worker via the
  // genesis action's dynamic import of seed.ts, but this function only ever
  // executes under Node — the indirection keeps webpack from chasing libsql.
  const nodeRequire = createRequire(
    typeof __filename !== "undefined" ? __filename : process.cwd() + "/",
  );
  const { PrismaLibSQL } = nodeRequire(
    "@prisma/adapter-libsql",
  ) as typeof import("@prisma/adapter-libsql");
  // Constructed from the Node twin, but TYPED as the canonical aliased
  // client: the two are generated from the same schema and expose the same
  // API, and typing them apart sends tsc into "excessive stack depth"
  // structural comparisons at every call site that mixes the two.
  return new PrismaClientNode({
    adapter: new PrismaLibSQL({ url }),
  }) as unknown as PrismaClient;
}
