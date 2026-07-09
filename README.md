# H-Nerve ERP — نظام العصب

A generic, white-labelable **ERP intelligence platform**. First deployment: مجموعة الحوراني (Hourani Group) across hotels, dairy (المها), agriculture (لوران), and education (Tank Incubator). Architecture is industry-agnostic — domain knowledge lives in pluggable industry packs.

The differentiator is the **Brain** (`src/lib/brain/`): a causal-graph + multi-agent + memory + planner intelligence layer beneath every screen. It reasons about the business, debates decisions, plans actions, and learns from outcomes. The Brain is **read-mostly**: it proposes; all mutations go through server actions.

UI is bilingual (ar/en), Arabic-first with RTL. Default design vocabulary: **Heritage Modern**.

## Stack

Next.js 16 (App Router, `src/` layout) · React 19 · TypeScript · Prisma + PostgreSQL (Railway prod; SQLite dev-flip allowed locally) · Tailwind · iron-session · Vitest.

## Quickstart

```bash
npm install
npm run dev         # Next dev server on http://localhost:3000
npm run db:push     # sync schema -> local dev DB
npm run db:seed     # Hourani sample data (see CLAUDE.md for seeded logins)
npm test            # Vitest pure-unit suite (lib/**/*.test.ts)
npm run lint        # next lint
npm run build       # prisma generate + db push + next build
```

Green gate before every merge: `npx tsc --noEmit` + `npm test` + `npm run lint` (+ `next build` for anything that can break the deploy). PRs only — `main` auto-deploys to Railway.

## Repo layout

| Path | What lives there |
|------|------------------|
| `src/app/` | Routes in four groups: `(auth)` public, `(app)` operator UI, `(admin)` superadmin console, `(theater)` fullscreen Decision Theater, plus `m/` mobile |
| `src/lib/` | One folder per pillar (`brain/`, `auth/`, `db/`, `tenancy/`, `i18n/`, …) — no loose root files |
| `src/components/` | Shared UI (Topbar, orrery, realtime, …) |
| `prisma/schema/` | Prisma schema, one file per pillar (`prismaSchemaFolder`) |
| `scripts/` | `build/ ops/ seed/ test/ verify/` |
| `docs/` | All documentation — see the map below |
| `.claude/agents/` | The agent company (specialist subagent briefs) |
| `public/orrery/` | Generated orbit hub — never hand-edit; built by `scripts/build/build-orrery.mjs` |

## Documentation map

Living state: **[`docs/STATUS.md`](docs/STATUS.md)** (where we are right now) · **[`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md)** (the forward plan) · **[`docs/INDEX.md`](docs/INDEX.md)** (full docs table of contents).

Start here, in order:

1. **[`CLAUDE.md`](CLAUDE.md)** — conventions, commands, hard-won lessons. Canonical.
2. **[`docs/MAP.md`](docs/MAP.md)** — navigation protocol: "if you want X, it lives at Y."
3. **[`docs/DESIGN-SKILL.md`](docs/DESIGN-SKILL.md)** — the design language (Heritage Modern default; one vocabulary per surface).
4. **[`docs/PHASES-INTELLIGENCE.md`](docs/PHASES-INTELLIGENCE.md)** — the master phase plan (Waves A–E + Phase 27 ERP modules).
5. **[`src/lib/brain/README.md`](src/lib/brain/README.md)** — Brain architecture: tool registry + orchestrator loop + stdio MCP server.
6. **[`docs/SYSTEM-BLUEPRINT.md`](docs/SYSTEM-BLUEPRINT.md)** — the distilled playbook for standing up a new system on these foundations.
7. **[`docs/RE-INFRASTRUCTURE-PLAN.md`](docs/RE-INFRASTRUCTURE-PLAN.md)** — the docs-first rebuild philosophy + RAG re-architecture (shipped).

Deployment and operations: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · [`docs/RUNBOOK.md`](docs/RUNBOOK.md) · [`docs/ISOLATION.md`](docs/ISOLATION.md) (multi-tenancy rules).

## Production

Deploys from `main` to Railway (`railway.toml` preDeploy runs migrations + idempotent seeds). Weekly Brain self-tune fires from `.github/workflows/brain-cron.yml`. Never push to `main` directly — branch, PR, green CI, merge.
