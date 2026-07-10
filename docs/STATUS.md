# H-Nerve — STATUS (living document)

owner: Anas Hasiba
last-updated: 2026-07-10

> **This is the current truth.** It supersedes status claims scattered across
> older docs (`docs/AUDIT-2026-06.md` is now a historical snapshot). Update
> this file when facts change; don't fork new status docs.

## 1. Health gate — verified 2026-07-10 ✅

| Gate | Result |
|------|--------|
| `tsc --noEmit` | ✅ clean |
| `npm test` (Vitest) | ✅ **778/778** passing |
| `npm run lint` | ✅ 0 errors, 74 warnings (known react-compiler advisory baseline; refactor deferred) |
| Production | ✅ deploys from `main` on Railway |

## 2. In flight

| Track | State |
|-------|-------|
| Batch 1 — legibility | ✅ **Merged.** PR #281 (root hygiene: front-door README, strays relocated, stale worktree delinted) + PR #283 (this doc spine + Brain truth-sync + SYSTEM-MAP refresh). |
| Batch 2 — VAOC | ✅ **Merged.** PR #284: the agent company — `orchestrator` + 6 department heads, 24 workers tagged by `department:`, operating manual at `docs/VAOC.md`. |
| Batch 3 — docs consolidation | ✅ **Merged.** PR #285: 12 zero-code-reference docs → `docs/{ops,brain,phases}/`, inbound links fixed. **The IA split (System group + orphan routes) is held for owner sign-off** — it needs a new user-menu surface and touches the orbit. |
| Batch 4 — hardening | ✅ **Merged.** PR #286 (converse: zod schema + per-tenant daily LLM budget, degrades to stub) + PR #287 (dashboard five waves → one `Promise.all`; PgBouncer runbook + ready-to-uncomment `directUrl`). Remaining: owner provisions PgBouncer. |
| IA split | ✅ **Approved + building** (owner sign-off 2026-07-10): B1 UserMenu + System 10→6 pills + The Core pill (this PR); B2 hub page + B3 /help dev links (sibling PR `feat/core-hub`). |
| Phase 27 module wave | CRM shipped as **draft PR #280** (Lead/Opportunity + `/crm` Kanban + SalesPipelineExpert). HR parked as WIP on `feat/phase27-hr` (`prisma/schema/hr.prisma` + `workspaceScope` registration). |
| Master-brief campaign | **Batches 1–4 ✅ all merged** (#281, #283, #284, #285, #286, #287). Open: IA sign-off (#288) + the owner-action ledger (§5). |

## 3. Open items / backlog

Folded forward from `docs/AUDIT-2026-06.md`, updated with facts verified 2026-07-09.

### Infrastructure & hardening
- **Brain weekly cron** — the workflow **exists** (`.github/workflows/brain-cron.yml`, Mon 06:00 UTC), but the repo secrets `APP_URL` + `CRON_SECRET` need owner verification before it can be considered live. On-demand "Run analysis" works regardless.
- **`/api/converse` hardening** — ✅ done (Batch 4): auth + per-user rate limit (20/60s) + zod request schema + **per-tenant daily LLM budget** (`BRAIN_TENANT_DAILY_LLM_CALLS`, default 300/day; breach degrades to stub, no error) + process-wide `BRAIN_MAX_LLM_CALLS` cap.
- **LLM server-action guards** — ✅ done (Phase 4): every AI-triggering server action now carries the converse guard stack via `src/lib/brain/actionGuard.ts` — council convene (4/min), narrate tooltip (20/min, standby text on breach), document upload (10/min; budget charged only when Vision runs), plan generation (6/min across plans+insights buttons), AI heuristics engine (2/min, throttle-only — LLM-free). Buttons **block with a bilingual toast** on breach (never a silent stub write).
- **DB connection pooling** — repo side ✅ prepped (Batch 4): the dashboard's ~22 reads collapsed from five sequential await-waves into ONE `Promise.all`; `docs/DEPLOYMENT.md § Connection pooling` documents the PgBouncer sidecar (env-only switch + one `directUrl` uncomment); `schema.prisma` carries the ready-to-uncomment line. **Remaining: owner provisions PgBouncer on Railway.** Keep `numReplicas = 1` until the in-memory realtime store moves to Redis. (The old "stray pool in seed route" claim was stale — it already uses the shared client.) Response-level dashboard caching deliberately skipped: the payload is user-specific (`me`, `myTasksDue`, `myPins`), so a per-user cache would fragment and barely hit.
- **Strengthen CI** — ✅ done (Phase 4): `ci.yml` gates on typecheck + **lint** + tests + `next build` (throwaway `DATABASE_URL`) with `npm ci`, plus a **gitleaks full-history secret-scan job** (`.gitleaks.toml` allowlists placeholder shapes only; history pre-swept clean, 524 commits). npm audit: **0 high** after PR-D (hono 4.12.28 + vite 8.1.4 override); 2 moderates deferred — postcss via next's own range, only a breaking downgrade "fixes" it.
- **Phase 24 (Railway maximization)** — custom domain, backups, monitoring — still open.

### Organization / quality
- **`docs/` root** — ✅ consolidated: 12 zero-code-reference docs moved into `docs/{ops,brain,phases}/`. Docs referenced by exact path from code, `CLAUDE.md`, or an agent brief deliberately stay at `docs/` root — moving those silently breaks a comment, a script, or a brief.
- **IA split (orrery System group + orphan routes)** — ✅ approved (2026-07-10) and shipping: B1 `UserMenu` in `PageHeader` (Search/Pinned/Trash/Settings/Help/Profile/Sign-out), System group = 6 pills incl. **النواة / The Core** (`/admin`), hub + routeMap hand-synced + `public/orrery` rebuilt via `build-orrery.mjs` — bloom untouched. B2 Core hub page + B3 /help dev links in the sibling PR. |
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
