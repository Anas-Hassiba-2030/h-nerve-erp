# RUNBOOK — Operations (Cloudflare Workers + D1)

Operational procedures. Pairs with `docs/DEPLOYMENT.md` (one-time setup). This
file is the "something is wrong / something must be rotated" reference.

Two ways to drive Railway: the **dashboard** (Variables / Deployments / the
Postgres service) or the **CLI** (`npm i -g @railway/cli`, `railway login`,
`railway link`). Both are noted below.

---

## 1. Secret rotation

Treat every secret ever pasted into a chat, screenshot, screen-share, or shared
terminal as **compromised** and rotate it.

### App-controlled secrets

`SESSION_PASSWORD`, `IMPORT_API_TOKEN`, `SEED_ADMIN_PASSWORD`, `CRON_SECRET`,
`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.

- **Dashboard:** service → **Variables** → edit the value → Railway
  **auto-redeploys** so the new value takes effect.
- **CLI:**
  ```bash
  NEW=$(node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))")
  railway variables --set "SESSION_PASSWORD=$NEW"   # triggers a redeploy
  unset NEW
  ```
- API keys (Anthropic / Gemini) are rotated in the **provider console** first
  (regenerate there), then pasted into Railway Variables.
- Rotating `SESSION_PASSWORD` invalidates every active iron-session → all users
  must sign in again (expected). It must be **≥ 32 chars** or the app refuses to
  boot (`lib/session.ts`).
- Keep local `.env` in sync if you run against prod data. `.env` is git-ignored —
  never commit it.

### Database credentials (`DATABASE_URL`)

`DATABASE_URL` is **managed by the Railway PostgreSQL plugin** and injected
automatically — you normally never set it by hand. To rotate the DB password,
use the **Postgres service → Variables/Connect** (regenerate credentials there);
Railway repoints the injected `DATABASE_URL` and redeploys the app service.
Update local `.env` to match if you connect locally.

---

## 2. Database backup / restore (Cloudflare D1)

> Production is **Cloudflare D1**, reached through the `DB` binding in
> `wrangler.jsonc`. This section previously documented Railway PostgreSQL
> snapshots — a service this project no longer uses. Following it would have
> sent you to a dashboard for a database that does not exist.

D1 has no managed snapshot UI to tick on, so backups are explicit: a scheduled
export, kept as a build artifact, **drilled on every run**.

### 2.1 The automated daily backup

`.github/workflows/d1-backup.yml` runs at **02:30 UTC daily** (outside Jordan
business hours) and on manual dispatch:

1. `wrangler d1 export` dumps production — a **read-only** operation; it cannot
   migrate, mutate, or delete.
2. The dump is **drilled** (§2.3): topo-sorted, restored into a throwaway
   SQLite database, row counts compared. A dump that would not restore fails
   the workflow, so you find out on a quiet Tuesday instead of during an outage.
3. The dump is uploaded as a workflow **artifact**, retained **30 days**.

Dumps are **never committed** — they hold real tenant data (live bookings, the
finance ledger) and would bloat history irreversibly. `backups/` is gitignored.

Run it on demand:

```bash
gh workflow run d1-backup.yml
```

> Quarterly check: `[ ] last run < 24h old · [ ] drill step green · [ ] artifact
> present and non-trivial in size`.

### 2.2 Manual snapshot (before any risky change)

Take one before a schema change, a bulk import, or a seed against production:

```bash
node scripts/ops/d1-backup.mjs
```

Needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Writes
`backups/d1-<db>-<utc-stamp>.sql` plus a `.meta.json` sidecar recording table
count, INSERT count, and per-table rows — so you can tell two dumps apart
without opening them.

Other sources:

```bash
node scripts/ops/d1-backup.mjs --local                      # wrangler's local D1 state
node scripts/ops/d1-backup.mjs --from-sqlite prisma/dev.db  # the seeded dev database
```

### 2.3 Drill a dump (do this before you ever need it)

```bash
node scripts/ops/d1-restore-drill.mjs backups/d1-<db>-<stamp>.sql
```

Topo-sorts the dump, applies every statement to a throwaway SQLite database,
then compares restored row counts against the dump's own INSERT counts.
Exit 0 means the backup is genuinely restorable and complete.

**It never touches production.** It reads a dump file and writes only to a temp
directory it creates itself — no credentials, no remote connection.

Last executed drill: **74 tables · 1534 rows · all counts matched** (against the
seeded dev database, 2026-07-24).

### 2.4 Restore into production (real recovery)

⚠️ Destructive and outward-facing. Confirm the target and take a fresh dump of
the current state first (§2.2), even if you believe it is corrupt — you may
need to recover rows written after the backup you are restoring.

1. **Drill the dump first** (§2.3). Never import an unverified dump into prod.
2. Topo-sort it — D1 validates FK targets at CREATE TABLE time, so an
   alphabetical dump aborts partway with `no such table`:
   ```bash
   node scripts/build/d1-sort-dump.mjs backup.sql sorted.sql
   ```
3. Import:
   ```bash
   npx wrangler d1 execute h-nerve-erp-db --remote --file sorted.sql
   ```
4. **Verify before announcing recovery:** spot-check row counts on `User`,
   `Tenant`, `Company`, `Transaction`, `Booking` and log in as a real user.

### 2.5 Standing rules

- **Never** run `prisma db push --force-reset`, `db:reset`, or `db:fresh`
  against production. `scripts/ops/guard-not-prod.js` guards the npm scripts;
  it cannot guard a hand-typed command.
- Schema changes ship as `prisma db push` locally + a fresh topo-sorted D1
  import. `prisma/migrations/` is Postgres-era history, not the source of truth.
- Never verify a feature by creating rows in production. Use the local dev
  server with seeded credentials; keep production checks read-only.

---

## 3. Monitoring — uptime + error alerting

The app exposes `GET /api/health` (no auth, read-only): `SELECT 1` DB liveness +
required-env check + uptime/latency. It returns **200** `{status:"ok"}`,
**200** `{status:"degraded"}` (up but a non-critical check failed), or **503**
`{status:"error"}` (DB unreachable). Railway already polls it as the container
`healthcheckPath` every 30s (railway.toml) and restarts on non-2xx.

### 3.1 Uptime probe (external — survives a full app outage)

Railway's healthcheck only restarts the container; it can't alert you when the
whole service is down. Add an **external uptime monitor** (Betterstack / Checkll
/ UptimeRobot — any HTTP probe):

- **URL:** `https://<prod-domain>/api/health`
- **Method:** GET, **interval:** 1 min, **expected:** HTTP `200`
- **Healthy assertion (stricter):** response JSON `status == "ok"` (so a
  `degraded` 200 still pages). Most monitors support a keyword/JSON assertion.
- **Thresholds / alert policy:**
  - **Down** = 2 consecutive failed probes (non-200 or assertion fail) → page
    on-call (avoids flapping on a single blip).
  - **Latency** = warn if probe round-trip > **2s** for 5 min (DB or cold-start
    pressure). The body's `checks.db` latency surfaces DB-specific slowness.
  - **Recovery** = auto-resolve after 2 consecutive `200 ok`.

### 3.2 Error alerting (logs → alert)

Request-path errors are structured JSON on **stderr** via `lib/logger.ts`
(`{level:"error",scope,...}` — see D13). Two paths:

- **Railway-native:** Railway → service → **Observability / Logs** → add a **log
  alert** on the filter `level:"error"` (or `status:"error"` for health) →
  notify Slack/email. Suggested threshold: **≥ 5 `level:"error"` lines in
  10 min**, or **any** `health: DB unreachable`.
- **Sentry (richer, optional):** `npm i @sentry/nextjs` → `npx
  @sentry/wizard@latest -i nextjs` → set `SENTRY_DSN` (+
  `NEXT_PUBLIC_SENTRY_DSN`) in Railway Variables → redeploy. Gives stack traces
  + release tracking the log filter can't. Alert on a new issue or a spike.

Until an alerting channel is wired, errors are visible via **Railway →
Deployments → View Logs** (or `railway logs`) filtered on `level:"error"`.

---

## 4. Public access

Railway serves the app on its generated domain (e.g.
`https://hnerve.up.railway.app`) — **public by default**, which is what we want
for the live URL. There is no Vercel-style per-deployment auth wall.

- A **custom domain** is added under the service → **Settings → Networking →
  Custom Domain** (then set `NEXT_PUBLIC_APP_URL` to match and redeploy).
- To make the service non-public, remove the public domain and use Railway
  **private networking** — only do this for internal-only environments.

---

## 5. Scheduled Brain analysis — weekly self-tuning

`/api/brain/cron` runs the scheduled Brain refresh (Phase 10 weekly
self-tuning), auth-gated on `CRON_SECRET` (the caller must send
`Authorization: Bearer $CRON_SECRET`; the route fail-closes with 503 if the
secret is unset, 401 on mismatch). It iterates every ACTIVE tenant and returns
a one-line JSON summary.

**Railway has no built-in cron**, so the scheduler lives **outside** the app.
The committed, version-controlled choice is a **GitHub Actions scheduled
workflow** — `.github/workflows/brain-cron.yml` — which fires Mondays 06:00 UTC
and can be run manually via *workflow_dispatch*. It is the cheapest option that
needs no Railway dashboard access and leaves an audit trail in the Actions tab.

### One-time setup

1. In the repo: **Settings → Secrets and variables → Actions** → add two
   repository secrets:
   - `APP_URL` — the production base URL, e.g. `https://h-nerve-erp.up.railway.app`
     (no trailing slash).
   - `CRON_SECRET` — the **same** value set on the Railway service env.
2. Set `CRON_SECRET` on the Railway service (Variables tab) if not already set.
   Generate one with `openssl rand -hex 32`.
3. The workflow self-verifies: it asserts an HTTP 200 and prints the JSON
   summary; a non-200 fails the job and surfaces in the Actions tab.

**Change the cadence** by editing the `cron:` expression in the workflow.
**Manual run:** Actions → *Brain weekly self-tuning* → *Run workflow*.

**Alternatives** (if you prefer not to use Actions): a Railway cron *service*
(separate service, same image, start command `curl …`), or an external probe
(cron-job.org / Upstash QStash) hitting the same URL with the bearer header.

**Fallback (no scheduler):** the on-demand **Run analysis** button on
`/admin/brain` calls the same engine.

---

## 6. Adding a new tenant-scoped model

When a new business-data model lands on `prisma/schema.prisma`:

1. Add `tenantId String` (NOT NULL) and `@@index([tenantId])`.
2. If existing rows need backfilling, follow
   `prisma/migrations/20260520_add_tenant_id_to_booking_crop/migration.sql`
   — add nullable → backfill from parent → verify zero NULLs → set
   NOT NULL → index. Never set NOT NULL before backfill.
3. Add the model name to `TENANT_SCOPED_MODELS` in `lib/workspaceScope.ts`.
4. Add a vitest case in `lib/workspaceScope.test.ts` for find/create.
5. Make sure pages/actions use `prisma`, not `prismaUnscoped`.
6. Append a per-tenant count to `scripts/test/test-isolation.ts`.
7. If the demo seed touches this model, include `tenantId` in the upsert.

Full rationale + the two scoping planes are in `docs/ISOLATION.md`.

---

## 7. Quick health triage

| Symptom | First check |
|---------|-------------|
| Site unreachable in a browser, fine elsewhere | Client/network (ISP RST, AV HTTPS scan, VPN) — not Railway. `curl -I https://hnerve.up.railway.app` from another network → `307`/`200` = deploy healthy. |
| 500s after deploy | Railway → Deployments → **View Logs** (or `railway logs`); check `SESSION_PASSWORD` ≥32 and that `DATABASE_URL` is attached. |
| Build/deploy failed | Railway build logs — usually a missing/short env var or a failed migration in the preDeploy step. |
| Health check failing | `GET /api/health` → 503 means DB unreachable; confirm the Postgres plugin is attached + healthy. |
| Insights stale | Hit **Run analysis** on `/admin/brain`, or wire the cron (§5). |
| Login fails for everyone | The deploy bootstrap (`scripts/seed/ensure-admins.ts`) guarantees `admin@hourani.jo` / `admin123`; re-deploy to re-run it. |
