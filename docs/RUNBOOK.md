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

- **Automated backups:** Railway Postgres service → **Backups** tab (cadence
  depends on plan). Restore from a listed snapshot there.
- **Manual snapshot before risky changes** (uses the injected URL):
  ```bash
  pg_dump "$DATABASE_URL" -Fc -f hnerve_$(date +%Y%m%d).dump
  ```
  Locally, grab the URL from the Railway dashboard (Postgres → Connect) or
  `railway variables`.
- **Restore a dump:**
  ```bash
  pg_restore --clean --no-owner -d "$DATABASE_URL" hnerve_YYYYMMDD.dump
  ```
- Migrations are forward-only via `prisma migrate deploy` (the railway.toml
  preDeploy step). To undo a bad migration, restore the DB (above) — do **not**
  hand-edit applied files under `prisma/migrations/`.

---

## 3. Error tracking (Sentry) — setup procedure

Not yet wired (no DSN). To enable:

```bash
npm i @sentry/nextjs
npx @sentry/wizard@latest -i nextjs    # generates sentry.*.config.ts
```

Then set `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`) in Railway Variables and
redeploy. Until then, runtime errors are visible via **Railway → Deployments →
View Logs** (or `railway logs`) — the current telemetry path.

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
