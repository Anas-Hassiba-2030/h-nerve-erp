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
3. **`lib/brain/README.md`** + **`lib/brain/tools/`** — the brain architecture. The brain is fronted by a tool registry (`lib/brain/tools/index.ts`), an orchestrator tool-loop (`lib/brain/orchestrator.ts`), and a stdio MCP server (`lib/brain/mcp/server.ts`, launched via `scripts/ops/brain-mcp.ts`). The old `Brain.ts` composition root is retired.

When the user says **"improve the brain"**, that means `lib/brain/` — the tools, the orchestrator, and the subsystem files. When the user says **"apply the design skill to X"**, that means `docs/DESIGN-SKILL.md` § the appropriate vocabulary.

> **REQUIRED READING — `docs/SYSTEM-BLUEPRINT.md`.** When the user asks to
> design, blueprint, architect, or build a **new system** for a company (or any
> new project from scratch), you MUST read `docs/SYSTEM-BLUEPRINT.md` first and
> base the plan and implementation on its principles, stack, structure, security
> baseline, and bootstrap checklist. It is the distilled, battle-tested playbook
> behind this codebase — apply it so the new build starts on ideal foundations.
> (`docs/BLUEPRINT.md` is the narrower companion: the read-mostly Brain
> intelligence-layer pattern.)

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

### `src/` layout (2026-06-12)

All source lives under **`src/`**: `src/app/`, `src/components/`, `src/lib/`,
`src/proxy.ts` (Next 16's renamed middleware convention — route-level RBAC
lives there). Everywhere this document (or any doc) says `app/...`,
`components/...`, or `lib/...`, read it as `src/app/...`, `src/components/...`,
`src/lib/...`. The `@/*` import alias maps to `./src/*` (so `@/lib/db/db`
still works unchanged), with one carve-out: `@/prisma/*` maps to the root
`prisma/` folder (seeds are imported by genesis/seed routes). `prisma/`,
`scripts/`, `docs/`, `public/` stay at the repo root, as do all
framework-mandated config files (`package.json`, `next.config.mjs`,
`tsconfig.json`, `.env*`, `railway.toml`, …) — those cannot move.

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

This is its own architectural pillar. There is no single conductor class anymore — the brain is **tool-fronted**: `lib/brain/tools/` defines 7 typed tools (`pullFacts`, `causalSubgraph`, `simulate`, `councilDebate`, `recallMemory`, `retrieveDocuments`, `narrate`) registered in `tools/index.ts`; `orchestrator.ts` runs the LLM tool-loop over them (LIVE mode); `converse.ts` answers single-shot in STUB mode; `mcp/server.ts` exposes the same tools over stdio MCP (tenant-scoped via `mcp/scope.ts`, launched by `scripts/ops/brain-mcp.ts`). Subsystems live in sibling files:

| File | Phase | Role |
|------|-------|------|
| `tools/` + `orchestrator.ts` | — | Entry point. Tool registry + LLM tool-loop (replaces the retired `Brain.ts`). |
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

**`lib/` is organized one folder per pillar** — `ai/`, `alerts/`, `auth/`, `brain/`,
`brand/`, `db/`, `design/`, `docintel/`, `empire/`, `export/`, `finance/`, `genesis/`,
`i18n/`, `import/`, `integrations/`, `intelligence/`, `mobile/`, `orrery/`, `protocol/`,
`realtime/`, `supply/`, `tenancy/`, `theater/`, `theme/`, `utils/`, `workflows/`,
`workspace/`. There are **no loose files in `lib/` root** (B7/#162). When you add a
helper, it belongs inside the pillar folder it serves — never at the root. Imports use
the `@/lib/<pillar>/<file>` path.

- **Auth**: cookie-session via `iron-session` (`lib/auth/session.ts`), not NextAuth. Passwords hashed with `bcryptjs` (`lib/auth/auth.ts`). Roles `"ADMIN" | "EXECUTIVE" | "MANAGER" | "STAFF"` typed in `SessionUser`, stored as a plain string column. SQLite + Prisma do not support enums; **always use string columns + TS unions** for role/status/sector/etc.
- **DB**: **PostgreSQL in production** (Railway, Phase 23). The schema is split across **`prisma/schema/*.prisma`** (Prisma `prismaSchemaFolder` layout, one file per pillar — `auth`, `finance`, `brain`, `documents`, `protocol`, etc.). The `generator` (with `previewFeatures = ["prismaSchemaFolder"]`, required on Prisma 5.x) and the `datasource` (`provider = "postgresql"`) live in **`prisma/schema/schema.prisma`**. Prisma auto-detects the folder — no `--schema` flag, no `package.json` `prisma.schema` config. Migrations live under `prisma/migrations/` and `prisma migrate deploy` (Railway preDeploy) finds them as the sibling of the schema folder — **do not** put a `schema.prisma` file back at `prisma/` root or Prisma errors on "both a file and a folder". **Local dev can flip** the provider to `sqlite` + `DATABASE_URL="file:./dev.db"` in `prisma/schema/schema.prisma` and use `db:push` (no migration) for speed — flip it back to `postgresql` before committing. `lib/db/db.ts` exports the shared scoped `prisma` client.
- **Multi-tenancy** (`lib/tenancy/tenancy.ts`, `lib/brand/themes.ts`, Phase 11): single-tenant by default. The `Tenant` model + `view-as` cookie let a superadmin preview any tenant's theme without subdomain switching. The `(app)` layout reads the cookie and applies CSS-var overrides at the wrapper.
- **i18n** (`lib/i18n/i18n.ts` + `lib/i18n/i18n.server.ts`): cookie-driven (`h_nerve_locale`). Messages are a hardcoded dictionary — no external runtime. Default is **Arabic with RTL**; English is secondary.
- **Theming** (`lib/theme/theme.ts` + `lib/theme/theme.server.ts` + `lib/brand/themes.ts`): cookie-driven (`h_nerve_theme`). Multiple presets (harmony, midnight, royal, amber, ocean, carbon, rose) plus tenant themes. Heritage is the canonical default.
- **Time Machine** (`lib/utils/timemachine.ts`, Phase 16): cookie-driven `as-of` cursor (`h_nerve_asof`). Pages call `getAsOf()` at SSR time and pass the Date into queries. Deliberately **not** in session — it's a local view, not identity.
- **Soft delete** (`lib/db/softDelete.ts`, `lib/db/cleanupSoftDeletes.ts`): rows go to a Trash module before permanent deletion.
- **Realtime** (`lib/realtime/realtime.ts` + `app/api/realtime`): SSE-based presence + live updates.
- **Toast/flash** (`lib/utils/toast.ts`, `lib/utils/toast.shared.ts`): server-side flash via cookie + `ToastProvider` on the client. Use these instead of inventing a new notification path.
- **Path alias**: `@/*` resolves from the repo root (see `tsconfig.json`).

### Styling

Tailwind with H-Nerve brand classes in `app/globals.css` (`.btn`, `.btn-primary`, `.input`, `.card`, `.kpi`, `.table-wrap`, `.badge-*`, `.metric-up/.metric-down`, `.nerve-bg`, plus admin-shell and theater-shell scoped classes). Brand palette is **deep emerald** primary with **gold/amber** accents. **Reuse these classes rather than inventing utility soups.** Theme variants override CSS variables at the route-group root, not by rewriting components.

## Conventions worth preserving

- **Companies + Hotels are the canonical CRUD pattern** — list, create, edit, delete via server actions, with `Topbar` + KPI cards on the index page. Mirror them when adding new resources.
- **`Topbar` (`components/Topbar.tsx`) is the shared page header** — every authenticated page should render one with title (Arabic), optional subtitle, and an actions slot. Don't ship a page without it.
- **`lib/utils/utils.ts` provides `cn()`, `formatMoney()`, `formatDate()`, `formatNumber()`, `generateNumber()`, `arabicMonth()`** — use these rather than reimplementing.
- **All UI text defaults to Arabic.** English appears as a secondary label only when the data is genuinely English (emails, codes, ISO).
- **String columns + TS unions over DB enums** for any role/status/sector/tier — keeps the schema portable to the sqlite dev provider and migrations simple.
- **Don't introduce new auth providers, ORMs, or state libraries without asking** — the stack is intentionally minimal.
- **Don't bypass the brain's read-mostly boundary.** If a brain subsystem needs to change domain data, it calls a server action; it doesn't write directly.
- **All Prisma queries must go through `prisma` (the scoped client) unless they're explicitly cross-tenant.** `prismaUnscoped` is reserved for the Empire dashboard, the workspace switcher, the system-dump API, the brain engine running from cron, and the operator layout's banner lookups. Every `prismaUnscoped` call site must carry a `// CROSS-TENANT INTENT:` comment. New tenant-keyed models go in `TENANT_SCOPED_MODELS` (`lib/tenancy/workspaceScope.ts`); see `docs/ISOLATION.md` for the full checklist.
- **Pick ONE design vocabulary per surface.** Operator UI = Heritage Modern. Admin = Sleek Operator. Theater = its own editorial register. Never mix.
- **Every server action that calls AI / parallel DB queries MUST wrap those calls in try/catch + `flashToast`.** A thrown action revalidates the page to the same state with zero user feedback — from the user's perspective the button just "doesn't work." The pattern: `try { result = await expensiveOp(); } catch (e) { flashToast({ type: "info", entity: "info", id: "op", label: ... }); revalidatePath(...); return; }`. Apply this to: all LLM calls, all `Promise.all` fan-outs, and any external-service call inside an action.
- **`flashToast` entity must be `SoftEntity | "info"`.** `SoftEntity = "task" | "project" | "insight" | "forecast"`. Values like `"plan"`, `"council"`, `"program"`, `"deleted"`, `"batch"` do NOT exist in the union and will cause TypeScript errors. Use `entity: "info"` for every non-soft-delete toast.
- **Night/cosmic surfaces need their own CSS overrides.** `/brain/*` and `/insights` pages render on a dark emerald backdrop (`#0a1813`). The shared `daylight.css` uses cream/light colors that are invisible on dark backgrounds. Any buttons or text added to these pages must have section-specific overrides (see `app/(app)/brain/brain-section.css` for the pattern) — never rely on `daylight.css` defaults alone.
- **`*Client.tsx` pattern for in-page tab switching.** When a server-rendered page needs client-side view switching (e.g. Tree/List tabs), create a `<PageName>Client.tsx` with `"use client"` + `useState`. Pass the already-rendered server `ReactNode` content for each tab as props — this keeps auth + data fetching on the server and avoids re-fetching. Example: `app/(app)/users/OrgTabsClient.tsx`.
- **`ExportMenu` variant prop.** `<ExportMenu variant="heritage" />` renders the pill-shaped Heritage Modern button. The default `"sleek"` variant uses white/navy styling that looks broken on cream Heritage backgrounds. Always pass `variant="heritage"` on Heritage Modern pages.

## Organization doctrine — how this codebase stays professional

These are standing rules. They are not suggestions; treat every one as an instruction
that survives across sessions. When we learn a lesson the hard way, it gets written
here so it never has to be re-learned.

- **One folder per pillar — everywhere.** `lib/`, `components/`, and `scripts/` are
  organized into domain folders, not flat dumps. `lib/` has zero loose root files (#162);
  `scripts/` is split into `build/ ops/ seed/ test/ verify/`. A new file lives inside the
  pillar it serves. If a pillar folder doesn't exist yet for genuinely new surface area,
  create it — don't drop the file at the root "for now".
- **Lessons become instructions.** Anything we discover that the next session would
  otherwise repeat — a path that moved, a build trap, a deploy gotcha, a naming
  convention — gets added to this file. The cost of writing it down once is far less
  than re-debugging it.
- **Green gate before every merge.** `npm run typecheck` (tsc), `npm test` (vitest), and
  `npm run lint` must all pass; for changes that touch many files, also confirm
  `next build`. Never merge red.
- **PRs only — never push to `main` directly.** Branch, open a PR (draft is fine), let
  CI go green, then merge. `main` is the Railway production trunk; treat it as sacred.
- **Always start from `origin/main`.** Before any reorg/refactor, fetch and fast-forward.
  A stale local checkout silently re-does or conflicts with work already merged (this has
  bitten us — see the lib reorg #162 landing while a local copy still showed flat files).
- **Schema stays `postgresql` in committed code.** Local dev may flip the Prisma provider
  to `sqlite` for speed, but restore `postgresql` before committing. Migrations under
  `prisma/migrations/` are the production source of truth.
- **Refactors are behaviour-preserving.** Moving/renaming/extracting must not change what
  the app does. When you move a file, rewire every importer in the same commit and prove
  it with typecheck. Land big reorgs as their own focused PRs, one concern each.
- **Never commit secrets or environment-specific identifiers** (tokens, API keys, internal
  model IDs) into any tracked file — code, comments, commit messages, or PR text.

## Default credentials (seeded)

- Demo admin: `admin@hourani.jo` / `admin123`
- Owner (always ADMIN, auto-promoted): `anashasiba91@gmail.com` / `SEED_ADMIN_PASSWORD` (else `admin123`)

The deploy bootstrap (`railway.toml` preDeploy) guarantees these on every deploy via `scripts/seed/`: `seed-if-empty.ts` (seed empty DB), `ensure-admins.ts` (admins can always sign in), `ensure-demo-docs.ts` (top up demo documents). See `lib/auth/owner.ts`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
