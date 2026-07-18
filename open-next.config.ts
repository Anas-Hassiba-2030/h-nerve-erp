// OpenNext → Cloudflare Workers adapter config (Phase 4 §3).
//
// Deliberately minimal: no R2 incremental cache yet — every authenticated
// surface in this app is force-dynamic/cookie-driven, so ISR caching buys
// nothing today. Add the r2-incremental-cache override (+ the R2 bucket in
// wrangler.jsonc) if static/ISR pages ever appear.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// The repo's `npm run build` is the RAILWAY script (guard + prisma generate +
// db push + next build) — `db push` needs a live DB and must never run inside
// a Cloudflare build. Build the Next app directly; `prisma generate` already
// ran via postinstall.
// Force the webpack builder (Next 16 defaults `next build` to Turbopack).
// Turbopack emits the Prisma query-compiler WASM as a dynamic import() with an
// ABSOLUTE path, which wrangler's module-collector then double-prefixes into a
// nonexistent path (ENOENT on `.open-next/server-functions/default/<abs>/…wasm`)
// and the deploy bundling fails. Webpack emits a resolvable relative wasm import
// that wrangler bundles cleanly — and webpack is OpenNext's tested build output.
config.buildCommand = "npx next build --webpack";

export default config;
