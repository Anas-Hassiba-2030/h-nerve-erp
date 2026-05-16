# H-Nerve — Path to a Fully Working ERP

_Companion to `docs/READINESS.md`. Phase plan from today's prototype to a
real, multi-company ERP. Written 2026-05-15._

---

## Question 1 — Is the Anthropic API key important? Does my Claude subscription cover it?

**Short answer: your Claude.ai subscription does NOT cover it — but it's
cheap, and it's the single highest-leverage spend in the whole project.**

- A Claude Pro/Max subscription pays for the Claude *app* (web/desktop/Claude
  Code). It does **not** include Anthropic *API* usage. They are billed
  separately. The app calls `https://api.anthropic.com` (`lib/brain/llm.ts:71`),
  which needs its own account at console.anthropic.com with prepaid credit.
- **Cost reality:** demo/pilot scale is *pennies to a few dollars*, not
  hundreds. A council debate or a narration is a few thousand tokens. A full
  pitch demo might cost under $1. A light month-long pilot in one unit:
  roughly single-digit to low-tens of dollars. (Check current per-token
  pricing on the console; the order of magnitude is what matters.)
- **You are not forced to pay.** The app is built to degrade gracefully: with
  no key it runs in stub mode — fully functional UI, but the "intelligence"
  is canned text (`lib/brain/llm.ts:51`).

**Recommendation:** put ~$5–$20 of API credit on a console account *for the
pitch only*. That converts the entire differentiator from scripted to genuinely
intelligent for the price of a coffee. No subscription change, no monthly
commitment. If budget is truly zero: demo in stub mode but *say so* — never
claim canned text is live AI in front of leadership.

---

## Question 2 — Phases to a fully working ERP

Each phase is shippable and independently valuable. Effort is rough and
assumes you're driving it with Claude Code.

### Phase 0 — How we work (the Claude tools used in EVERY phase)
Not a build phase — the toolkit that runs through all of them:
- **Plan Mode** — Claude shows a plan; Anas approves before any code changes.
- **Auto type-check hook** — after every task, `tsc` runs; warns if the
  pitch build would break. (Live in `.claude/settings.json`.)
- **Git commits often** — the undo net; `/rewind` restores any save point.
- **23 subagents** — specialist per module; run independent ones in parallel.
- **`/gstack`** — Claude opens the real app, clicks every screen, screenshots
  it (used heavily in Phase E and for pitch rehearsal).
- **`/security-review`** — run before Phase D sign-off and before the pilot.
- **`/ultrareview`** — deep multi-agent review before the pitch (billed).

### Phase A — Make it real & safe to show (days)
**✅ PHASE A COMPLETE** (commit `ea0324a`, 2026-05-16):
- ✅ `ANTHROPIC_API_KEY` in gitignored `.env` (Brain runs live).
- ✅ Strong random `SESSION_PASSWORD`; seed password env-configurable
  (`SEED_ADMIN_PASSWORD`); chat-shared key still to rotate post-pitch.
- ✅ `app/(admin)/layout.tsx` hard-gated to `role === "ADMIN"`.
- _Outcome reached:_ honest, secure, genuinely-intelligent demo.

**Pitch-credibility fixes (Terminal-2 walkthrough), 2026-05-16:**
✅ #1 modal wall (env flag) · ✅ #2 Arena −100% (deterministic seed,
DB-verified +76%) · ✅ #3 Council Arabic bidi garble · ⏳ #4 personal
branding (awaiting Anas) · 🟡 #5 broader Arabic/English text.

### Phase B — Real data foundation — 🟡 LIVE ON POSTGRES
- ✅ SQLite → **Neon Postgres** (`schema.prisma` provider=postgresql,
  `DATABASE_URL` → Neon in gitignored `.env`). Schema pushed + fully
  seeded + live-verified (5 companies, Arena +76%).
- Remaining: switch `db push` → `prisma migrate` (versioned history);
  automated backups; separate dev/staging/prod; rotate the chat-shared
  Neon credential. SQLite-revert path documented in `schema.prisma`/`.env`.
- _Outcome (reached):_ runs on production-grade cloud Postgres.

### Phase C — Per-company workspace isolation — ✅ DONE (merged to `main`)
- ✅ Cookie workspace context (`lib/workspace.ts`); scoped `prisma` vs
  `prismaUnscoped` (`lib/db.ts`, `$use`, 7 company-owned models).
- ✅ Enter/exit + WorkspaceBanner; ✅ proven by 10 unit tests (no server).
- ✅ No-cookie invariant ⇒ pitch demo byte-identical to pre-Phase-C.
- Follow-ups: write-by-id guard; route Empire/group views to unscoped.

### Phase D — Access control — 🟡 CORE DONE
- ✅ RBAC backstop on **all 28 destructive actions**: `deleteCompany`
  = ADMIN; the other 27 delete/purge actions = MANAGER+ (STAFF can no
  longer delete shared records). `requireRole` from `lib/authz`.
- ✅ Audit log already exists (`logActivity` / `ActivityLog`).
- Remaining: role checks on sensitive create/update, AI endpoint
  rate-limit + cost-cap.
- _Outcome (partial):_ safe for real staff at different permission levels.

### Phase E — Reliability & operations — 🟡 IN PROGRESS
- ✅ Vitest + **39-test regression net** (workspace scoping, authz,
  utils/formatters, anomaly engine) + ✅ CI gate (`.github/workflows/ci.yml`:
  tsc + tests on push/PR).
- Remaining: error monitoring (Sentry), structured logging, Dockerfile/
  deploy, broaden tests to the 5 core CRUD modules.
- _Outcome (partial):_ AI-introduced regressions now caught automatically.

### Phase F — Replace the stubs (weeks → months, demand-driven)
- Real document parser (Claude Vision) — currently a TODO
  (`lib/docintel/parser.ts:6`).
- Real third-party integrations (actual OAuth/webhooks) for the connectors
  you actually need — today they're catalog UI.
- Wire or formally retire the dead `Brain.ts` orchestrator.
- _Outcome:_ the advertised features are all genuinely backed.

### Phase G — Production hardening (parallel with pilot)
- Load/concurrency testing; Anthropic spend monitoring & caps.
- Security review / pen-test before real financial data.
- Data export & retention controls.
- _Outcome:_ defensible as a real production ERP.

**Realistic timeline:** Phase A this week. A–E is a focused 6–10 week build to
a genuine supervised-pilot-ready ERP. F–G run alongside the pilot.

---

## Question 3 — "Click a company → an isolated, separate ERP system." Is it POSSIBLE?

**Yes — very possible, and it's the most impressive feature you could add for
the pitch. But understand exactly where the code stands:**

### What exists today
- A `Tenant` model + theme presets + a "view-as-tenant" cookie
  (`lib/tenancy.ts`, `prisma/schema.prisma:1053`). Provisioning steps,
  per-tenant theme/packs are scaffolded (Phase 11).
- Per-company branding helper already imported on the company page
  (`lib/companyBrand.ts`).

### The critical gap (be honest with yourself about this)
- **`Company` and `Tenant` are unrelated models.** `Company`
  (`schema.prisma:51`) has **no `tenantId`**. No domain model
  (Hotel/Farm/DairyBatch/Transaction) is tenant-scoped.
- The view-as cookie today only swaps the **theme** — it does **not** isolate
  data. Every company currently sees the same shared dataset.

### Two ways to build what you want

**Option 1 — Logical isolation (recommended; looks identical to the user).**
Shared database, every query filtered by the active workspace.
- Add a "current workspace" = selected `companyId` (or a new `tenantId` on
  `Company`) stored in a cookie/session.
- A single scoping helper every query passes through.
- Clicking a company sets the workspace and redirects to a dashboard that
  shows *only that company's* hotels/dairy/farms/finance, in *its* branding.
- Effort: there are **~628 Prisma call sites** across `app/` + `lib/`. Do
  **not** hand-edit them. The right approach is a Prisma client extension /
  middleware that auto-injects the workspace filter, plus manually fixing the
  genuinely cross-company queries (group P&L, the empire dashboard, brain
  federation). That makes it ~3–5 focused weeks, not a 628-file slog — but
  it's the real number, not the optimistic one. **Still the pitch-winning
  version and matches Phase C above.**

**Option 2 — Physical isolation (true separate ERP).**
A separate database/schema per company; per-tenant Prisma client routed by
subdomain.
- Effort: high — provisioning, connection routing, migrations per tenant.
- Only needed if companies legally cannot share infrastructure. For the
  pitch and pilot, **Option 1 is indistinguishable to the viewer** and a
  fraction of the work.

### Recommendation
Build **Option 1** as Phase C. Demo it as: from the companies grid you click
"المها" and the whole ERP re-skins to المها's brand and shows only المها's
operations — "every Hourani unit gets its own ERP, one platform." That single
interaction will land harder in the boardroom than any other feature, and it's
weeks of focused work, not a rewrite.

---

# Phase G — Post-pitch refinement (2026-05-16, in progress)

Driven by Anas's feedback after the first working build. Tracked here so
nothing is dropped.

### G1 — Real per-company ERP (Command Center) — ✅ DONE (`66c3d51`)
`/workspace` Command Center: branded hero + financial command (trend +
sparklines) + sector ops (hospitality/dairy/agri/education/holding) +
future-projects pipeline + unit team + drill-downs. enterWorkspace lands
here. Browser-verified live (Arena: all sections render, no console
errors, screenshot `docs/smoke-2026-05-16/06-command-center.png`).
Original spec below.
Feedback: entering a company just scoped the *group* dashboard; it felt
generic, not "a fully detailed المها ERP that analyzes everything."
- New dedicated **Company Command Center** shown on entering a workspace:
  sector-aware (Arena→hospitality, Maha→dairy, Loran→agri, AAU→education),
  deep financials (P&L, margin, revenue trend), operational modules for
  that sector, team, alerts, AI insights, future projects, supply links.
- `enterWorkspace` redirects to the Command Center, not `/dashboard`.

### G2 — Performance — ✅ DONE (`8c15dac`)
Realtime poll 280ms→25s/60s, TTL→60s; `docs/PERFORMANCE.md` (prod-build
+ optional local-SQLite fix order). Original below.
Feedback: system feels heavy/laggy. Likely causes: Next **dev mode** +
**Neon remote latency** (vs instant local SQLite) + realtime SSE polling.
- Production build path documented; realtime poll interval tuned; query
  waterfalls reduced; fast local-SQLite option kept one toggle away.

### G3 — Phases audit — ✅ DONE
See the "Phases audit A→G" table at the bottom of this file.

### G4 — Operating Protocol (user manual) — ✅ DONE (`c5366d5`)
`docs/OPERATING-PROTOCOL.md` shipped. Original below.
Feedback: "I'm lost — rebuild-the-brain, errors, how to run it."
- `docs/OPERATING-PROTOCOL.md`: how to run (dev vs build), login, every
  major area, what "rebuild the brain" does + cost, common errors + fixes,
  SQLite↔Postgres toggle, pitch-day checklist.

---

# Phases audit A→G (G3) — 2026-05-16, single source of truth

| Phase | What | Status |
|---|---|---|
| A | Security (admin gate, secrets, API key) | ✅ done |
| B | SQLite → Neon Postgres (seeded, verified) | ✅ done (migrations/backups = future) |
| C | Per-company workspace isolation (data scoping) | ✅ done, merged, 10 tests |
| D | RBAC on all 28 destructive actions | ✅ core done (create/update + AI rate-limit = future) |
| E | Regression net (39 tests) + CI gate | 🟡 net+CI live; CRUD-module tests = future |
| F | Replace stubs (real doc parser, real integrations, wire/retire Brain.ts) | ⏳ not started (post-pitch) |
| G1 | Real per-company ERP Command Center | ✅ done, browser-verified |
| G2 | Performance | ✅ done |
| G3 | This audit | ✅ done |
| G4 | Operating Protocol manual | ✅ done |
| Pitch fixes | #1 modals · #2 Arena · #3 garble · #4 branding | ✅ all done + smoke-verified |

**Nothing dropped.** Open items are explicitly future-tagged: Phase F
(stubs→real), Phase B migrations/backups, Phase D create/update + AI
cost-caps, Phase E broader CRUD tests. All tracked above.
