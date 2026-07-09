# H-Nerve — STATUS (living document)

owner: Anas Hasiba
last-updated: 2026-07-09

> **This is the current truth.** It supersedes status claims scattered across
> older docs (`docs/AUDIT-2026-06.md` is now a historical snapshot). Update
> this file when facts change; don't fork new status docs.

## 1. Health gate — verified 2026-07-09 ✅

| Gate | Result |
|------|--------|
| `tsc --noEmit` | ✅ clean |
| `npm test` (Vitest) | ✅ **772/772** passing |
| `npm run lint` | ✅ 0 errors, 74 warnings (known react-compiler advisory baseline; refactor deferred) |
| Production | ✅ deploys from `main` on Railway |

## 2. In flight

| Track | State |
|-------|-------|
| PR #281 — root hygiene | Open |
| Docs spine (this PR) | `docs/STATUS.md` + audit banner + spine sync |
| Phase 27 module wave | CRM shipped as **draft PR #280** (Lead/Opportunity + `/crm` Kanban + SalesPipelineExpert). HR parked as WIP on `feat/phase27-hr` (`prisma/schema/hr.prisma` + `workspaceScope` registration). |
| Master-brief campaign | Batch 1 legibility → Batch 2 VAOC agent company → Batch 3 docs consolidation + IA → Batch 4 hardening (converse zod + per-tenant LLM budget; DB pooling + dashboard cache). |

## 3. Open items / backlog

Folded forward from `docs/AUDIT-2026-06.md`, updated with facts verified 2026-07-09.

### Infrastructure & hardening
- **Brain weekly cron** — the workflow **exists** (`.github/workflows/brain-cron.yml`, Mon 06:00 UTC), but the repo secrets `APP_URL` + `CRON_SECRET` need owner verification before it can be considered live. On-demand "Run analysis" works regardless.
- **`/api/converse` hardening** — **has** auth + per-user rate limit (20/60s) + process-wide `BRAIN_MAX_LLM_CALLS` cap. Still missing: zod request schema + per-tenant LLM budget → **Batch 4**.
- **DB connection pooling** — Prisma is a **direct** connection, no pooling; the dashboard is `force-dynamic` with ~22 queries/load. 10–15 concurrent users safe today; 100–200 needs PgBouncer/Accelerate + dashboard caching → **Batch 4**. Keep `numReplicas = 1` until the in-memory realtime store moves to Redis. One stray pool in `app/api/seed/route.ts`.
- **Strengthen CI** — `ci.yml` runs typecheck + tests; still missing a lint step and a `next build` step (needs a Postgres service container). Workflow edits need a token with `workflow` scope — owner one-liner.
- **Phase 24 (Railway maximization)** — custom domain, backups, monitoring — still open.

### Organization / quality
- **`docs/` root** — ~24 loose `.md` files; consolidation is **Batch 3** of the campaign (keep the 3 governing docs at their exact `CLAUDE.md`-referenced paths).
- **Component-test floor** — API smoke tests exist (`lib/utils/api-routes.smoke.test.ts`); still zero `app/`/`components/` component-level tests.
- **Admin back-office hub** — the 13 ERP back-office routes under `app/(app)/admin/*` render fine but have no single Orrery hub ("The Core" — Phase 27b).

### Resolved since the audit (no action)
- **docintel parser** — has a full Claude Vision path; only its header comment was stale (audit-era "stub" claims are wrong).
- Phases 21, 22, 26, 28 (Companion mote) — shipped per the audit's own updates.

## 4. Deferred (with reasons)

| Item | Why deferred |
|------|--------------|
| pgvector migration + re-embed on embedding-provider switch | Corpus still small; in-process cosine is fine at current scale |
| react-compiler 82-warning refactor | Advisory only — the 74-warning lint baseline is known and non-blocking |
| Phase 28 Companion + login redesign | Separate design tracks (login redesign runs in Claude Design) |
| B6 CSS-split | Breaks `next build` without `postcss-import` — needs its own focused session |

## 5. Owner-action ledger

- [ ] **Rotate exposed secrets** per `docs/RUNBOOK.md` §1 — Anthropic, Gemini, DB URL, session password.
- [ ] **Verify GitHub repo secrets** `APP_URL` + `CRON_SECRET` so the brain weekly cron actually fires.
- [ ] **Provision PgBouncer on Railway** when the pooling PR (Batch 4) lands.
