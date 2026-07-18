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
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function makePrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — required to build the Prisma pg driver adapter.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
