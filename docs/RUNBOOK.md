# RUNBOOK — Operations

Operational procedures for the Vercel + Neon production deployment.
Pairs with `docs/DEPLOYMENT.md` (one-time setup). This file is the
"something is wrong / something must be rotated" reference.

---

## 1. Secret rotation

Treat every secret that has ever been pasted into a chat, screen-share,
or shared terminal as **compromised** and rotate it.

### App-controlled secrets (rotate from the CLI — no external console)

`SESSION_PASSWORD`, `IMPORT_API_TOKEN`, `SEED_ADMIN_PASSWORD`,
`CRON_SECRET`.

```bash
# Generate a fresh value WITHOUT printing it, replace it on Vercel,
# then redeploy so running functions pick it up.
NEW=$(node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))")
printf '%s' "$NEW" | vercel env rm SESSION_PASSWORD production -y
printf '%s' "$NEW" | vercel env add SESSION_PASSWORD production
unset NEW
vercel --prod        # redeploy: env changes only take effect on a new deployment
```

- Rotating `SESSION_PASSWORD` invalidates every active iron-session →
  all users must sign in again. Expected; acceptable for a prototype.
- Keep the local `.env` `SESSION_PASSWORD` in sync if you run the app
  locally against prod data. **`.env` is git-ignored — never commit it.**
- `SESSION_PASSWORD` must be ≥ 32 chars or the app refuses to boot in
  production (this is why two early deploys errored — see
  `vercel inspect <url> --logs`).

### Externally-controlled secrets (rotate in the provider console)

`DATABASE_URL`, `DIRECT_URL` — these embed the **Neon** password.
The password lives in Neon, not Vercel, so it **cannot** be rotated
from this repo or the Vercel CLI alone:

1. Neon console → project → **Roles** → reset the role password (or
   create a new role and repoint).
2. Copy the new pooled (`-pooler`, append `&pgbouncer=true`) and direct
   connection strings.
3. `vercel env rm DATABASE_URL production -y` then
   `vercel env add DATABASE_URL production` (paste new pooled URL);
   same for `DIRECT_URL` (direct URL).
4. `vercel --prod` to redeploy.
5. Update local `.env` to match.

---

## 2. Neon backup / restore

Neon keeps continuous history; recovery is point-in-time, not a manual
dump.

- **Restore (PITR):** Neon console → **Branches** → *Restore* → pick a
  timestamp (within the project's history-retention window) → restore
  in place or to a new branch. Verify on the new branch first, then
  repoint `DATABASE_URL`/`DIRECT_URL` if used.
- **Manual snapshot before risky changes:** `pg_dump "$DIRECT_URL" -Fc
  -f hnerve_$(date +%Y%m%d).dump` (use the DIRECT, non-pooled URL).
- **Restore a dump:** `pg_restore --clean --no-owner -d "$DIRECT_URL"
  hnerve_YYYYMMDD.dump`.
- Migrations are forward-only via `prisma migrate deploy` at build. To
  undo a bad migration, restore the DB (above) — do **not** hand-edit
  `prisma/migrations/`.

---

## 3. Error tracking (Sentry) — setup procedure

Not yet wired (no DSN to embed). To enable:

```bash
npm i @sentry/nextjs
npx @sentry/wizard@latest -i nextjs    # generates sentry.*.config.ts
```

Then set `SENTRY_DSN` (and `NEXT_PUBLIC_SENTRY_DSN`) as Vercel env vars
for Production and redeploy. Until then, runtime errors are visible only
via `vercel logs <deployment-url>` — that is the current telemetry path.

---

## 4. Decision: Vercel Deployment Protection

**Kept ON.** The auto-generated `*-anashasiba91-3691s-projects.vercel.app`
deployment URLs return **401** behind Vercel Standard Protection — this
is intentional: preview/raw deployment URLs require Vercel auth.

The public production alias **`hnerve-erp.vercel.app` is open** (returns
the normal `307 → /login`) and is the URL to share for the pitch.

If a specific preview must be shared externally without a Vercel login,
either disable protection for that one deployment in the Vercel project
settings, or alias it — do not blanket-disable protection.

---

## 5. Scheduled Brain analysis — cron caveat

`vercel.json` registers `/api/brain/cron` at `0 3 * * *` (daily,
03:00 UTC). The route is auth-gated on `CRON_SECRET` (Vercel attaches
`Authorization: Bearer $CRON_SECRET` to scheduled calls; set that env
var or the route fail-closes with 503).

The schedule is **daily because the account is on the Hobby plan**,
which *hard-rejects the deploy* for any sub-daily cron (a `*/15`
expression fails the build with "Hobby accounts are limited to daily
cron jobs" — not a silent clamp). For tighter cadence, upgrade to Pro
and change the expression, or use the on-demand **Run analysis**
button on `/admin/brain`, which calls the same engine.

---

## 6. Quick health triage

| Symptom | First check |
|---------|-------------|
| Site unreachable in a browser, fine elsewhere | Client/network (ISP RST, AV HTTPS scan, VPN) — not Vercel. `curl -I https://hnerve-erp.vercel.app` from another network → `307` = deploy healthy. |
| 500s after deploy | `vercel logs <url>`; check `SESSION_PASSWORD` ≥32 and DB env vars. |
| Build ERROR | `vercel inspect <url> --logs` — usually a missing/short env var caught at page-data collection. |
| Insights stale | Hit **Run analysis** on `/admin/brain` or confirm the cron secret + plan. |
