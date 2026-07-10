# H-Nerve ERP — System Map & Navigation Protocol
> **Lost? Start here.** This is the single source of truth for *where everything
> lives*. Find anything fast, then jump to the detailed section below.
> Updated: 2026-06-12 (post Next 16 + React 19 upgrade #245, `src/` consolidation #248, proxy rename #249, deploy fixes #251/#253)

---

## 🧭 30-SECOND ORIENTATION — where is everything?

Everything that isn't a mandated config file lives in a **folder**. The whole
tree is just **8 places**:

| If you want… | Go to | Notes |
|--------------|-------|-------|
| **A page / screen** | `src/app/<route>/page.tsx` | Route groups: `(app)` operator UI · `(admin)` superadmin · `(auth)` login · `(theater)` fullscreen · `m/` mobile |
| **To save/change data** | `src/app/<route>/actions.ts` | Server Actions = the default write path (not `api/`) |
| **A special endpoint** (stream, export, webhook) | `src/app/api/<thing>/route.ts` | Only when a server action can't do it |
| **Shared logic / a service** | `src/lib/<pillar>/` | One folder per pillar — `auth`, `brain`, `db`, `finance`, `i18n`, `tenancy`, … (full list below) |
| **A UI component** | `src/components/<group>/` | Grouped by domain — `layout`, `ui`, `forms`, `charts`, `brain`, … |
| **The AI brain** | `src/lib/brain/` | Tools + orchestrator + MCP. Deep-dive: `src/lib/brain/README.md` |
| **Database schema / seeds** | `prisma/` | Schema folder + migrations + seed scripts |
| **Ops / seed / verify scripts** | `scripts/{ops,seed,verify,build,test}/` | Never a flat dump |
| **Docs** | `docs/` | This map · `SYSTEM-BLUEPRINT.md` (build-a-system) · `OPERATING-PROTOCOL.md` (how to run) · `DESIGN-SKILL.md` (design) |
| **Auth/RBAC gate** | `src/middleware.ts` | Runs on every request (kept on the legacy middleware name — Next 16's proxy.ts forces the Node runtime, which Cloudflare can't run) |
| **Config** (don't move) | repo root | `package.json`, `next.config.mjs`, `tsconfig.json`, `.env*`, `railway.toml` — framework-mandated, immovable |

**Import rule:** `@/...` always means `src/...` (e.g. `@/lib/db/db` →
`src/lib/db/db.ts`). The one exception: `@/prisma/...` → the root `prisma/` folder.

**The golden path for a new feature:** add `src/app/<thing>/page.tsx` (auth +
chrome inherited) → add `src/app/<thing>/actions.ts` for writes → put shared
logic in `src/lib/<pillar>/`. Mirror Companies/Hotels — the canonical CRUD
pattern.

---

## ROOT FILES (config only — never edit casually)

| File | Purpose |
|------|---------|
| `CLAUDE.md` | **Claude Code instructions** — rules, architecture, conventions |
| `package.json` | Dependencies + npm scripts |
| `next.config.mjs` | Next.js config (headers, redirects) |
| `tailwind.config.ts` | Tailwind tokens |
| `postcss.config.mjs` | PostCSS (postcss-import enabled) |
| `src/middleware.ts` | Route-level RBAC (edge middleware — see file header for why not proxy.ts) + login rate limiting |
| `railway.toml` | Railway deploy config (preDeploy seed commands) |
| `tsconfig.json` | TypeScript paths (`@/*` → `./src/*`; `@/prisma/*` → root `prisma/`) |
| `vitest.config.ts` | Test runner config (node env, src/lib/**/*.test.ts) |
| `eslint.config.mjs` | Lint rules (ESLint 9 flat config; `next lint` removed in Next 16) |
| `package.json` | Deps + scripts + **`engines.node` (>=20.9, required for the Railway build)** |
| `.env` | **LOCAL secrets** — never commit |
| `.env.example` | Env var reference (safe to commit) |
| `.env.railway.template` | Railway env var template |
| `.gitignore` | Git exclusions |

**Junk at root (ignore / safe to delete — all gitignored):**
- `h-nerve-erp/` — stale cloned copy of the repo
- `.vercel/` — leftover from Vercel era (Railway now)
- `.obsidian/` — Obsidian notes app config (personal)
- `.gstack/` / `.playwright-mcp/` — local tooling state

(n8n workflow exports live in `docs/integrations/n8n/` — moved from the
old root `workflows/` dir in the 2026-07 root-hygiene pass.)

---

## APP/ — ROUTES (Next.js App Router)

### Entry point
| Path | What it does |
|------|-------------|
| `src/app/page.tsx` | Root redirect: signed-in → `/orrery`, else → `/login` |
| `src/app/orrery/page.tsx` | Orrery hub (the animated home screen iframe) |

### Route groups

#### `src/app/(auth)/` — Public pages (no sidebar)
| Route | File |
|-------|------|
| `/login` | `login/page.tsx` + `LoginCosmos.tsx` |
| `/logout` | `logout/route.ts` (destroys session, 303 → /login) |
| `/signup` | `signup/page.tsx` |

#### `src/app/(app)/` — All authenticated operator pages
**Layout:** `layout.tsx` → auth guard + LivingAtmosphere + ConstellationRail + FabRail + Companion

**Sectors:**
| Route | Folder |
|-------|--------|
| `/companies` + `/companies/[id]` | `companies/` |
| `/hotels` + `/hotels/[id]` + `/hotels/bookings/new` | `hotels/` |
| `/dairy` + `/dairy/[id]` | `dairy/` |
| `/farms` + `/farms/crops/` | `farms/` |
| `/education` + `/education/[id]` | `education/` |
| `/supply-chain` | `supply-chain/` |

**Intelligence (Brain):**
| Route | Folder |
|-------|--------|
| `/brain` | `brain/page.tsx` |
| `/brain/graph` | `brain/graph/` |
| `/brain/scenarios` | `brain/scenarios/` (What-If Lab) |
| `/brain/council` + `/brain/council/[id]` | `brain/council/` |
| `/brain/memory` | `brain/memory/` |
| `/brain/learning` | `brain/learning/` |
| `/brain/narrate` | `brain/narrate/` |
| `/brain/trust` | `brain/trust/` |
| `/brain/iq` | `brain/iq/` |
| `/brain/benchmarks` | `brain/benchmarks/` |
| `/brain/self-tuning` | `brain/self-tuning/` |
| `/insights` | `insights/` |
| `/alerts` | `alerts/` |
| `/plans` | `plans/` |
| `/documents` | `documents/` |

**Finance & Analytics:**
| Route | Folder |
|-------|--------|
| `/finance` | `finance/` |
| `/analytics` + `/analytics/[id]` | `analytics/` |
| `/compare` | `compare/` |
| `/markets` | `markets/` |
| `/reports` | `reports/` |
| `/sustainability` | `sustainability/` |
| `/projects` | `projects/` |

**Team & Operations:**
| Route | Folder |
|-------|--------|
| `/tasks` | `tasks/` (TasksBoard client island) |
| `/users` + `/users/[id]` | `users/` |
| `/employees` | `employees/` |
| `/achievements` | `achievements/` |
| `/messages` | `messages/` |
| `/inbox` | `inbox/` |
| `/digest` | `digest/` |
| `/workspace` | `workspace/` (unit-level: ops/finance/intel/pipeline/team) |

**System & Config:**
| Route | Folder |
|-------|--------|
| `/dashboard` | `dashboard/` |
| `/workflows` + `/workflows/studio/[id]` | `workflows/` |
| `/integrations` | `integrations/` |
| `/audit-360` | `audit-360/` |
| `/activity` | `activity/` |
| `/trash` | `trash/` |
| `/settings` | `settings/` |
| `/changelog` | `changelog/` |
| `/search` | `search/` |
| `/pinned` | `pinned/` |
| `/help` | `help/` |
| `/roadmap` | `roadmap/` |
| `/system` | `system/` |

**ERP back-office (under /admin — operator-facing, NOT superadmin):**
| Route | Folder |
|-------|--------|
| `/admin/brain` | `admin/brain/` |
| `/admin/accounts` | `admin/accounts/` |
| `/admin/customers` | `admin/customers/` |
| `/admin/imports` | `admin/imports/` |
| `/admin/journal` | `admin/journal/` |
| `/admin/mappings` | `admin/mappings/` |
| `/admin/movements` | `admin/movements/` |
| `/admin/products` | `admin/products/` |
| `/admin/purchase-orders` | `admin/purchase-orders/` |
| `/admin/sales-orders` | `admin/sales-orders/` |
| `/admin/suppliers` | `admin/suppliers/` |
| `/admin/transfers` | `admin/transfers/` |
| `/admin/warehouses` | `admin/warehouses/` |

#### `src/app/(admin)/` — Superadmin only (role === "ADMIN")
| Route | File |
|-------|------|
| `/admin/system` | Mission Control command deck |
| `/admin/empire` | 8-tile boardroom (cross-tenant) |
| `/admin/tenants` + `/admin/tenants/[id]` | Tenant management |
| `/admin/users` | All users across tenants |
| `/admin/genesis` | Workspace seed wizard (Phase 21) |
| `/admin/audit` | Audit log |
| `/admin/permissions-preview` | Role permissions editor |
| `/admin/db/[model]` | Raw DB browser |

#### `src/app/(theater)/` — Fullscreen Decision Theater (no sidebar, ESC to exit)
| Route | Folder |
|-------|--------|
| `/theater` | `theater/` |

#### `src/app/m/` — Mobile-first ops view
| Route | Folder |
|-------|--------|
| `/m` | `m/` |

#### `src/app/api/` — API routes (NOT for CRUD — only streaming/export/special)
| Endpoint | Purpose |
|----------|---------|
| `/api/converse` | SSE: "Talk to Brain" overlay |
| `/api/realtime` | SSE: presence + live updates |
| `/api/brain/cron` | Scheduled brain refresh (needs CRON_SECRET) |
| `/api/export/[type]` | CSV/JSON exports |
| `/api/export/html/[type]` | HTML report exports |
| `/api/protocol/openapi` | OpenAPI spec |
| `/api/toast` | Toast undo helper |

---

## COMPONENTS/ — UI COMPONENTS

| Folder | What's in it |
|--------|-------------|
| `brain/` | Brain UI widgets: TrustChip, CausalGraph, MemoryLake, Conversational, Scenario, etc. |
| `brand/` | CompanyLogo |
| `charts/` | AreaLineChart, BarChart, GaugeChart, Sankey |
| `companion/` | **Companion.tsx** — Phase 28 ambient photon |
| `dashboard/` | Dashboard panels: ActivityStream, AlertCenter, FinancialPulse, HeritageHero, etc. |
| `empire/` | Empire dashboard tiles: BrainActivity, SectorCard, Sparkline, etc. |
| `exec/` | Executive card/panel components |
| `finance/` | TransactionTable |
| `forms/` | Field, FormErrorBanner, SubmitButton |
| `genesis/` | Constellation.tsx (Phase 21 sector preview), SeedDemoButton |
| `heritage/` | HeritagePill, HeritageSection, HeritageQuickLink |
| `layout/` | Topbar, Footer, Sidebar, DeferredOverlays, OnboardingTour, DocumentDropZone, WelcomeSplash, PageHeader, etc. |
| `mobile/` | MobileNav, OpsCard, NarratorTicker, PullToRefresh |
| `nav/` | CommandPalette, QuickAddFAB |
| `orrery/` | OrreryFrame, ConstellationRail, FabRail, LivingAtmosphere, DiveReveal, OrbitReturn |
| `realtime/` | Presence cursor, RealtimePresence |
| `theater/` | Theater-specific panels |
| `timemachine/` | TimeScrubber, TimeMachineBanner |
| `Toast/` | ToastProvider, toast rendering |
| `ui/` | DeleteButton, ExportMenu, shared primitives |
| `workflows/` | Workflow studio canvas components |

---

## LIB/ — DOMAIN PILLARS (one folder = one domain)

| Pillar | Files | What it does |
|--------|-------|-------------|
| `ai/` | aiEngine.ts, anomaly.ts, digest.ts | AI insight engine, anomaly detection |
| `alerts/` | alertEngine.ts | Alert evaluation + routing |
| `auth/` | session.ts, auth.ts, authz.ts, permissions.ts, owner.ts, password.ts, activityLog.ts, cronAuth.ts | Iron-session auth, bcrypt, roles, permissions, timing-safe secret compare |
| `brain/` | tools/ + orchestrator.ts + mcp/ + 40+ subsystem files | **THE BRAIN** — see section below |
| `brand/` | themes.ts | Theme presets + CSS-var generator |
| `db/` | db.ts, softDelete.ts, cleanupSoftDeletes.ts | Prisma client (scoped + unscoped), soft delete |
| `design/` | tokens.ts | Design token constants |
| `docintel/` | parser.ts, match.ts | Document intelligence (Phase 18) |
| `empire/` | aggregator.ts, summary.ts | Cross-tenant Empire dashboard aggregations |
| `export/` | exportRender.ts, exportAnalytics.ts | CSV/HTML export rendering |
| `finance/` | accounting.ts, finance.ts, inventory.ts, orders.ts, transfers.ts, period.ts | P&L, inventory, orders, period math |
| `genesis/` | recipes.ts | Declarative seed catalog + summarizeGenesis() |
| `i18n/` | i18n.ts, i18n.server.ts | Cookie-driven ar/en, hardcoded dictionary |
| `import/` | importMapping.ts, rateLimit.ts | Data import pipeline |
| `integrations/` | catalog.ts, runtime.ts | 24-tile integration marketplace |
| `intelligence/` | engine.ts | Brain analysis runner (runBrainAnalysis) |
| `mobile/` | today.ts | Mobile ops data fetcher |
| `orrery/` | routeMap.ts | Orrery dive → real route resolver |
| `protocol/` | spec.ts | OpenAPI Living Protocol (Phase 20) |
| `realtime/` | realtime.ts | SSE presence + live updates |
| `supply/` | bridge.ts | NS-1 supply/procurement bridge |
| `tenancy/` | tenancy.ts, workspace.ts, workspaceScope.ts | Multi-tenancy, view-as, scoped queries |
| `theater/` | director.ts | Decision Theater orchestration |
| `theme/` | theme.ts, theme.server.ts | Cookie-driven theme switching |
| `utils/` | utils.ts, timemachine.ts, toast.ts, logger.ts, gamification.ts, inbox.ts, env.ts, companyBrand.ts, changelogData.ts, formState.ts | cn(), formatMoney(), formatDate(), Time Machine cursor, flash toast |
| `workflows/` | templates.ts + engine | Workflow automation templates |
| `workspace/` | workspace data helpers | Unit-level workspace queries |

### The Brain (`src/lib/brain/`) — key files
| File | Phase | Role |
|------|-------|------|
| `tools/` | — | Entry surface: 7 typed tools (pullFacts, causalSubgraph, simulate, councilDebate, recallMemory, retrieveDocuments, narrate) + registry in `tools/index.ts` |
| `orchestrator.ts` | — | LLM tool-loop over the registry (LIVE mode); replaced the retired `Brain.ts` |
| `mcp/server.ts` / `mcp/scope.ts` | — | stdio MCP server, fail-closed tenant scoping (`npm run brain:mcp`) |
| `graph.ts` / `graph.prisma.ts` | 1 | Causal graph, weighted edges |
| `simulator.ts` / `simulator.bfs.ts` | 2 | What-if propagation |
| `council.ts` / `council.live.ts` | 3 | Multi-agent debate |
| `narrator.ts` / `narrator.claude.ts` | 4 | Bilingual editorial prose |
| `planner.ts` / `planner.live.ts` | 5 | Insight → action plan |
| `memory.ts` / `memory.live.ts` | 6 | Episodic recall |
| `feedback.ts` / `feedback.live.ts` | 7 | User reactions as signal |
| `federation.live.ts` | 8 | Cross-tenant learning |
| `meta.ts` / `meta.reflector.ts` | 10 | Self-reflection, Brain IQ |
| `embeddings.ts` | RAG | Gemini/OpenAI/Voyage/local hash |
| `retriever.ts` | RAG | cosine rank |
| `graphrag.ts` | RAG | PageRank over causal graph |
| `crag.ts` | RAG | Corrective RAG grade filter |
| `ragEval.ts` | RAG | Decomposed eval metrics |
| `ragGuard.ts` | RAG | Prompt-injection redaction |
| `converse.ts` | — | /api/converse brain chat — orchestrator loop in LIVE, single-shot in STUB |
| `agents/` | — | Industry packs: HospitalityExpert, DairyExpert, AgriExpert, FinanceBrain, RiskOfficer, Moderator |

---

## PRISMA/ — DATABASE SCHEMA

```
prisma/
  schema/               ← split schema (prismaSchemaFolder)
    schema.prisma       ← datasource (postgresql) + generator
    auth.prisma         ← User, Session, Tenant, RolePermission
    brain.prisma        ← BrainEdge, BrainMemory, BrainInsight, etc.
    documents.prisma    ← Document, DocumentClause
    engagement.prisma   ← Task, Message, AchievementEvent, etc.
    finance.prisma      ← Transaction, Account, etc.
    hospitality.prisma  ← Hotel, Booking
    dairy.prisma        ← DairyBatch
    agriculture.prisma  ← Farm, Crop
    education.prisma    ← Program
    supply.prisma       ← SupplyForecast
    protocol.prisma     ← ProtocolAgent
    ... (one file per pillar)
  migrations/           ← production migration history
  seed.ts               ← main seed (relative-dated, canonical)
```

---

## DOCS/ — DOCUMENTATION

### Governing (read before every session)
| File | Purpose |
|------|---------|
| `CLAUDE.md` *(root)* | **#1 — Claude Code rules, architecture, conventions** |
| `docs/DESIGN-SKILL.md` | **#2 — Design language (Heritage Modern + 7 others)** |
| `docs/PHASES-INTELLIGENCE.md` | **#3 — Master roadmap (Phases 1–28+)** |
| `src/lib/brain/README.md` | Brain architecture deep-dive |

### Engineering health
| File | Purpose |
|------|---------|
| `docs/AUDIT-2026-06.md` | Current health + prioritized open items |
| `docs/MAP.md` | **This file** |

### Operations
| File | Purpose |
|------|---------|
| `docs/DEPLOYMENT.md` | Railway deploy guide, env vars, cron setup |
| `docs/ISOLATION.md` | Tenant isolation checklist |
| `docs/ops/PERFORMANCE.md` | Performance notes |
| `docs/ops/GITHUB-WORKFLOW.md` | Branch/PR/CI conventions |

### Planning
| File | Purpose |
|------|---------|
| `docs/RE-INFRASTRUCTURE-PLAN.md` | Rebuild-the-right-way spec (docs-first) |
| `docs/BLUEPRINT.md` | High-level architecture blueprint |
| `docs/phases/READINESS.md` | Pitch readiness assessment *(historical snapshot 2026-05-15; current state → AUDIT-2026-06.md)* |
| `docs/prompts/LOGIN-REDESIGN.md` | Login cinematic redesign brief (Claude Design) |

### Design references
| Path | What's in it |
|------|-------------|
| `docs/design/system/_ref/` | Reference screenshots (login, dashboard, brain, etc.) |
| `docs/design/system/` | Design system HTML/CSS/JS prototypes |
| `docs/design/orrery/` | Orrery hub design reference |
| `docs/pitch-screenshots/` | Pitch deck screenshots |

---

## SCRIPTS/ — OPERATIONAL SCRIPTS

| Folder | Scripts |
|--------|---------|
| `build/` | `build-orrery.mjs` — builds public/orrery from design source |
| `ops/` | `brain-mcp.ts` (stdio MCP entrypoint, `npm run brain:mcp`), `reset-admin-password.ts`, `run-brain-all-tenants.ts`, `create-test-managers.ts`, `make-execs-crosstenant.ts`, `capture-dashboard.ts`, `e2e-link-check.mjs` |
| `seed/` | `seed-if-empty.ts` (Railway preDeploy), `ensure-admins.ts` (Railway preDeploy), `ensure-demo-docs.ts` (Railway preDeploy), `ensure-supply-forecasts.ts`, `seed-brain-local.ts` (local brain stub), `seed-demo-extras.ts`, `seed-production.ts`, `seed-erp-demo.ts`, `seed-markets.ts`, etc. |
| `test/` | Integration flow tests (NS-1, workflow studio, message persistence) |
| `verify/` | `brain-db-link.ts` (`npm run brain:doctor`), `brain-mcp-smoke.ts` (`npm run brain:mcp:smoke`), `sanity-sweep.ts`, `count-brain.ts`, revenue parity checks |

---

## PUBLIC/ — STATIC ASSETS

```
public/
  orrery/
    index.html        ← The Orrery hub (animated iframe, GSAP)
    gsap.js           ← GSAP animation library
    fonts/            ← Cairo font woff2 files
```

---

## COMMANDS CHEATSHEET

```bash
npm run dev          # local dev server → http://localhost:3000
npm run build        # prisma generate + db push + next build
npm run db:push      # sync schema → dev DB (no migration)
npm run db:seed      # seed Hourani demo data
npm run db:reset     # nuke + recreate + reseed
npm run db:studio    # Prisma Studio GUI
npm run lint         # eslint
npm test             # vitest (src/lib/**/*.test.ts only)
```

---

## LOGIN CREDENTIALS (after seed)

| Email | Role | Password |
|-------|------|---------|
| `admin@hourani.jo` | ADMIN | `admin123` |
| `ceo@hourani.jo` | EXECUTIVE | `admin123` |
| `staff@hourani.jo` | STAFF | `admin123` |
| `newhire@hourani.jo` | STAFF | `admin123` |

> If password fails after reseed: check `SEED_ADMIN_PASSWORD` in `.env` — it overrides `admin123`.
