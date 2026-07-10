# Cloudflare Compatibility Audit — H-Nerve on Workers

owner: Anas Hasiba
last-updated: 2026-07-10
status: AUDIT — sign-off gate for Phase 4 §2/§3

Code-free audit (PR-A of Phase 4). No runtime change ships with this document.
Every file:line below was verified against the current tree; every platform claim
was verified against live vendor docs on **2026-07-10** (retrieval date for all
URLs cited). Items that could not be re-verified are marked "verify before PR-F".

---

## 1. Executive verdict

**Migration to Cloudflare is feasible.** The app is closer to Workers-ready than
a typical Next app of this size: no filesystem writes at runtime, no native Node
addons, session crypto already on Web Crypto, and the only Node builtins in use
(`crypto`, `Buffer`) are covered by the `nodejs_compat` flag.

Two architectural blockers, both with chosen mitigations:

| # | Blocker | Chosen mitigation |
|---|---------|-------------------|
| 1 | **Prisma 5.22 runs the Rust query engine** — `new PrismaClient()` in `src/lib/db/db.ts` cannot boot on workerd. | Add `driverAdapters` to `previewFeatures` + `@prisma/adapter-neon` + `@neondatabase/serverless`. Stay on Prisma 5.22 — no Prisma 6/7 jump mid-migration. `@prisma/adapter-neon@5.22.0` exists and pairs with serverless driver `^0.6.0–^0.10.0` (npm registry, retrieved 2026-07-10). |
| 2 | **In-memory SSE fan-out** — `src/lib/realtime/realtime.ts` keeps module-level `SCOPES`/`SUBSCRIBERS` Maps; cross-isolate fan-out is impossible on stateless Workers. | Degrade to polling. `src/components/realtime/RealtimePresence.tsx` already falls back to 25 s GET polling when `EventSource` fails — disable the SSE route on Workers, back presence with the DB. Durable-Object rebuild is the later upgrade path, not a prerequisite. |

**Workers Paid plan is required.** Free tier is 10 ms CPU + 50 subrequests per
request; Paid is 5 min CPU (default 30 s) + 10,000 subrequests
(<https://developers.cloudflare.com/workers/platform/limits/>, retrieved
2026-07-10). A council convene fires ~6 LLM subrequests plus DB traffic; the
brain cron loops up to 200 tenants. Free-tier ceilings are not survivable.

**Deploy model correction:** the owner's brief said "Cloudflare Pages." The
current supported path for full-stack Next.js is **Workers + static assets via
`@opennextjs/cloudflare`**, deployed by Workers Builds git integration or CI.
Cloudflare's own Pages Next.js guide redirects SSR apps to the Workers guide
(<https://developers.cloudflare.com/pages/framework-guides/nextjs/>, retrieved
2026-07-10); the old `@cloudflare/next-on-pages` adapter supports only the Edge
runtime, which this app does not target. This audit recommends **Workers, not
Pages** — see ask (f).

**OpenNext readiness (live-verified 2026-07-10):** `@opennextjs/cloudflare`
latest is **1.20.1**; peer range `next >=15.5.18 <16 || >=16.2.6` — the repo is
on **Next 16.2.9**, inside the supported range. "All minor and patch versions of
Next.js 16" are supported on the Node.js runtime with SSR on Workers + static
assets (<https://opennext.js.org/cloudflare>). Requirements from the get-started
guide (<https://opennext.js.org/cloudflare/get-started>): `nodejs_compat`
compatibility flag, `compatibility_date >= 2024-09-23`, Wrangler ≥ 3.99 (peer
`^4.86.0`), assets served from `.open-next/assets` via an `ASSETS` binding.
Not-yet-supported features listed by OpenNext — Composable Caching
(`'use cache'`), PPR — are not used by this repo.

---

## 2. Compatibility inventory

Verdict legend: **fine** = works as-is · **nodejs_compat** = works under the
flag · **substitute** = needs a KV/DO/DB replacement or accepted degradation ·
**blocker** = architectural change required.

| Surface | Evidence | Verdict |
|---------|----------|---------|
| `crypto.randomBytes` | `src/lib/integrations/runtime.ts:12`, `src/app/(admin)/admin/tenants/actions.ts:16`, seedFederation.ts:8 | nodejs_compat |
| `crypto.createHash` | `src/lib/brain/narrator.claude.ts:12` | nodejs_compat |
| `crypto.timingSafeEqual` | `src/lib/auth/cronAuth.ts:19` | nodejs_compat |
| `Buffer` | cronAuth, `src/app/(app)/documents/actions.ts` | nodejs_compat |
| `fs` / `child_process` / `net` / `os` | none found in runtime code | fine |
| bcryptjs 2.4.3 | pure JS, no native addon | fine |
| iron-session 8.0.4 | iron-webcrypto → Web Crypto API | fine |
| File uploads | in-memory Buffer → Vision API base64 → Prisma text; no disk writes | fine |
| Exports (`/api/export/*`) | strings built in memory | fine |
| **Prisma 5.22** | Rust engine, `previewFeatures = ["prismaSchemaFolder"]` only, plain `new PrismaClient()` in `src/lib/db/db.ts` | **blocker** → driver adapters (§3e) |
| `$use` workspace-scoping middleware | `makeScopedClient` in `src/lib/db/db.ts` | fine — survives driver-adapter mode |
| **Realtime SSE** | module-level `SCOPES` Map (`src/lib/realtime/realtime.ts:96`) + `SUBSCRIBERS` Map<Set> (:115); `/api/realtime/stream` is a true `ReadableStream` SSE with 20 s keepalive | **blocker** → polling degrade (§3a) |
| Converse chat history | `SESSIONS` Map at `src/lib/brain/converse.ts:71` — code comment already says DB persistence was the intent | substitute → `ConverseSession` table (§3c) |
| Rate limiting | in-memory buckets `src/lib/import/rateLimit.ts:10,:54`, incl. login brute-force cap in `src/proxy.ts:47` | substitute → Workers KV / rate-limiting binding (§3c) |
| LLM tenant budget | `tenantBuckets` at `src/lib/brain/llmBudget.ts:17` (per-tenant daily) | substitute → KV with TTL (§3c) |
| LLM process cap | `__llmCallCount` at `src/lib/brain/llm.ts:74` | substitute or accept degraded guarantee (§3c) |
| Brain cron | `/api/brain/cron` loops ≤200 ACTIVE tenants sequentially, 4 analyzers + LLM calls each; caller = `.github/workflows/brain-cron.yml` (Mon 06:00 UTC, Bearer `CRON_SECRET`) | fine via HTTP caller (§3b) — HTTP-triggered Workers have **no hard duration limit** while the client stays connected (limits doc, retrieved 2026-07-10) |
| `/api/health` | `SELECT 1` via `prismaUnscoped`, host-agnostic | fine — uptime monitor repoints |
| `STARTED_AT` uptime | module-level; resets per isolate | fine — cosmetic |
| `src/proxy.ts` (middleware) | cookie unseal via iron-webcrypto; only issue is the in-memory login limiter above | fine (after §3c) |
| `next.config.mjs` | security headers via `headers()`, serverActions `bodySizeLimit: 5mb`, no `output` mode | fine — OpenNext handles |
| `railway.toml` preDeploy | `migrate deploy` + ~13 seed scripts | substitute → CI/deploy step (§3f) |
| engines | `node >=20.9` | fine |

---

## 3. Owner decision asks (six)

Each ask needs an explicit yes/no before Phase 4 §2/§3 starts.

**(a) Realtime → polling degrade [recommended] vs Durable-Object rebuild.**
Recommended: disable the SSE route on Workers, let
`RealtimePresence.tsx`'s existing 25 s polling fallback carry presence, back it
with a DB table. DO rebuild is the documented later upgrade path — do not gate
the migration on it.

**(b) Cron → keep the GitHub Actions caller [recommended] vs Workers Cron Triggers.**
Recommended: keep `.github/workflows/brain-cron.yml`, just point `APP_URL` at
Cloudflare. Zero new moving parts, and HTTP-triggered Workers have no hard
wall-clock limit while the caller holds the connection. Workers Cron Triggers
are the later optimization — note their scheduled handlers are CPU-limited to
30 s for sub-hourly schedules / 15 min for schedules ≥1 h apart
(<https://developers.cloudflare.com/workers/platform/limits/>, retrieved
2026-07-10; cron-trigger config at
<https://developers.cloudflare.com/workers/configuration/cron-triggers/>).
Either way: shard the tenant loop when tenant count grows.

**(c) In-memory state substitutes.** Workers isolates share nothing across
requests; each of these silently breaks without a substitute:
- login/import rate limiter → **Workers KV or the rate-limiting binding**;
- per-tenant daily LLM budget (`llmBudget.ts`) → **KV with TTL**;
- converse multi-turn history (`converse.ts` `SESSIONS`) → **`ConverseSession`
  table** (matches the existing code comment's intent);
- `__llmCallCount` process cap → KV, or accept the degraded per-isolate
  guarantee.

**(d) Workers Paid plan sign-off.** Required, per §1. Free tier's 10 ms CPU and
50 subrequests/request cannot run a council convene or the cron loop.

**(e) Prisma path: stay on 5.22 + `driverAdapters` preview + `@prisma/adapter-neon`.**
Add `driverAdapters` to `previewFeatures` (alongside `prismaSchemaFolder`),
install `@prisma/adapter-neon@5.22.0` + `@neondatabase/serverless`
(peer `^0.6.0–^0.10.0`), construct the client with the adapter in
`src/lib/db/db.ts`. The `$use` scoping middleware survives. Prisma's own
Workers guide documents this pairing
(<https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare>,
retrieved 2026-07-10). **Hyperdrive** is the documented alternative (works with
any Postgres, including keeping Railway PG), but Neon stays the recommendation
per the owner's brief — `docs/BRAIN-DB-LINK-RUNBOOK.md` and
`docs/DEPLOYMENT.md` already document Neon pooled/direct URL formats from the
pre-Railway era. No Prisma 6/7 upgrade inside this migration.

**(f) Deploy model = Workers + static assets, via Workers Builds git
integration — not Pages.** Corrects the owner's brief. `@opennextjs/cloudflare`
1.20.1, `wrangler.jsonc` with `nodejs_compat` + `compatibility_date ≥
2024-09-23`, assets binding on `.open-next/assets`. Migrations + seed scripts
(today in `railway.toml` preDeploy) move to a CI/deploy step before
`opennextjs-cloudflare deploy`. Workers Builds requires env vars configured in
its "Build variables and secrets" section
(<https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>,
retrieved 2026-07-10).

---

## 4. What does NOT change

- **Auth/session crypto** — iron-session on Web Crypto, bcryptjs pure JS; login
  flow and cookie format identical.
- **Uploads** — already in-memory Buffer → base64 → Prisma text; no disk, no R2
  required for parity.
- **Exports** — in-memory string builders; unchanged.
- **`/api/health`** — same `SELECT 1`; monitor repoints to the new host.
- **Middleware structure** — `src/proxy.ts` logic unchanged except the rate
  limiter's storage backend (§3c).
- **The brain's read-mostly boundary, server-action mutation pattern, route
  groups, i18n/theme cookies** — all host-agnostic.

---

## 5. Rollback doctrine

- **Railway stays live and untouched for the entire observation window.** The
  Cloudflare deployment runs against Neon in parallel; DNS/traffic cutover is a
  reversible step, not a burn-the-boats step.
- Rollback = repoint DNS/`APP_URL` back to Railway. No schema divergence is
  permitted during the window (same migrations run on both DB targets, or the
  window uses a single shared DB).
- **Railway retirement is a separate, later PR** — never part of Phase 4 §2/§3.

---

## 6. Prerequisites the owner provides before §2/§3

Delivered via the secrets channel — **never pasted in chat** (standing rule).

| Item | Notes |
|------|-------|
| Cloudflare API token | Scoped: `Workers Scripts:Edit` + `Pages:Edit` + optional `DNS:Edit` |
| Cloudflare Account ID | — |
| Neon **pooled** connection URL | For the app (driver adapter) |
| Neon **direct** connection URL | For `prisma migrate deploy` in CI |
| Domain (optional) | If cutover includes a custom domain, else `*.workers.dev` for the window |

---

## Sources (all retrieved 2026-07-10)

- <https://opennext.js.org/cloudflare> — adapter overview, Next 16 support, runtimes, unsupported features
- <https://opennext.js.org/cloudflare/get-started> — wrangler config, `nodejs_compat`, compatibility date, assets binding
- <https://registry.npmjs.org/@opennextjs/cloudflare/latest> — v1.20.1, peer `next >=15.5.18 <16 || >=16.2.6`, `wrangler ^4.86.0`
- <https://developers.cloudflare.com/workers/platform/limits/> — CPU/subrequest/memory/duration limits, Free vs Paid
- <https://developers.cloudflare.com/workers/configuration/cron-triggers/> — cron config + limits pointer
- <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/> — Workers deploy path, Workers Builds
- <https://developers.cloudflare.com/pages/framework-guides/nextjs/> — Pages guide redirects SSR Next.js to Workers
- <https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare> — adapter-neon on Workers
- <https://registry.npmjs.org/@prisma/adapter-neon> — 5.22.0 exists; peer `@neondatabase/serverless ^0.6.0–^0.10.0`
