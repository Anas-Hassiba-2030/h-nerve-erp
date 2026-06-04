# RUNBOOK — Operations (Railway + Railway PostgreSQL)

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

## 2. Database backup / restore (Railway PostgreSQL)

### 2.1 Confirm automated backups are ON (do this once, re-check quarterly)

1. Railway dashboard → the **Postgres** service → **Backups** tab.
2. Ensure **scheduled backups** are enabled with a **daily** cadence. On the
   current plan Railway takes daily snapshots; verify the toggle is on and note
   the **retention window** (how many days of snapshots are kept) shown there.
3. If the toggle is off, enable it — backups are per-service and do **not**
   inherit from other services.

> Checklist: `[ ] daily snapshots enabled · [ ] retention ≥ 7 days · [ ] last
> snapshot < 24h old`. Re-verify after any plan change.

### 2.2 Point-in-time / snapshot restore (recovery)

Railway restore is **snapshot-based** (restore to the moment a snapshot was
taken), not continuous WAL replay. To recover:

1. Postgres service → **Backups** → pick the snapshot just **before** the
   incident → **Restore**. Railway restores into the service (or offer to spin a
   new DB from it, depending on plan).
2. **Verify before repointing:** if restored to a new instance, connect with
   `psql "$NEW_URL"` and spot-check row counts on `User`, `Tenant`, `Company`,
   `Transaction` before switching traffic.
3. Update `DATABASE_URL` in the app service Variables to the restored instance
   (only if it changed) → redeploy.
4. For **finer than snapshot granularity**, layer the manual dump below — take
   one before any risky migration/seed so you have a tighter recovery point.

### 2.3 Manual snapshot (belt-and-suspenders, before risky changes)

```bash
pg_dump "$DATABASE_URL" -Fc -f hnerve_$(date +%Y%m%d_%H%M).dump
```
Locally, grab the URL from the Railway dashboard (Postgres → Connect) or
`railway variables`.

### 2.4 Restore a manual dump

```bash
pg_restore --clean --no-owner -d "$DATABASE_URL" hnerve_YYYYMMDD_HHMM.dump
```

- Migrations are forward-only via `prisma migrate deploy` (the railway.toml
  preDeploy step). To undo a bad migration, restore the DB (2.2/2.4) — do **not**
  hand-edit applied files under `prisma/migrations/`.
- **Never** run `prisma db push --accept-data-loss` or `db:reset` against prod
  (the `npm run build` script does `db push` — it's for build/codegen of the
  client, but the `--accept-data-loss` flag means it must only ever run against
  a disposable DB; Railway's preDeploy uses `migrate deploy`, which is safe).

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
