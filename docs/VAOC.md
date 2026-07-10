# VAOC — the Virtual Agent Orchestration Company

owner: Anas Hasiba
last-updated: 2026-07-10

The operating manual for the company of agents that builds and maintains
H-Nerve. This file is the **single source of truth** for how work is routed,
who reviews whom, and what nobody is allowed to do.

- The agent briefs live in `.claude/agents/`. The Managing Director is
  [`orchestrator.md`](../.claude/agents/orchestrator.md).
- The roster + MCP servers are catalogued in [`SUBAGENTS-AND-MCP-CATALOG.md`](SUBAGENTS-AND-MCP-CATALOG.md).
- The concept paper behind this design is [`proposals/VAOC-BLUEPRINT.md`](proposals/VAOC-BLUEPRINT.md).

**Core invariant: agents propose, humans commit.** Every agent action lands as a
commit on a branch and reaches `main` only through a PR a human approved. This
is the same read-mostly boundary the Brain itself obeys — it is what makes the
company auditable instead of merely fast.

---

## 1. The org chart

Overall topology: **hierarchical** — a supervisor of supervisors. One
Orchestrator classifies any task and routes it to one of seven department
heads. Each head supervises workers using the topology that fits its work.

```
                        ┌──────────────────────────┐
                        │   ORCHESTRATOR  (MD)     │  classifies + routes
                        │   Supervisor-as-tools    │  over the dept heads
                        └────────────┬─────────────┘
   ┌───────────┬───────────┬─────────┼─────────┬───────────┬───────────┐
   ▼           ▼           ▼         ▼         ▼           ▼           ▼
 1 DOMAIN    2 FINANCE   3 BRAIN   4 PLATFORM 5 ARCH &   6 QUALITY   7 PROGRAM
   OPS       & ANALYTICS INTEL     & INTEGR.  DATA       DESIGN·L10N OFFICE·DOCS
 ops-       finance-    brain-    platform-  chief-     qa-         program-
 director   director    architect director   architect  director    director
 parallel   pipeline    network+  supervisor reviewer   triad +     pipeline
 fan-out                moderator            gates      gates
```

| # | Department | Head | Topology | Workers |
|---|---|---|---|---|
| 1 | **Domain Operations** | `ops-director` | Supervisor-as-tools (parallel) | `hospitality-engineer`, `dairy-engineer`, `agri-engineer`, `education-engineer`, `supply-chain-engineer` |
| 2 | **Finance & Analytics** | `finance-director` | Sequential pipeline | `finance-engineer` |
| 3 | **Brain / Intelligence** | `brain-architect` | Network + Supervisor | `council-author`; the council voices (Hospitality/Dairy/Agri/Finance/Risk + Moderator) |
| 4 | **Platform & Integrations** | `platform-director` | Supervisor | `integrations-engineer`, `workflow-template-author`, `document-intel-engineer`, `realtime-presence-engineer`, `mobile-ops-engineer`, `time-machine-engineer`, `protocol-spec-keeper`, `empire-curator` |
| 5 | **Architecture & Data** | `chief-architect` | Supervisor / reviewers-as-gates | `prisma-schema-architect`, `next-route-group-engineer` |
| 6 | **Quality, Design & L10n** | `qa-director` | Sequential (triad) + merge gates | `heritage-design-reviewer`, `i18n-bilingual-reviewer`, `deploy-preflight`, `bug-reproducer` → `root-cause-analyzer` → `fix-implementer`, GSD `gsd-security-auditor` |
| 7 | **Program Office / Docs** | `program-director` | Sequential pipeline | GSD `gsd-doc-writer`, `gsd-doc-classifier`, `gsd-doc-synthesizer`, `gsd-roadmapper`, `gsd-codebase-mapper` |

Only the six heads are new. Every worker already existed — the VAOC adds a
command structure, not headcount. `brain-architect` heads its own department
(it was already a supervisor with `Agent` in its toolset).

**Known thin spot, stated honestly:** Finance & Analytics has one worker.
Analytics, markets, and reporting work currently routes to `finance-engineer`.
Add workers when those surfaces grow — don't pre-create empty briefs.

---

## 2. The orchestration catalog — which pattern fires for which work

This table is the heart of the company. The **shape of the task** picks the
topology, not its size.

| Section / task type | Design pattern | Topology | Why |
|---|---|---|---|
| Cross-vertical ERP work (hotels/dairy/farms/education) | Independent | **Supervisor-as-tools** | domains don't inter-depend — parallelize |
| Brain council / decision debate | Collaborative | **Network + Supervisor** (moderator) | experts argue, moderator picks — this *is* `council.live.ts` |
| Finance close, P&L, reports | Sequential | **Pipeline** | pull → compute → validate → narrate is ordered |
| Bug fixing | Sequential | **Pipeline** (triad) | reproduce → diagnose → fix is a chain |
| Data import / ETL | Sequential | **Pipeline** | validate → coerce → load → verify |
| Whole-system build / refactor | Hierarchical | **Supervisor-of-supervisors** | many departments, needs a chain of command |
| Competing design or plan options | Competitive | **parallel rivals → judge** | generate alternatives, select best — costs 2–3× |
| Docs / organization | Sequential | **Pipeline** | research → synthesize → write → verify |

### The choosing rule

1. **Default to Supervisor-as-tools.** Cheapest controllable pattern.
2. **Escalate to Sequential pipeline** only when a step truly consumes the prior
   step's output. "Conceptually separate stages" is not a dependency — a barrier
   you don't need is wasted wall-clock.
3. **Network / collaborative only for genuine debate** (the council). Expensive,
   hard to control; never for routine work.
4. **Competitive only when the owner explicitly asks for alternatives.**
5. When two departments both have a claim, whoever **owns the files being
   edited** leads; the other is consulted as a reviewer.

---

## 3. How to invoke a department

Call the head, not the workers — the head knows the topology and sequences its
own people:

```
Agent(subagent_type: "ops-director",
      prompt: "Add a near-expiry alert that redirects Maha batches to the
               hotels' F&B ordering when the window opens. Touches dairy +
               hospitality + supply-chain.")
```

- **Task obviously belongs to one department?** Call that head directly. Don't
  add an Orchestrator hop for a hop's sake.
- **Task spans departments, or you're unsure who owns it?** Call `orchestrator`.
- **Task is one file in one pillar?** Call the worker directly. The company
  exists to coordinate, not to add ceremony to a typo fix.

Schema or route-group changes always pass `chief-architect` as a gate. Anything
user-visible passes `qa-director`'s reviewers before merge. These gates are
consulted even when another department leads.

---

## 4. Adding a new agent

One file, one registration, one topology decision:

1. **Write the brief** at `.claude/agents/<name>.md`. Frontmatter: `name`,
   `department`, `description` (a `|` block saying *when to use it* — this is
   what routing reads), `tools`, `model`.
2. **Pick its department** and add it to that head's roster + to the table in §1
   here and in `SUBAGENTS-AND-MCP-CATALOG.md`. Same PR.
3. **Pick the topology** its head will use to call it (usually the department's
   default).
4. **Give it the hard limits** section — copy it, don't paraphrase it.

**Don't add an agent when** an existing one already owns those files. Overlapping
ownership is how two agents end up editing the same file in one task. Extend the
existing brief instead.

---

## 5. Harmony rules

These exist because the failure modes below have all actually happened.

- **One owner per pillar.** Two agents never edit the same file in the same task
  without their head sequencing them.
- **Reviewers are gates, not authors.** Departments 5 and 6 block or approve.
  They do not silently rewrite another agent's work — a rewrite that nobody
  requested is indistinguishable from a regression.
- **Compound-error discipline.** Per-step reliability multiplies: ~95% per step
  becomes ~60% over ten steps. Prefer a 3-step pipeline with a human gate over a
  10-step autonomous chain.
- **Conflicts resolve upward, never sideways.** Two workers disagree → their head
  decides. Two heads disagree → the Orchestrator decides. The Orchestrator is
  unsure about product intent → it asks the human. It does not guess at scope.
- **Every repo-changing action is a commit on a branch** with a conventional
  message (`feat(scope): …`), reviewable by a human.

## 6. Hard limits (every agent, every task)

- **Branches + PRs only. Never push to `main`** — it is the Railway production
  trunk.
- **Nothing merges red:** `npx tsc --noEmit` + `npm test` + `npm run lint`, plus
  `next build` for anything that can break the deploy (framework, `next.config`,
  `tsconfig`, build scripts, the `src/` layout, schema/migrations, `railway.toml`,
  `package.json` engines). CI runs typecheck + tests only — **the deploy is the
  first real build**, so build locally before infra-touching changes.
- **The Brain is read-mostly.** No `prisma.<domainModel>.(create|update|delete|
  upsert)` inside `src/lib/brain/`. It proposes; mutations go through
  `src/app/(app)/<resource>/actions.ts`.
- **Docs update in the same PR as the code they describe.**
- **Committed schema is always `postgresql`.** SQLite dev-flip is local-only.
- **Secrets never touch source** — code, comments, commits, or PR text.
- **Cost caps are respected**: `BRAIN_MAX_LLM_CALLS`, `DOCINTEL_MAX_VISION_CALLS`,
  the per-user rate limit on `/api/converse`.

## 7. Sacred ground

- **The orbit/orrery animation.** IA changes touch `src/lib/orrery/groups.ts`
  **data** only — never the bloom, never the motion. `public/orrery/` is
  generated: edit `docs/design/orrery/`, then `node scripts/build/build-orrery.mjs`.
- **The admin console is Heritage** (cream/emerald/gold), by explicit owner
  override of `docs/DESIGN-SKILL.md` §1.F. Do not "restore" the cyan Sleek
  Operator skin.
- **One design vocabulary per surface.** Operator = Heritage Modern. Theater has
  its own editorial register. Never mix.
- **All UI text defaults to Arabic**, RTL-first.
