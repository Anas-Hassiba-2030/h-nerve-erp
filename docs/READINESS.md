# H-Nerve — Production Readiness Assessment

> ⚠️ **HISTORICAL SNAPSHOT (2026-05-15).** Several gaps below are now **closed** —
> for the current state see **`docs/AUDIT-2026-06.md`**. Specifically: the AI is
> live (ANTHROPIC + Gemini keys set); the admin console is hard-gated to ADMIN
> (#4 resolved); the DB is **PostgreSQL with migrations** on Railway (#5);
> there are **580+ automated tests + CI** (#6/#7); `vercel.json` was removed
> (Railway). The brain also gained a full RAG layer (#97–#123). Since then:
> the stub `Brain.ts` was **retired** (PR #240, merged 2026-06-11) in favor of a
> wired tool-loop — `src/lib/brain/tools/` (7 typed tools) +
> `src/lib/brain/orchestrator.ts` + a stdio MCP server; the Document-Intelligence
> parser gained a **real Claude Vision path** (`src/lib/docintel/parser.ts`,
> stub fallback + `DOCINTEL_MAX_VISION_CALLS` cap); and `/api/converse` now has
> auth + per-user rate limiting (20 req/60s) + a process-wide `BRAIN_MAX_LLM_CALLS`
> cap. Deeper third-party integration wiring remains the main open item.

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

1. ~~**The Brain orchestrator is dead code (but bypassed).**~~ **RESOLVED
   (PR #240, 2026-06-11).** The stub `lib/brain/Brain.ts` — where `Brain.ask()`
   threw `"not yet wired"` and `makeBrain()` returned a Proxy stub — was
   retired. The brain is now tool-fronted and genuinely wired:
   `src/lib/brain/tools/` (7 typed tools: pullFacts, causalSubgraph, simulate,
   councilDebate, recallMemory, retrieveDocuments, narrate) +
   `src/lib/brain/orchestrator.ts` (LLM tool-loop, LIVE mode) +
   `src/lib/brain/converse.ts` (single-shot in STUB mode) + a stdio MCP server
   (`src/lib/brain/mcp/server.ts`). STUB mode is the zero-key default; setting
   `ANTHROPIC_API_KEY` runs the LIVE tool-loop.
2. **AI is running in stub mode right now.** `.env` has **no
   `ANTHROPIC_API_KEY`**. With no key, every council debate, narration and
   insight is deterministic canned text with fake latency
   (`lib/brain/llm.ts:51-59`). The "intelligence" you'd demo today is scripted.
3. **Document Intelligence parser is not implemented** — even live mode is a
   TODO (`lib/docintel/parser.ts:6-9`). _(Since resolved —
   `src/lib/docintel/parser.ts` now ships a real Claude Vision path
   (`parseWithVision`) with stub fallback + `DOCINTEL_MAX_VISION_CALLS` cap.)_
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
- ~~Wire `Brain.ts` / `makeBrain()` to the real `.live.ts` subsystems, or be
  explicit that pages call subsystems directly and retire the dead orchestrator.~~
  ✅ Done — PR #240 retired `Brain.ts` and shipped the wired tool-loop
  (`src/lib/brain/tools/` + `orchestrator.ts` + MCP server).
- Migrate SQLite → Postgres (Neon/Supabase/RDS): switch `datasource`, adopt
  `prisma migrate` (not `db push`), set up automated backups.
- Deployment: a Dockerfile or Vercel project, environment-separated
  (`dev`/`staging`/`prod`), secrets in a vault not `.env`.
- ~~A real document parser (Claude Vision) or remove the feature from the pitch.~~
  ✅ Done — `parseWithVision` shipped in `src/lib/docintel/parser.ts` (stub fallback + call cap).
- Smoke + regression tests on the auth flow and the 5 core CRUD modules.
- Error monitoring (Sentry) + structured logging.

**Tier 2 — before calling it production (months)**
- Real integrations (actual OAuth/webhooks) for the connectors you'll claim.
- Role-based authorization across *all* mutations, not just admin.
- Audit log, data export/GDPR-style controls, rate limiting on AI endpoints
  _(rate limiting since shipped on `/api/converse`: per-user 20 req/60s via
  `src/lib/import/rateLimit.ts` + process-wide `BRAIN_MAX_LLM_CALLS` cap)_.
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
