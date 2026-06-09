# Subagents & MCP Catalog

One place to see **every subagent** you have and **every MCP server**, what each does, and where to edit it.

> Snapshot: 2026-06-09. The available set can change when you install/remove plugins or toggle claude.ai connectors. Re-generate by asking Claude to "refresh the subagent/MCP catalog."

## Where things live (3 tiers — this is what you edit)

| Tier | Path | Editable? |
|------|------|-----------|
| **Project agents** | `.claude/agents/<name>.md` (in this repo) | ✅ edit freely, commit with the repo |
| **Global agents** | `C:\Users\hp\.claude\agents\<name>.md` | ✅ edit, but machine-wide (affects every project) |
| **Plugin agents** | `C:\Users\hp\.claude\plugins\cache\<marketplace>\<plugin>\<ver>\agents\` | ⚠️ don't hand-edit — update via the plugin |

Each agent file is Markdown with YAML frontmatter (`name`, `description`, `tools`, optional `model`). Edit the body to change how the agent behaves; edit `description` to change when Claude auto-picks it.

---

## 1. Project subagents — `.claude/agents/` (23, yours, in-repo)

**Industry verticals** (own one business domain each):

| Agent | Job | File |
|-------|-----|------|
| `hospitality-engineer` | Hotels, Bookings, Arena Space surfaces | `.claude/agents/hospitality-engineer.md` |
| `dairy-engineer` | Maha dairy, DairyBatch lifecycle, QC, expiry routing | `.claude/agents/dairy-engineer.md` |
| `agri-engineer` | Loran farms, crop cycles, irrigation/greenhouse | `.claude/agents/agri-engineer.md` |
| `education-engineer` | The Tank incubator (AAU), Program model, cohorts | `.claude/agents/education-engineer.md` |
| `finance-engineer` | Transactions, group P&L, margin, FX, cash flow | `.claude/agents/finance-engineer.md` |
| `supply-chain-engineer` | Predictive supply forecasting, demand bridges | `.claude/agents/supply-chain-engineer.md` |

**Brain & intelligence:**

| Agent | Job | File |
|-------|-----|------|
| `brain-architect` | Owns all of `lib/brain/` — graph, sim, council, planner, memory, meta | `.claude/agents/brain-architect.md` |
| `council-author` | Add/tune council voices + the multi-agent debate | `.claude/agents/council-author.md` |

**Platform features (by phase):**

| Agent | Job | File |
|-------|-----|------|
| `integrations-engineer` | Connectors hub (Phase 13) — providers, OAuth, webhooks | `.claude/agents/integrations-engineer.md` |
| `workflow-template-author` | Workflow Studio templates (Phase 12) | `.claude/agents/workflow-template-author.md` |
| `document-intel-engineer` | Document Intelligence (Phase 18) — drop zone, parser | `.claude/agents/document-intel-engineer.md` |
| `mobile-ops-engineer` | Mobile-first ops view `/m` (Phase 14) | `.claude/agents/mobile-ops-engineer.md` |
| `realtime-presence-engineer` | Real-time collab — cursors, presence, comments (Phase 17) | `.claude/agents/realtime-presence-engineer.md` |
| `protocol-spec-keeper` | Living Protocol / OpenAPI / dev portal (Phase 20) | `.claude/agents/protocol-spec-keeper.md` |
| `time-machine-engineer` | Time Machine — as-of cursor, scrubber (Phase 16) | `.claude/agents/time-machine-engineer.md` |
| `empire-curator` | Multi-tenant Empire dashboard `/admin/empire` (Phase 19) | `.claude/agents/empire-curator.md` |

**Architecture & quality reviewers:**

| Agent | Job | File |
|-------|-----|------|
| `prisma-schema-architect` | Prisma schema, migrations, soft-delete, sqlite↔postgres | `.claude/agents/prisma-schema-architect.md` |
| `next-route-group-engineer` | Route groups, layouts, server actions, auth gates | `.claude/agents/next-route-group-engineer.md` |
| `heritage-design-reviewer` | Design-system compliance (Heritage Modern, RTL, tokens) | `.claude/agents/heritage-design-reviewer.md` |
| `i18n-bilingual-reviewer` | Arabic/English pairing, RTL safety, fonts | `.claude/agents/i18n-bilingual-reviewer.md` |

**Bug-fix triad** (run in order):

| Agent | Job | File |
|-------|-----|------|
| `bug-reproducer` | Stage 1 — build a minimal repro → `.claude/bug-state/repro.md` | `.claude/agents/bug-reproducer.md` |
| `root-cause-analyzer` | Stage 2 — locate cause → `.claude/bug-state/diagnosis.md` | `.claude/agents/root-cause-analyzer.md` |
| `fix-implementer` | Stage 3 — fix + regression test → `.claude/bug-state/fix.md` | `.claude/agents/fix-implementer.md` |

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
