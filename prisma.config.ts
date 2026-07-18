import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 6.19 no longer auto-detects the multi-file `prisma/schema/` folder
// from a bare `prisma generate` (it only probes `prisma/schema.prisma` and
// `schema.prisma`). This config points every bare Prisma CLI invocation —
// postinstall, `npm run build`, Railway buildCommand, db:push — at the folder,
// restoring the pre-6.19 zero-flag behaviour the scripts rely on.
//
// prisma.config.ts also disables Prisma's implicit .env loading, so we import
// dotenv/config above to keep DATABASE_URL available to local db push/migrate.
// (Railway/production inject real env vars, so dotenv is a no-op there.)
export default defineConfig({
  schema: path.join("prisma", "schema"),
});
