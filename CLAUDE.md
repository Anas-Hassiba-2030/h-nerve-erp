# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**H-Nerve ERP** — a generic, white-labelable ERP **intelligence platform**. The first deployment is for مجموعة الحوراني (Hourani Group) across hotels, dairy (المها), agriculture (لوران), and education (Tank Incubator). The architecture is industry-agnostic — domain knowledge lives in pluggable industry packs under `lib/brain/agents/`. Other tenants stand up in minutes (see Phase 11).

The differentiator is the **Brain** — a causal-graph + multi-agent + memory + planner intelligence layer that sits beneath every screen. The brain reasons about the business, debates decisions, plans actions, learns from outcomes, and tunes itself weekly.

UI is bilingual (ar/en) with RTL. Default theme is **Heritage Modern** (`docs/DESIGN-SKILL.md` §1.D).

## The three documents that govern this codebase

These files are the source of truth. Reference them by path in any conversation about this project:

1. **`docs/DESIGN-SKILL.md`** — the design language. Heritage Modern is the default. Eight aesthetic vocabularies are documented; pick ONE per surface; never mix.
2. **`docs/PHASES-INTELLIGENCE.md`** — the master plan (Phases 1–27 across five waves: **A** Brain 1–10, **B** Platform 11–15, **C** Theater 16–19, **D** Empire 20, **E** Genesis & Hardening 21–26, plus **Phase 27** ERP modules — backlog). On top of this, a **RAG re-architecture** (RAG-1…RAG-7) is fully shipped — see the Brain section below. Health + open items: `docs/AUDIT-2026-06.md`.
3. **`lib/brain/README.md`** + **`lib/brain/Brain.ts`** — the brain architecture. The single import path the rest of the app reaches for.

When the user says **"improve the brain"**, that means `lib/brain/Brain.ts` and its subsystem files. When the user says **"apply the design skill to X"**, that means `docs/DESIGN-SKILL.md` § the appropriate vocabulary.

## ⏰ Standing reminder — Phase 27 (ERP modules)

Anas is studying ERP and will bring source material (the "13 ERP modules" + functionality) ~early-mid June 2026 to plan a final enrichment wave. **When he mentions ERP study / sources / modules, surface `docs/PHASES-INTELLIGENCE.md` § Phase 27** and plan it with him. Don't start it before the sources arrive.

## Design backlog (Anas's animation priorities)

- **Login redesign** — a heavily-animated, cinematic "living nervous system" login. The full design brief Anas feeds to Claude Design lives in **`docs/prompts/LOGIN-REDESIGN.md`**. The login page (`app/(auth)/login/`) is being redesigned **in Claude Design** — coordinate, don't blindly overwrite it.
- **Phase 28 — The Companion ("the soul")** — a roaming ambient animated light-being that adds personality. See `docs/PHASES-INTELLIGENCE.md` § Phase 28. Lower priority than the login.

## Health & open items

Current engineering health + the prioritized open-item backlog live in
**`docs/AUDIT-2026-06.md`** (lint/types/tests/build all green; in-progress
phases 21/22/24/26; infra recommendations). Read it for "where do we stand /
what's left."

## Re-infrastructure ("rebuild the right way") — read this first

When the user talks about **re-infrastructuring / rebuilding the system the right way**, the RAG/book analysis, the document set engineers need, or generating execution prompts for a rebuild → **`docs/RE-INFRASTRUCTURE-PLAN.md` is the source of truth.** It captures everything agreed: the docs-first / fresh-session rebuild philosophy (don't rebuild from zero — derive specs from the working code, then refactor module-by-module), the prioritized RAG re-architecture roadmap, and the 13-document spec stack with its gap analysis. The re-infra session plan: generate `docs/spec/` (Data Model/ERD + API contract catalog first), then build against it.

## Commands

```bash
npm run dev         # Next dev server on http://localhost:3000
npm run build       # prisma generate + db push + next build
npm run db:push     # sync schema -> local dev DB without a migration (guarded against prod)
npm run db:seed     # run prisma/seed.ts (creates Hourani sample data + admin@hourani.jo / admin123)
npm run db:reset    # nuke + recreate + reseed
npm run db:studio   # Prisma Studio
npm run lint        # next lint
npm test            # vitest run — pure unit suite (lib/**/*.test.ts)
```

Tests: **Vitest** (`vitest.config.ts`, node env). The suite is
pure-unit — `lib/**/*.test.ts`, no DB/network/Next runtime. Run
`npm test` before commits that touch `lib/`.

## Architecture

### Route groups

The App Router uses **four** groups, each with its own `layout.tsx`:

- `app/(auth)/` — public (login, signup, `/logout` route handler). Auth-only chrome.
- `app/(app)/` — every authenticated operator page. The layout calls `getCurrentUser()`, redirects to `/login` on empty session, then renders Sidebar + Topbar + global overlays (ToastProvider, OnboardingTour, QuickAddFAB, Conversational, TimeScrubber/TimeMachineBanner, ViewAsBanner, RealtimePresence, DocumentDropZone). **Adding a new authenticated page = drop a folder under `app/(app)/<thing>/page.tsx`** — auth and chrome are inherited.
- `app/(admin)/` — superadmin console (Phase 11). **Sleek Operator** vocabulary (`docs/DESIGN-SKILL.md` §1.F), cyan-on-near-black, no operator chrome. Houses `/admin/tenants`, `/admin/empire`, `/admin/system`. **Hard-gated to `role === "ADMIN"`** (`app/(admin)/layout.tsx` redirects non-admins to `/dashboard`).
- `app/(theater)/` — fullscreen Decision Theater (Phase 9). No sidebar, no footer — the user steps **out** of the dashboard into a magazine spread. ESC returns them.
- `app/m/` — mobile-first surface (Phase 14, see `lib/mobile/today.ts`).
- `app/page.tsx` — bare router: signed-in → `/orrery` (the Orrery hub), otherwise → `/login`.

### Where mutations live

- **Server Actions are the default** for CRUD: `app/(app)/<resource>/actions.ts`, `"use server"`, exports `createX` / `updateX(id, formData)` / `deleteX(formData)`. Each action calls `requireUser()`, validates with `zod`, writes via `prisma`, then `revalidatePath(...)` and `redirect(...)` if appropriate. Pages stay server components; use `<form action={serverAction}>` for plain CRUD.
- **`app/api/` is reserved for things server actions can't do well**: streaming/SSE (`/api/realtime`, `/api/converse`), file exports (`/api/export/[type]`, `/api/export/html/[type]`), public protocol (`/api/protocol/openapi`), toast undo, pin toggling, document/message endpoints. Don't reach for `app/api/` for ordinary CRUD.

### The Brain (`lib/brain/`)

This is its own architectural pillar. `Brain.ts` is the conductor; subsystems live in sibling files:

| File | Phase | Role |
|------|-------|------|
| `Brain.ts` | — | Single entry point. Routes `BrainQuestion` → `BrainAnswer`. |
| `graph.ts` / `graph.prisma.ts` | 1 | Causal graph; every entity is a node, edges carry weights. |
| `simulator.ts` / `simulator.bfs.ts` | 2 | What-if propagation. |
| `council.ts` / `council.live.ts` | 3 | Multi-agent debate; `agents/Moderator.ts` synthesizes. |
| `narrator.ts` / `narrator.claude.ts` | 4 | Editorial prose, bilingual, 3 registers. |
| `planner.ts` / `planner.live.ts` | 5 | Insight → ordered action plan. |
| `memory.ts` / `memory.live.ts` | 6 | Episodic recall of analogous past situations. |
| `feedback.ts` / `feedback.live.ts` | 7 | User reactions become training signal. |
| `federation.live.ts` | 8 | Cross-tenant anonymized pattern learning. |
| `meta.ts` / `meta.reflector.ts` | 10 | Self-reflection; owns the Brain IQ score. `BrainIQ.ragQuality` carries RAG telemetry. |
| `agents/*.ts` | — | Industry packs: HospitalityExpert, DairyExpert, AgriExpert, FinanceBrain, RiskOfficer, Moderator. **Domain knowledge lives here, not in the core.** |

#### The RAG layer (shipped — `docs/RE-INFRASTRUCTURE-PLAN.md` §2)

Retrieval-Augmented Generation makes the brain answer from the tenant's **own** data. All pure cores are unit-tested; the `.live` files touch the DB.

| File | Role |
|------|------|
| `embeddings.ts` | The embedder seam. `getEmbedder()` → a real provider when a key is set (**Gemini** `gemini-embedding-001` → OpenAI → Voyage, with `GEMINI_API_KEY`/`OPENAI_API_KEY`/`VOYAGE_API_KEY`), else a deterministic local hash embedder. Falls back to local on any API error. |
| `retriever.ts` | Pure `rankByRelevance` — embed query + items, rank by cosine. |
| `documents.retrieve.ts` | DB-backed document retrieval (`Document` + clauses) → `converse.ts` + the council. |
| `graphrag.ts` / `graphrag.live.ts` | Graph RAG: Personalized PageRank (HippoRAG) over the causal graph → relevant multi-hop subgraph. |
| `crag.ts` | Corrective RAG: grade retrieval Correct/Ambiguous/Incorrect; drop weak matches before grounding. |
| `ragEval.ts` / `ragEval.live.ts` | Decomposed RAG eval (context-relevance / faithfulness / answer-relevance) → `BrainIQ.ragQuality`. |
| `ragGuard.ts` | Retrieval security: redact prompt-injection in retrieved text; tenant-scope + anti-dominance. |
| `serialize.ts` | Renders prompt context as a Python literal (read more accurately than JSON). |
| `converse.ts` | The conversational brain behind `/api/converse` (the "Talk to the Brain" overlay). |

**Note:** retrieval is fully semantic only when an embedding key is set; otherwise it uses the local fallback (works, but rougher). The causal graph must be populated (`scripts/seed/seed-brain-local.ts`) for Graph RAG to have nodes.

**Boundary rule:** the Brain is **read-mostly**. It proposes; it does not mutate domain data directly. All mutations go through the existing server actions in `app/(app)/<resource>/actions.ts`. This keeps the brain auditable, replayable, and safe to self-tune.

UI surfaces for the brain (`app/(app)/brain/*`, `app/(theater)/theater/*`) lean harder into editorial typography — see `lib/brain/README.md`.

### Cross-cutting infrastructure (`lib/`)

- **Auth**: cookie-session via `iron-session` (`lib/session.ts`), not NextAuth. Passwords hashed with `bcryptjs` (`lib/auth.ts`). Roles `"ADMIN" | "EXECUTIVE" | "MANAGER" | "STAFF"` typed in `SessionUser`, stored as a plain string column. SQLite + Prisma do not support enums; **always use string columns + TS unions** for role/status/sector/etc.
- **DB**: **PostgreSQL in production** (Railway, Phase 23) — `prisma/schema.prisma` has `provider = "postgresql"` and migrations live under `prisma/migrations/` (`prisma migrate deploy` runs on every Railway deploy). **Local dev can flip** the provider to `sqlite` + `DATABASE_URL="file:./dev.db"` and use `db:push` (no migration) for speed — flip it back to `postgresql` before committing. Models are in `prisma/schema.prisma`; `lib/db.ts` exports the shared scoped `prisma` client.
- **Multi-tenancy** (`lib/tenancy.ts`, `lib/brand/themes.ts`, Phase 11): single-tenant by default. The `Tenant` model + `view-as` cookie let a superadmin preview any tenant's theme without subdomain switching. The `(app)` layout reads the cookie and applies CSS-var overrides at the wrapper.
- **i18n** (`lib/i18n.ts` + `lib/i18n.server.ts`): cookie-driven (`h_nerve_locale`). Messages are a hardcoded dictionary — no external runtime. Default is **Arabic with RTL**; English is secondary.
- **Theming** (`lib/theme.ts` + `lib/theme.server.ts` + `lib/brand/themes.ts`): cookie-driven (`h_nerve_theme`). Multiple presets (harmony, midnight, royal, amber, ocean, carbon, rose) plus tenant themes. Heritage is the canonical default.
- **Time Machine** (`lib/timemachine.ts`, Phase 16): cookie-driven `as-of` cursor (`h_nerve_asof`). Pages call `getAsOf()` at SSR time and pass the Date into queries. Deliberately **not** in session — it's a local view, not identity.
- **Soft delete** (`lib/softDelete.ts`, `lib/cleanupSoftDeletes.ts`): rows go to a Trash module before permanent deletion.
- **Realtime** (`lib/realtime.ts` + `app/api/realtime`): SSE-based presence + live updates.
- **Toast/flash** (`lib/toast.ts`, `lib/toast.shared.ts`, `lib/toast.client.ts`): server-side flash via cookie + `ToastProvider` on the client. Use these instead of inventing a new notification path.
- **Path alias**: `@/*` resolves from the repo root (see `tsconfig.json`).

### Styling

Tailwind with H-Nerve brand classes in `app/globals.css` (`.btn`, `.btn-primary`, `.input`, `.card`, `.kpi`, `.table-wrap`, `.badge-*`, `.metric-up/.metric-down`, `.nerve-bg`, plus admin-shell and theater-shell scoped classes). Brand palette is **deep emerald** primary with **gold/amber** accents. **Reuse these classes rather than inventing utility soups.** Theme variants override CSS variables at the route-group root, not by rewriting components.

## Conventions worth preserving

- **Companies + Hotels are the canonical CRUD pattern** — list, create, edit, delete via server actions, with `Topbar` + KPI cards on the index page. Mirror them when adding new resources.
- **`Topbar` (`components/Topbar.tsx`) is the shared page header** — every authenticated page should render one with title (Arabic), optional subtitle, and an actions slot. Don't ship a page without it.
- **`lib/utils.ts` provides `cn()`, `formatMoney()`, `formatDate()`, `formatNumber()`, `generateNumber()`, `arabicMonth()`** — use these rather than reimplementing.
- **All UI text defaults to Arabic.** English appears as a secondary label only when the data is genuinely English (emails, codes, ISO).
- **String columns + TS unions over DB enums** for any role/status/sector/tier — keeps the schema portable to the sqlite dev provider and migrations simple.
- **Don't introduce new auth providers, ORMs, or state libraries without asking** — the stack is intentionally minimal.
- **Don't bypass the brain's read-mostly boundary.** If a brain subsystem needs to change domain data, it calls a server action; it doesn't write directly.
- **All Prisma queries must go through `prisma` (the scoped client) unless they're explicitly cross-tenant.** `prismaUnscoped` is reserved for the Empire dashboard, the workspace switcher, the system-dump API, the brain engine running from cron, and the operator layout's banner lookups. Every `prismaUnscoped` call site must carry a `// CROSS-TENANT INTENT:` comment. New tenant-keyed models go in `TENANT_SCOPED_MODELS` (`lib/workspaceScope.ts`); see `docs/ISOLATION.md` for the full checklist.
- **Pick ONE design vocabulary per surface.** Operator UI = Heritage Modern. Admin = Sleek Operator. Theater = its own editorial register. Never mix.

## Default credentials (seeded)

- Demo admin: `admin@hourani.jo` / `admin123`
- Owner (always ADMIN, auto-promoted): `anashasiba91@gmail.com` / `SEED_ADMIN_PASSWORD` (else `admin123`)

The deploy bootstrap (`railway.toml` preDeploy) guarantees these on every deploy via `scripts/seed/`: `seed-if-empty.ts` (seed empty DB), `ensure-admins.ts` (admins can always sign in), `ensure-demo-docs.ts` (top up demo documents). See `lib/owner.ts`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
