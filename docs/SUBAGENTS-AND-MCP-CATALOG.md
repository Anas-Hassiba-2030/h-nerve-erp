# Subagents & MCP Catalog

owner: Anas Hasiba
last-updated: 2026-07-10

One place to see **every subagent** you have and **every MCP server**, what each does, and where to edit it.

> Snapshot: 2026-07-10. The available set can change when you install/remove plugins or toggle claude.ai connectors. Re-generate by asking Claude to "refresh the subagent/MCP catalog."

## Where things live (3 tiers — this is what you edit)

| Tier | Path | Editable? |
|------|------|-----------|
| **Project agents** | `.claude/agents/<name>.md` (in this repo) | ✅ edit freely, commit with the repo |
| **Global agents** | `C:\Users\hp\.claude\agents\<name>.md` | ✅ edit, but machine-wide (affects every project) |
| **Plugin agents** | `C:\Users\hp\.claude\plugins\cache\<marketplace>\<plugin>\<ver>\agents\` | ⚠️ don't hand-edit — update via the plugin |

Each agent file is Markdown with YAML frontmatter (`name`, `description`, `tools`, optional `model`). Edit the body to change how the agent behaves; edit `description` to change when Claude auto-picks it.

---

## 1. Project subagents — the VAOC (`.claude/agents/`, 31 agents, in-repo)

> **The org chart, routing rules (which topology fires for which task), harmony
> rules, and hard limits live in [`docs/VAOC.md`](VAOC.md)** — the operating
> manual. This file is the **roster/catalog**: who exists, what each does, where
> to edit it. Read VAOC.md for *how work is routed*; read here for *who's on the team*.

These **31** agents are the **VAOC (Virtual Agent Orchestration Company)**:
**1 Orchestrator + 6 department heads + 24 workers**, in **7 departments**. Only
the 6 heads are new — every worker pre-existed and gained a `department:`
frontmatter field (no worker was deleted or renamed). `brain-architect` heads
the Brain department and is counted among the 24 workers (it was already a
supervisor with the `Agent` tool). Call the **head**, not the workers — the head
knows its topology and sequences its people (VAOC.md §3).

### Managing Director

| Agent | Department | Job | Model | File |
|-------|-----------|-----|-------|------|
| `orchestrator` | — (routes all) | Classifies any task, picks a topology, routes to a department head. Supervisor-as-tools over the seven heads. | opus | `.claude/agents/orchestrator.md` |

### Dept 1 — Domain Operations · head `ops-director` · Supervisor-as-tools (parallel fan-out)

| Agent | Role | Job | File |
|-------|------|-----|------|
| `ops-director` | **head** | Fans cross-vertical ERP work out to the domain engineers in parallel | `.claude/agents/ops-director.md` |
| `hospitality-engineer` | worker | Hotels, Bookings, Arena Space surfaces | `.claude/agents/hospitality-engineer.md` |
| `dairy-engineer` | worker | Maha dairy, DairyBatch lifecycle, QC, expiry routing | `.claude/agents/dairy-engineer.md` |
| `agri-engineer` | worker | Loran farms, crop cycles, irrigation/greenhouse | `.claude/agents/agri-engineer.md` |
| `education-engineer` | worker | The Tank incubator (AAU), Program model, cohorts | `.claude/agents/education-engineer.md` |
| `supply-chain-engineer` | worker | Predictive supply forecasting, demand bridges | `.claude/agents/supply-chain-engineer.md` |

### Dept 2 — Finance & Analytics · head `finance-director` · Sequential pipeline

| Agent | Role | Job | File |
|-------|------|-----|------|
| `finance-director` | **head** | Sequences the finance close: pull → compute → validate → narrate | `.claude/agents/finance-director.md` |
| `finance-engineer` | worker | Transactions, group P&L, margin, FX, cash flow | `.claude/agents/finance-engineer.md` |

> **Thin department, stated honestly:** one worker. Analytics, markets, and
> reporting currently route to `finance-engineer`. Add workers when those
> surfaces grow — don't pre-create empty briefs.

### Dept 3 — Brain / Intelligence · head `brain-architect` · Network + Supervisor (Moderator synthesizes)

Mirrors the real `src/lib/brain/council.live.ts` — voices argue, the Moderator picks.

| Agent | Role | Job | File |
|-------|------|-----|------|
| `brain-architect` | **head** | Owns all of `lib/brain/` — graph, sim, council, planner, memory, meta. Pre-existing supervisor (has the `Agent` tool). | `.claude/agents/brain-architect.md` |
| `council-author` | worker | Add/tune the council voices + the multi-agent debate | `.claude/agents/council-author.md` |

The **council voices** themselves (Hospitality/Dairy/Agri/Finance/Risk experts + Moderator) are runtime agent classes under `src/lib/brain/agents/*.ts`, not `.md` briefs — authored/tuned via `council-author`.

### Dept 4 — Platform & Integrations · head `platform-director` · Supervisor

| Agent | Role | Job | File |
|-------|------|-----|------|
| `platform-director` | **head** | Supervises the phase-feature engineers | `.claude/agents/platform-director.md` |
| `integrations-engineer` | worker | Connectors hub (Phase 13) — providers, OAuth, webhooks | `.claude/agents/integrations-engineer.md` |
| `workflow-template-author` | worker | Workflow Studio templates (Phase 12) | `.claude/agents/workflow-template-author.md` |
| `document-intel-engineer` | worker | Document Intelligence (Phase 18) — drop zone, parser | `.claude/agents/document-intel-engineer.md` |
| `realtime-presence-engineer` | worker | Real-time collab — cursors, presence, comments (Phase 17) | `.claude/agents/realtime-presence-engineer.md` |
| `mobile-ops-engineer` | worker | Mobile-first ops view `/m` (Phase 14) | `.claude/agents/mobile-ops-engineer.md` |
| `time-machine-engineer` | worker | Time Machine — as-of cursor, scrubber (Phase 16) | `.claude/agents/time-machine-engineer.md` |
| `protocol-spec-keeper` | worker | Living Protocol / OpenAPI / dev portal (Phase 20) | `.claude/agents/protocol-spec-keeper.md` |
| `empire-curator` | worker | Multi-tenant Empire dashboard `/admin/empire` (Phase 19) | `.claude/agents/empire-curator.md` |

### Dept 5 — Architecture & Data · head `chief-architect` · Supervisor / reviewers-as-gates

| Agent | Role | Job | File |
|-------|------|-----|------|
| `chief-architect` | **head** | Gates schema + route-group changes (consulted even when another dept leads) | `.claude/agents/chief-architect.md` |
| `prisma-schema-architect` | worker | Prisma schema, migrations, soft-delete, sqlite↔postgres | `.claude/agents/prisma-schema-architect.md` |
| `next-route-group-engineer` | worker | Route groups, layouts, server actions, auth gates | `.claude/agents/next-route-group-engineer.md` |

### Dept 6 — Quality, Design & L10n · head `qa-director` · Sequential bug triad + reviewers as merge gates

| Agent | Role | Job | File |
|-------|------|-----|------|
| `qa-director` | **head** | Runs the bug triad in order; fields reviewers as merge gates | `.claude/agents/qa-director.md` |
| `heritage-design-reviewer` | worker (gate) | Design-system compliance (Heritage Modern, RTL, tokens) | `.claude/agents/heritage-design-reviewer.md` |
| `i18n-bilingual-reviewer` | worker (gate) | Arabic/English pairing, RTL safety, fonts | `.claude/agents/i18n-bilingual-reviewer.md` |
| `deploy-preflight` | worker (gate) | Verifies the Railway build actually builds before an infra-touching merge | `.claude/agents/deploy-preflight.md` |
| `bug-reproducer` | worker (triad 1) | Build a minimal repro → `.claude/bug-state/repro.md` | `.claude/agents/bug-reproducer.md` |
| `root-cause-analyzer` | worker (triad 2) | Locate cause → `.claude/bug-state/diagnosis.md` | `.claude/agents/root-cause-analyzer.md` |
| `fix-implementer` | worker (triad 3) | Fix + regression test → `.claude/bug-state/fix.md` | `.claude/agents/fix-implementer.md` |

The bug triad hands off in order via `.claude/bug-state/`. This department also
includes the **global** GSD agent `gsd-security-auditor` (see §2).

### Dept 7 — Program Office / Docs · head `program-director` · Sequential pipeline (research → synthesize → write → verify)

This department has **no project-tier workers** — its members are all **global**
GSD agents (see §2): `gsd-doc-writer`, `gsd-doc-classifier`, `gsd-doc-synthesizer`,
`gsd-roadmapper`, `gsd-codebase-mapper`.

| Agent | Role | Job | File |
|-------|------|-----|------|
| `program-director` | **head** | Sequences docs/roadmap work over the global GSD doc agents | `.claude/agents/program-director.md` |

**Department count check:** 1 orchestrator + 6 heads + 24 project workers = **31**
`.claude/agents/*.md` (excluding `README.md`). Workers by dept: 1→5, 2→1, 3→2
(incl. `brain-architect`), 4→8, 5→2, 6→6, 7→0 project = 24.

---

## 2. Global subagents — `C:\Users\hp\.claude\agents\` (33, the GSD suite)

The **GSD ("Getting Stuff Done") pipeline** — a structured plan → execute → verify workflow. Machine-wide (every project sees them). Grouped by stage:

- **Project/roadmap:** `gsd-project-researcher`, `gsd-research-synthesizer`, `gsd-roadmapper`
- **Plan a phase:** `gsd-planner`, `gsd-phase-researcher`, `gsd-pattern-mapper`, `gsd-assumptions-analyzer`, `gsd-advisor-researcher`, `gsd-plan-checker`
- **Execute:** `gsd-executor`, `gsd-debug-session-manager`, `gsd-debugger`, `gsd-code-fixer`
- **Verify/review:** `gsd-verifier`, `gsd-code-reviewer`, `gsd-integration-checker`, `gsd-security-auditor`, `gsd-ui-auditor`, `gsd-ui-checker`, `gsd-nyquist-auditor`, `gsd-eval-auditor`, `gsd-doc-verifier`
- **Docs:** `gsd-doc-writer`, `gsd-doc-classifier`, `gsd-doc-synthesizer`
- **AI-integration phase:** `gsd-ai-researcher`, `gsd-domain-researcher`, `gsd-eval-planner`, `gsd-framework-selector`, `gsd-ui-researcher`
- **Codebase intel:** `gsd-codebase-mapper`, `gsd-intel-updater`, `gsd-user-profiler`

Each is `C:\Users\hp\.claude\agents\<name>.md`.

**Global GSD agents that belong to a VAOC department** (§1) — global tier, but
routed as members of a department:

| GSD agent | VAOC department |
|-----------|-----------------|
| `gsd-security-auditor` | Dept 6 — Quality, Design & L10n (`qa-director`) |
| `gsd-doc-writer`, `gsd-doc-classifier`, `gsd-doc-synthesizer`, `gsd-roadmapper`, `gsd-codebase-mapper` | Dept 7 — Program Office / Docs (`program-director`) |

---

## 3. Plugin subagents (namespaced `plugin:agent`)

From installed plugins (edit via the plugin, not by hand):

| Agent | Plugin | Job |
|-------|--------|-----|
| `caveman:cavecrew-builder` | caveman | Surgical 1–2 file edits (refuses 3+ files) |
| `caveman:cavecrew-investigator` | caveman | Read-only code locator (token-compressed) |
| `caveman:cavecrew-reviewer` | caveman | Diff/branch reviewer, one line per finding |
| `feature-dev:code-architect` | feature-dev | Feature architecture blueprints |
| `feature-dev:code-explorer` | feature-dev | Trace/map existing features |
| `feature-dev:code-reviewer` | feature-dev | Confidence-filtered bug/quality review |
| `code-simplifier:code-simplifier` | code-simplifier | Simplify recently-changed code, behavior-preserving |
| `vercel:ai-architect` | vercel | Architect AI apps on Vercel (AI SDK, agents) |
| `vercel:deployment-expert` | vercel | Vercel deploy strategy, CI/CD, rollbacks |
| `vercel:performance-optimizer` | vercel | Core Web Vitals, caching, bundle size |

Installed plugins: `caveman`, `vercel`, `superpowers`, `frontend-design`, `code-review`, `code-simplifier`, `skill-creator`, `feature-dev`, `context-mode`, `claude-code-setup`.

---

## 4. Built-in subagents (always available)

| Agent | Job |
|-------|-----|
| `Explore` | Read-only broad search — finds code across many files, returns conclusions |
| `Plan` | Software-architect planning (read-only); step-by-step implementation plans |
| `general-purpose` | Multi-step research / search / execution (all tools) |
| `claude` | Catch-all default agent (all tools) |
| `claude-code-guide` | Answers Claude Code / Agent SDK / Claude API questions |
| `statusline-setup` | Configures your status line |

---

## 5. MCP servers — what each one is for

### 5a. Your own product MCP (in this repo)

| Server | What it does | Run / edit |
|--------|--------------|-----------|
| **brain-mcp** | The H-Nerve brain exposed as a stdio MCP — 7 tools: `pullFacts`, `retrieveDocuments`, `causalSubgraph`, `simulate`, `recallMemory`, `councilDebate`, `narrate`. Fail-closed tenant scoping. **This is the one we built.** | `npm run brain:mcp` · `scripts/ops/brain-mcp.ts`, `lib/brain/mcp/` · verify with `npm run brain:mcp:smoke` |

### 5b. Plugin MCPs (active this session)

| Server | What it does |
|--------|--------------|
| **context-mode** (`ctx_*`) | Context-window protection: runs shell commands in a sandbox, indexes their output, and lets Claude FTS-search it — keeps huge raw output out of the main context. |
| **vercel** | Vercel deploys, env vars (`vercel env`), logs, project config. Needs the Vercel CLI + auth. |

### 5c. claude.ai connectors (account-level — managed in the Claude app, not a repo file)

| Server | What it does |
|--------|--------------|
| **Figma** | Read designs → code, write code → Figma, Code Connect, FigJam, diagrams |
| **Postman** | API collections, specs, mocks, environments, workspaces |
| **Shopify** | Store setup, products, orders, customers, inventory, ShopifyQL, GraphQL Admin |
| **Canva** | Create/edit/export designs, brand templates |
| **Gmail** | Search threads, drafts, labels (read + organize; no send) |
| **Google Calendar** | List/create/update events, suggest times |
| **HubSpot** | CRM objects, campaigns, properties, owners |
| **Notion** | Pages, databases, views, comments, search |
| **Sentry** | Error monitoring (requires auth step) |
| **AWS Marketplace** | Research/compare marketplace solutions |
| **Adobe** (Marketing Agent + Creativity) | Image/video/document editing, Firefly, stock assets |
| **Netlify** | Deploy/project/extension/team services |

### 5d. Available earlier but disconnected this session

`computer-use`, `bio-research` (biorxiv / clinical-trials / chembl / consensus), `Claude-in-Chrome`, `Claude-Preview`, `pdf-viewer`, `sanity`, `scheduled-tasks`, `mcp-registry`. They reconnect when their plugin/connector is re-enabled.

---

## How to use any of these

- **Subagent:** ask Claude to use it by name ("use `dairy-engineer` to…"), or it auto-picks based on the `description`. To change behavior, edit the agent's `.md` file (tier table at top).
- **MCP tool:** Claude calls them automatically when relevant. To add/remove connectors, use the Claude app's connector settings; to add/remove plugins, use the plugin manager. To edit **brain-mcp** (yours), change `lib/brain/tools/` + `lib/brain/mcp/`.
