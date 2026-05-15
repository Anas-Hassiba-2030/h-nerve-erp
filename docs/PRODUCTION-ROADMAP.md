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
- ✅ Add `ANTHROPIC_API_KEY` — **DONE** (in gitignored `.env`; Brain now live).
- Rotate `SESSION_PASSWORD` (currently ends `change-me-please`); change the
  `admin123` seed password; rotate the chat-shared API key after the pitch.
- Gate `app/(admin)/layout.tsx` to `role === "ADMIN"`.
- _Tool:_ Plan Mode for the changes; verify live with `/gstack`.
- _Outcome:_ honest, secure, genuinely-intelligent demo.

### Phase B — Real data foundation (1–2 weeks)
- SQLite → Postgres (Neon/Supabase free tier is fine to start).
- Adopt `prisma migrate` instead of `db push`; commit migration history.
- Automated backups; separate `dev` / `staging` / `prod` databases.
- _Outcome:_ multiple users can use it at once without data corruption.

### Phase C — Per-company workspace isolation (~3–5 weeks) — *your idea, see Q3*
- A "current workspace" context (cookie/session).
- Scope every Prisma query to the active company/tenant.
- Clicking a company → enter its branded, data-isolated dashboard.
- _Outcome:_ the "separate ERP per company" experience.

### Phase D — Access control (1–2 weeks)
- Role-based authorization on **every** server action, not just admin.
- Audit log of who changed what.
- Rate-limit + cost-cap the AI endpoints.
- _Outcome:_ safe for real staff with different permission levels.

### Phase E — Reliability & operations (1–2 weeks)
- Automated tests on auth + the 5 core CRUD modules + regression tests.
- Error monitoring (Sentry), structured logging.
- Deployment: Dockerfile or Vercel project + CI.
- _Outcome:_ you can deploy with confidence and see failures.

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
