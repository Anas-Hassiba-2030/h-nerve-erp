# DEPLOYMENT — Phase 11 (Vercel + Neon PostgreSQL)

Production runbook for H-Nerve ERP. The app stays on **iron-session**
(no NextAuth) and **single-tenant by default**. For a fast offline pitch
demo, do NOT use this — revert to SQLite per
`docs/OPERATING-PROTOCOL.md §6`.

## Architecture

- **DB:** Neon PostgreSQL. `prisma/schema.prisma` `datasource` uses
  `url = DATABASE_URL` (POOLED / pgbouncer, runtime) and
  `directUrl = DIRECT_URL` (DIRECT, migrations only).
- **Migrations:** real migration files in `prisma/migrations/`. Vercel
  applies them at build via `prisma migrate deploy` (NOT `db push`).
- **Host:** Vercel, region `iad1` (see `vercel.json`). Build command:
  `prisma generate && prisma migrate deploy && next build`.
- **Money:** the 7 money columns are `@db.Decimal(12, 2)` →
  `DECIMAL(12,2)` (only valid on Postgres). `*Json` columns stay
  `String`/`TEXT` (codebase convention — NOT Prisma `Json`/`JSONB`).

## One-time setup

### 1. Neon

Create a project at console.neon.tech (region: AWS `us-east-1`, closest
to Vercel `iad1`). From Connection Details copy BOTH:

- `DATABASE_URL` — Pooled connection ON; ends `...-pooler...neon.tech/
  neondb?sslmode=require` → append `&pgbouncer=true`.
- `DIRECT_URL` — Pooled connection OFF (no `-pooler`).

### 2. Migrate (local, against Neon)

With both URLs in local `.env`:

```
npx prisma migrate dev --name init-postgres   # first time only
```

Creates + applies `prisma/migrations/<ts>_init_postgres/`. If Neon
errors `P3014` (shadow DB), set `shadowDatabaseUrl` to a second Neon
branch and retry.

### 3. Seed production data (one-time, non-destructive)

`scripts/seed-production.ts` is upsert-only — safe to re-run, never
wipes. Requires a strong `SEED_ADMIN_PASSWORD` (refuses missing / <12
chars / `admin123`).

```
SEED_ADMIN_PASSWORD=... npm run seed:prod
```

Seeds: Chart of Accounts (8 accounts, codes from `lib/accounting.ts`
`ACCT`), admin `admin@hourani.jo`, tenant `hourani-hotels` (ACTIVE),
warehouse `Amman Main` / `AMM-A`. The opaque tenant label
`hourani-hotels` MUST match what the n8n import payload sends.

## Deploy (Vercel)

```
npx vercel login
npx vercel link
# set Production env vars (table below)
npx vercel --prod
```

### Production environment variables

| Name | Source | Required | Note |
|------|--------|----------|------|
| `DATABASE_URL` | Neon POOLED (`&pgbouncer=true`) | yes | runtime queries |
| `DIRECT_URL` | Neon DIRECT (no `-pooler`) | yes | `migrate deploy` at build |
| `SESSION_PASSWORD` | random ≥32 chars | **yes** | app HARD-FAILS to boot without it (`lib/session.ts`) |
| `IMPORT_API_TOKEN` | random hex | yes | bearer for `POST /api/import/test`; unset → 503 |
| `NEXT_PUBLIC_APP_URL` | the Vercel URL | yes | post-logout redirect; set after first deploy, then redeploy |
| `NEXT_PUBLIC_DISABLE_INTRO` | — | no | omit/empty so real users get onboarding |
| `ANTHROPIC_API_KEY` | console.anthropic.com | no | UNSET → Brain stub mode, $0 spend. Set only for live Brain (burns credit); cap with `BRAIN_MAX_LLM_CALLS` |

`SEED_ADMIN_PASSWORD` is NOT a Vercel var — seeding runs locally against
Neon, once.

Generate secrets:
```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # SESSION_PASSWORD
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"        # IMPORT_API_TOKEN
```

## Verify

- `GET /api/health` → `{ "status": "ok", "db": "connected" }` (503 = DB
  unreachable).
- `/login` loads → sign in `admin@hourani.jo` → `/dashboard` loads.

## n8n (Phase 10 ingestion)

The old Cloudflare tunnel URL is dead. In the n8n Cloud workflow's HTTP
Request node:

- URL → `https://<app>.vercel.app/api/import/test`
- Header `Authorization: Bearer <IMPORT_API_TOKEN>` (the production value
  set in Vercel).

## Security checklist

- `.env` is gitignored — never commit real secrets. `.env.production.example`
  is the safe template.
- Any secret pasted in chat (Neon password, API key) is compromised —
  rotate in the Neon / Anthropic dashboards after the pitch.
- `next.config.mjs` ships HSTS, `X-Frame-Options: DENY`, COOP,
  `nosniff`, restrictive `Permissions-Policy`. CSP is deliberately
  deferred (see the file header).

## Local SQLite revert (offline pitch)

Per `docs/OPERATING-PROTOCOL.md §6`: in `.env` comment the Neon pair and
uncomment `DATABASE_URL="file:./dev.db"`; in `prisma/schema.prisma` set
`provider = "sqlite"` (drop `directUrl`); run `npm run db:reset`.
