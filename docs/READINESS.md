# H-Nerve — Production Readiness Assessment

_Assessed 2026-05-15 against the actual codebase (not the roadmap)._

## One-line verdict

**Not ready to *run* a company. Very ready to *win the pitch* and run a supervised pilot.**

H-Nerve today is an exceptional demonstration artifact — ~80 operator pages,
bilingual RTL, theming, gamification, a coherent architecture. But the thing
the product is *sold on* — "the Brain" — is, as it runs right now, canned
text. Treat this as a high-fidelity prototype, not an operational ERP.

---

## What is genuinely real

| Area | State | Evidence |
|---|---|---|
| App breadth | ~80 pages, 274 TS/TSX files, full CRUD on companies/hotels/dairy/farms/finance | `app/(app)/**` |
| Auth | Real — `iron-session` cookies + `bcryptjs` hashing | `lib/auth.ts`, `lib/session.ts` |
| UI / i18n / theming | Real and polished — AR/EN, RTL, multi-theme | `app/globals.css`, `lib/i18n.ts` |
| LLM client | Real — genuine `fetch` to `api.anthropic.com/v1/messages` **when a key is set** | `lib/brain/llm.ts:71` |
| Data model | Real Prisma schema, many models, seeded demo data | `prisma/schema.prisma` |

## What is theater (the gap to close)

1. **The Brain orchestrator is dead code (but bypassed).** `Brain.ask()`
   throws `"Brain.ask not yet wired"`; `makeBrain()` returns a stub Proxy
   (`lib/brain/Brain.ts:104,122`). The *composed* Brain is not connected —
   **however**, the pages don't use it: e.g. the council page calls the
   `convene` server action → agents → `callLlm` directly. So the demo works
   without the orchestrator. The risk is narrative ("our Brain is wired"
   isn't literally true), not functional. Either wire it or retire it.
2. **AI is running in stub mode right now.** `.env` has **no
   `ANTHROPIC_API_KEY`**. With no key, every council debate, narration and
   insight is deterministic canned text with fake latency
   (`lib/brain/llm.ts:51-59`). The "intelligence" you'd demo today is scripted.
3. **Document Intelligence parser is not implemented** — even live mode is a
   TODO (`lib/docintel/parser.ts:6-9`).
4. **Admin console has no access control.** Any logged-in user reaches the
   superadmin console (`app/(admin)/layout.tsx:22`). Real security hole.
5. **SQLite, single file, no migrations, no backups.** `prisma/dev.db`,
   `db push` only, `db:reset` is destructive. Not safe for concurrent
   multi-user company use.
6. **Zero automated tests.** 274 source files, no test runner.
7. **No deployment infrastructure.** No Dockerfile, no CI, no `vercel.json`.
8. **Weak/placeholder secrets.** `SESSION_PASSWORD` literally ends
   `change-me-please`; seed credentials `admin@hourani.jo / admin123` are
   documented publicly.
9. **~100 stub/TODO/mock markers across 23 `lib/` files** — integrations
   runtime, workflows, federation, planner are heuristic/catalog, not wired to
   real third-party systems.

---

## What to CREATE to make it pilot-ready (priority order)

**Tier 0 — before any real demo to leadership (days)**
- Add `ANTHROPIC_API_KEY` to `.env` and confirm live mode end-to-end (watch
  for `isStub: false`). This alone transforms the demo from scripted to real.
- Rotate `SESSION_PASSWORD` to a real 32+ char secret; change the seed admin
  password; remove the public credential from any shared doc.
- Gate `app/(admin)/layout.tsx` to `role === "ADMIN"`.

**Tier 1 — before a supervised pilot with real users (weeks)**
- Wire `Brain.ts` / `makeBrain()` to the real `.live.ts` subsystems, or be
  explicit that pages call subsystems directly and retire the dead orchestrator.
- Migrate SQLite → Postgres (Neon/Supabase/RDS): switch `datasource`, adopt
  `prisma migrate` (not `db push`), set up automated backups.
- Deployment: a Dockerfile or Vercel project, environment-separated
  (`dev`/`staging`/`prod`), secrets in a vault not `.env`.
- A real document parser (Claude Vision) or remove the feature from the pitch.
- Smoke + regression tests on the auth flow and the 5 core CRUD modules.
- Error monitoring (Sentry) + structured logging.

**Tier 2 — before calling it production (months)**
- Real integrations (actual OAuth/webhooks) for the connectors you'll claim.
- Role-based authorization across *all* mutations, not just admin.
- Audit log, data export/GDPR-style controls, rate limiting on AI endpoints.
- Load/concurrency testing; cost controls on the Anthropic spend.
- Pen-test / security review before real financial data enters the system.

---

## What to LEARN (you're a business student — this is the leverage list)

1. **Prototype vs. production** — the single most valuable concept here. Be
   able to say in the pitch: "this is a working prototype; production
   hardening is a costed, scheduled phase." Leadership respects that more than
   a claim that it's done.
2. **Postgres + Prisma migrations** — why SQLite doesn't survive multiple
   concurrent users; what a migration is and why `db push` isn't it.
3. **Secrets & environment management** — `.env`, secret vaults, why
   `change-me-please` in a repo is a fireable mistake in a real company.
4. **Deployment basics** — Vercel/Docker, staging vs. prod, what "ship it"
   actually involves.
5. **LLM cost & reliability** — every Brain call is metered spend; what
   happens at 100 users; prompt caching, timeouts, fallbacks.
6. **AuthZ vs. AuthN** — you have authentication; you largely lack
   authorization (who may do what). ERPs live or die on this.
7. **The honest demo** — run it with the API key ON, and *say* which parts
   are live vs. roadmap. Your credibility is the asset, not the illusion.

---

## How to pitch this honestly (recommended framing)

> "H-Nerve is a working intelligence platform with ~80 live screens across
> all four Hourani verticals. The AI reasoning is real — here it is running
> live. To put it into daily operations we have a defined hardening phase:
> production database, security gating, and integrations — roughly [X weeks],
> costed at [Y]. I'm asking for a supervised pilot in one unit (المها or
> لوران) to prove it on real data."

That ask — a scoped pilot, not "replace the ERP" — is winnable and matches
exactly what the codebase can actually support today.

---

_Cross-ref: Tier 0/1/2 here map to Phase A / B+D+E / F+G in
`docs/PRODUCTION-ROADMAP.md`, which also answers the API-key cost question
and the per-company isolated-ERP feasibility._
