# DEPLOYMENT — Railway + Railway PostgreSQL

Production runbook for H-Nerve ERP. The app uses **iron-session** (no
NextAuth) and is **single-tenant by default**. Production runs on **Railway**
with Railway's managed **PostgreSQL** plugin. For a fast offline demo, revert
to SQLite per `docs/OPERATING-PROTOCOL.md §6`.

> History: an earlier plan targeted Vercel + Neon; the project now runs on
> Railway. The old `vercel.json` was removed. (The legacy Vercel/Neon ops
> procedures still live in `docs/RUNBOOK.md` and are being migrated.)

## Architecture

- **Host:** Railway, GitHub-connected — pushing to `main` auto-deploys.
- **DB:** Railway PostgreSQL plugin. `DATABASE_URL` is auto-injected into the
  service. `prisma/schema/schema.prisma` uses `provider = "postgresql"`,
  `url = DATABASE_URL`.
- **Migrations:** real files in `prisma/migrations/`, applied by
  `prisma migrate deploy` in the deploy step (NOT `db push`).
- **Money:** the money columns are `@db.Decimal(12,2)` (Postgres only). `*Json`
  columns stay `String`/`TEXT` (codebase convention — not Prisma `Json`/`JSONB`).

## `railway.toml` (the deploy contract)

- **build:** `npm install && prisma generate && next build`
- **preDeploy:** `prisma migrate deploy` then three idempotent bootstrap
  scripts (wrapped so a hiccup can't block the deploy):
  - `scripts/seed/seed-if-empty.ts` — seed the full demo dataset only if the DB is empty.
  - `scripts/seed/ensure-admins.ts` — guarantee the admin/owner accounts can sign in.
  - `scripts/seed/ensure-demo-docs.ts` — top up the demo documents if the table is empty.
- **start:** `next start -p ${PORT}`
- **healthcheck:** `GET /api/health` (Railway restarts on non-2xx).

## Production environment variables (Railway → service → Variables)

| Name | Source | Required | Note |
|------|--------|----------|------|
| `DATABASE_URL` | Railway Postgres plugin | yes | auto-injected when you attach the DB |
| `SESSION_PASSWORD` | random ≥32 chars | **yes** | app HARD-FAILS to boot without it (`lib/session.ts`) |
| `SEED_ADMIN_PASSWORD` | random ≥12 chars | yes | the owner account's password (`ensure-admins.ts`); do not use `admin123` |
| `IMPORT_API_TOKEN` | random hex | yes | bearer for `POST /api/import/test`; unset → 503 |
| `NEXT_PUBLIC_APP_URL` | the Railway URL (e.g. `https://hnerve.up.railway.app`) | yes | post-logout redirect + absolute links |
| `ANTHROPIC_API_KEY` | console.anthropic.com | recommended | UNSET → Brain stub mode, $0 spend. Set for live Brain (cap via `BRAIN_MAX_LLM_CALLS`) |
| `GEMINI_API_KEY` | aistudio.google.com | recommended | RAG embeddings (semantic search). Or `OPENAI_API_KEY` / `VOYAGE_API_KEY`. Unset → local fallback (rougher) |
| `CRON_SECRET` | random hex | for cron | bearer the scheduler sends to `/api/brain/cron` (see below) |
| `NEXT_PUBLIC_DISABLE_INTRO` | — | no | omit/empty so real users get onboarding |

Generate secrets:
```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # SESSION_PASSWORD
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"        # IMPORT_API_TOKEN / CRON_SECRET
```

## Deploy

1. Attach the **PostgreSQL** plugin to the project (injects `DATABASE_URL`).
2. Set the env vars above.
3. Push to `main` (or click **Deploy**). The preDeploy step migrates + seeds.
4. Verify (below). First sign-in: `admin@hourani.jo` / `admin123`, or your
   owner email / `SEED_ADMIN_PASSWORD`.

> First-time-only full seed: `scripts/seed/seed-production.ts` is upsert-only
> (`npm run seed:prod`, requires `SEED_ADMIN_PASSWORD`). The deploy bootstrap
> usually makes this unnecessary.

## ⏰ Scheduled Brain refresh (`/api/brain/cron`) — needs a scheduler

The brain's scheduled refresh endpoint (`GET /api/brain/cron`, guarded by
`CRON_SECRET`) was previously triggered by Vercel Cron. **Railway has no
built-in cron**, so this is NOT firing until you set one up. Options:

- A **Railway cron service** (separate service, schedule `0 3 * * *`, command:
  `curl -fsS -H "Authorization: Bearer $CRON_SECRET" $NEXT_PUBLIC_APP_URL/api/brain/cron`), or
- An external scheduler (cron-job.org / a GitHub Actions `schedule`) hitting
  the same URL with the bearer header.

Set `CRON_SECRET` in Railway and on the caller. On-demand refresh still works
via `/admin/brain` → "Run analysis".

## Verify

- `GET /api/health` → `{ "status": "ok", "db": "connected" }` (503 = DB unreachable).
- `/login` loads → sign in → `/dashboard` loads.

## n8n (Phase 10 ingestion)

In the n8n workflow's HTTP Request node:
- URL → `https://<app>.up.railway.app/api/import/test`
- Header `Authorization: Bearer <IMPORT_API_TOKEN>` (the production value).

## Security checklist

- `.env` is gitignored — never commit real secrets. `.env.production.example`
  is the safe template.
- Any secret pasted in chat or a screenshot is compromised — rotate it in the
  provider dashboard (Anthropic / Google AI Studio / Railway).
- `next.config.mjs` ships HSTS, `X-Frame-Options: DENY`, COOP, `nosniff`,
  restrictive `Permissions-Policy`.

## Local SQLite revert (offline demo)

Per `docs/OPERATING-PROTOCOL.md §6`: in `.env` set `DATABASE_URL="file:./dev.db"`;
in `prisma/schema/schema.prisma` set `provider = "sqlite"`; run `npm run db:reset`.
Flip both back to `postgresql` before committing.
