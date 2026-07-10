# H-Nerve agent company (VAOC)

The Virtual Agent Orchestration Company. A chain of command, not a flat
pool of specialists. One **Orchestrator** (the Managing Director) routes
every incoming task to one of **7 department heads**; each head supervises
the workers who own the code.

- **Orchestrator** — `orchestrator.md`. Classifies the task, picks a
  topology, routes to a department. For a task that plainly belongs to one
  department, call that head directly — don't add a hop.
- **7 department heads** — 6 are thin supervisor briefs
  (`ops-director`, `finance-director`, `platform-director`,
  `chief-architect`, `qa-director`, `program-director`); the Brain
  department is headed by `brain-architect`, which is both head **and** a
  worker (it owns `src/lib/brain/` end-to-end and supervises
  `council-author`).
- **24 workers** — each owns a slice of the codebase. A worker's
  `department:` frontmatter field is the routing key.

Drop into any agent with the `Agent` tool, or just describe the task and
let the Orchestrator route by reading the `description` + `department`
frontmatter.

## Org chart

```
                        orchestrator  (Managing Director)
                              │
   ┌──────────┬──────────┬────┴─────┬────────────┬───────────┬──────────┐
 ops-      finance-   brain-     platform-    chief-       qa-       program-
 director  director   architect  director     architect   director  director
(Domain   (Finance   (Brain)     (Platform &  (Arch &     (Quality) (Program
 Ops)      & Anlytx)              Integr.)     Data)                  Office)
```

## Departments

### Domain Ops — head `ops-director`
Topology: **Supervisor-as-tools, parallel.** Verticals are independent —
the head fans work out to the owning engineer(s) and merges results.

| Worker | Owns |
|---|---|
| `hospitality-engineer` | `/hotels`, Arena Space, Booking model |
| `dairy-engineer` | `/dairy`, Maha, DairyBatch, QC, expiry routing |
| `agri-engineer` | `/farms`, Loran, Crop, irrigation signals |
| `education-engineer` | `/education`, The Tank, Program, cohorts |
| `supply-chain-engineer` | `/supply-chain`, SupplyForecast, AI Bridge |

### Finance & Analytics — head `finance-director`
Topology: **Sequential pipeline.** Money math is order-sensitive
(validate → compute → reconcile) — steps run in series, not parallel.

| Worker | Owns |
|---|---|
| `finance-engineer` | `/finance`, Transaction, group treasury, FX, margins |

### Brain — head `brain-architect`
Topology: **Network + Supervisor with Moderator synthesis** — mirrors the
real `src/lib/brain/council.live.ts`: voices debate as a network, the
Moderator synthesizes one verdict. `brain-architect` is head and worker.

| Worker | Owns |
|---|---|
| `brain-architect` | All 10 brain phases, `src/lib/brain/` end-to-end |
| `council-author` | Phase 3 multi-agent debate, voice roster, vote weights |

### Platform & Integrations — head `platform-director`
Topology: **Supervisor.** One head routes to the owner of each
cross-cutting platform layer.

| Worker | Owns |
|---|---|
| `integrations-engineer` | Phase 13 hub, 24 connectors, catalog + runtime |
| `workflow-template-author` | Phase 12 templates, studio actions |
| `document-intel-engineer` | Phase 18 drop zone, parser, modal |
| `realtime-presence-engineer` | Phase 17 cursors, pips, comments |
| `mobile-ops-engineer` | Phase 14 `/m`, Calm Clinical |
| `time-machine-engineer` | Phase 16 `getAsOf()`, pill, banner |
| `protocol-spec-keeper` | Phase 20 `/dev` portal, OpenAPI, marketplace |
| `empire-curator` | Phase 19 `/admin/empire`, Quiet Authority |

### Architecture & Data — head `chief-architect`
Topology: **Supervisor / reviewers-as-gates.** These two set foundations
every other department builds on; they gate schema and route-boundary
changes rather than authoring feature code.

| Worker | Owns |
|---|---|
| `prisma-schema-architect` | Schema design, migrations, soft-delete, PG/SQLite flip |
| `next-route-group-engineer` | Route groups, layouts, server-action conventions |

### Quality, Design & L10n — head `qa-director`
Topology: **Sequential triad + reviewers as merge gates.** The bug-fix
triad runs in strict order via filesystem handoff (see below); the
reviewers gate merges — they recommend/correct, they don't own features.

| Worker | Role |
|---|---|
| `heritage-design-reviewer` | `docs/governance/DESIGN-SKILL.md` enforcement — **read-only** gate |
| `i18n-bilingual-reviewer` | ar/en pairing, RTL safety, fonts — fix-capable reviewer |
| `deploy-preflight` | Railway build safety gate before infra-touching merges |
| `bug-reproducer` | Triad stage 1 — repro |
| `root-cause-analyzer` | Triad stage 2 — diagnose |
| `fix-implementer` | Triad stage 3 — ship + verify |

### Program Office — head `program-director`
Topology: **Sequential pipeline.** Owns delivery orchestration —
plan → open PR → gate → merge. No dedicated line workers yet; it drives
the other departments' output through the PR pipeline.

## The bug-fix triad (stateful, artifact handoff)

Three of the Quality workers form a 3-stage pipeline that hands off through
**filesystem artifacts in `.claude/bug-state/`**, not orchestrator
summaries:

| Agent | Stage | Reads | Writes |
|---|---|---|---|
| `bug-reproducer` | 1 — repro | `bug.md` | `.claude/bug-state/repro.md` |
| `root-cause-analyzer` | 2 — diagnose | `repro.md` | `.claude/bug-state/diagnosis.md` |
| `fix-implementer` | 3 — ship + verify | `repro.md` + `diagnosis.md` | `.claude/bug-state/fix.md` |

**Why a triad, not one agent?** One agent doing all three stages runs 25+
tool calls in a single window — context fills, the model forgets the
original symptom by the time it edits code. Splitting gives each stage a
focused window.

**Why artifacts, not summaries?** A naive sequential pipeline fails three
ways: *telephone game* (logs get paraphrased), *compounding errors* (a
missed edge case in stage 1 poisons 2 + 3), *one-way authority* (the fixer
can't push back on a flawed diagnosis it never saw). Artifact handoff
solves all three — each agent reads the previous artifact **in full**, has
explicit **bounce-back authority** (if `repro.md` doesn't demonstrate the
bug, stage 2 stops and says so), and the artifacts persist on disk —
replayable, auditable. Keep them in git for an audit trail, or
`.gitignore` them if each fix is transient.

## Model assignment

| Tier | Model | Why |
|---|---|---|
| `orchestrator`, `brain-architect` | opus | Cross-department routing / cross-subsystem reasoning + hard debugging |
| Everyone else | sonnet | Workhorse for tool use + code edits |

## Permissions

- Domain, Finance, Platform, and Architecture workers have full
  Read + Edit + Write + Bash + Glob + Grep.
- `heritage-design-reviewer` is the only **strictly read-only** agent
  (Read + Glob + Grep) — it recommends, it never touches a file.
- `i18n-bilingual-reviewer` is a **fix-capable reviewer**: Read + Edit +
  Glob + Grep. It corrects in place but has no Write or Bash — it edits
  existing files, never creates or runs.
- `root-cause-analyzer` is read-only **on the codebase** (no `Edit`) but
  holds a single scoped `Write` for one purpose: emitting
  `diagnosis.md`. Without that grant the triad handoff can't complete —
  it's a write-one-artifact agent, not a read-only one.
- Heads (`*-director`, `chief-architect`, `orchestrator`) carry `Agent`
  so they can delegate to their workers.

## Every agent's system prompt follows the 7-part blueprint

1. **Identity** — who they are and what they own
2. **Surfaces** — exact file paths under their jurisdiction
3. **Invariants** — bugs if violated (CLAUDE.md + design docs)
4. **How they work** — the project conventions
5. **Output style** — what they produce
6. **When they delegate** — who to hand off to
7. **Edge cases** — the gotchas

All agents default to **Arabic-first** (English secondary for technical
labels), use the Heritage palette unless the surface is intentionally
another vocabulary, never auto-mutate domain data (the brain proposes,
humans commit), write strings not enums for role/status/sector/tier, use
tabular numerals on every number, and honor `prefers-reduced-motion`.

## Harmony rules

- **One owner per pillar.** Every file has exactly one department that owns
  it. No two agents edit the same surface.
- **Reviewers gate, they don't author.** Design / i18n / preflight review
  and correct at the boundary; they don't write feature code.
- **Short loops with human gates.** Keep chains shallow; a human approves
  at each meaningful step.
- **Agents propose via PRs; humans merge.** No agent pushes to `main` —
  work lands as a branch + PR, a human merges after CI goes green.

## When to add / not add an agent

Add a new agent file when a new vertical opens (a healthcare pack), a new
platform layer emerges (observability), or a cross-cutting concern needs
its own guard rail (a11y) — and give it a `department:` so the Orchestrator
can route to it.

Don't add an agent for a one-off task (do it inline), a subset of an
existing agent's surface (extend the owner), or a skill / external tool
(those live in `~/.claude/`).

## Further reading

- **`docs/architecture/VAOC.md`** — the full operating manual for this company (written
  in this same PR).
- **`docs/architecture/SUBAGENTS-AND-MCP-CATALOG.md`** — the catalog of every subagent
  and MCP surface.
