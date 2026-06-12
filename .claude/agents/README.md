# H-Nerve agent suite

23 Claude Code sub-agents that live in this folder. 20 of them own a
slice of the H-Nerve codebase. The other 3 form the **bug-fix triad** —
a stateful 3-stage pipeline that fixes bugs without losing context
between stages.

Drop into any agent with the `Agent` tool and let it work — or just
describe the task and Claude will route it to the right specialist by
reading the `description` frontmatter.

## How to use

```
Use the dairy-engineer agent to add a new "near-expiry promo router" action.
```

Or simply:

```
Add a near-expiry promo router for Maha.
```

Claude reads every agent's `description` and routes by topical match.
If two agents could plausibly do the work, Claude picks one and tells
you which.

## The 23 agents

### Domain engineers (6) — one per vertical
| Agent | Owns |
|---|---|
| `hospitality-engineer` | `/hotels`, Arena Space, Booking model |
| `dairy-engineer` | `/dairy`, Maha, DairyBatch, QC, expiry routing |
| `agri-engineer` | `/farms`, Loran, Crop, irrigation signals |
| `education-engineer` | `/education`, The Tank, Program, cohorts |
| `finance-engineer` | `/finance`, Transaction, group treasury, FX |
| `supply-chain-engineer` | `/supply-chain`, SupplyForecast, AI Bridge |

### Brain tier (2) — `src/lib/brain/` and the runtime council
| Agent | Owns |
|---|---|
| `brain-architect` | All 10 brain phases, `src/lib/brain/` end-to-end |
| `council-author` | Phase 3 multi-agent debate, voice roster |

### Platform engineers (8) — cross-cutting infrastructure
| Agent | Owns |
|---|---|
| `integrations-engineer` | Phase 13 hub, 24 connectors, catalog + runtime |
| `workflow-template-author` | Phase 12 templates, studio actions |
| `document-intel-engineer` | Phase 18 drop zone, parser, modal |
| `mobile-ops-engineer` | Phase 14 `/m`, Calm Clinical |
| `realtime-presence-engineer` | Phase 17 cursors, pips, comments |
| `protocol-spec-keeper` | Phase 20 `/dev` portal, OpenAPI, marketplace |
| `time-machine-engineer` | Phase 16 `getAsOf()`, pill, banner |
| `empire-curator` | Phase 19 `/admin/empire`, Quiet Authority |

### Cross-cutting reviewers (4) — guard rails
| Agent | Owns |
|---|---|
| `heritage-design-reviewer` | `docs/DESIGN-SKILL.md` enforcement, one-vocab-per-surface |
| `i18n-bilingual-reviewer` | ar/en pairing, RTL safety, font selection |
| `prisma-schema-architect` | Schema design, migrations, soft-delete |
| `next-route-group-engineer` | Route groups, layouts, server-action conventions |

### Bug-fix triad (3) — stateful, artifact-handoff pipeline
| Agent | Stage | Reads | Writes |
|---|---|---|---|
| `bug-reproducer` | 1 — repro | `bug.md` | `.claude/bug-state/repro.md` |
| `root-cause-analyzer` | 2 — diagnose | `repro.md` | `.claude/bug-state/diagnosis.md` |
| `fix-implementer` | 3 — ship + verify | `repro.md` + `diagnosis.md` | `.claude/bug-state/fix.md` |

**Why a triad instead of one agent?** A single agent doing all three
stages has 25+ tool calls in one window — context fills up, the model
forgets the original symptom by the time it's editing code. Splitting
into three lets each stage have a focused window.

**Why not a naive sequential pipeline?** Three failure modes:
1. *Telephone game.* Subagents return summaries; logs get paraphrased.
2. *Compounding errors.* If stage 1 misses an edge case, stages 2 + 3
   work on the wrong premise.
3. *One-way authority.* The fixer can't push back on a flawed diagnosis
   because it never saw the original logs.

**The triad solves all three** by handing off through **filesystem
artifacts**, not orchestrator summaries:
- Each agent reads the previous artifact in full — no information loss.
- Each agent has explicit **bounce-back authority** — if `repro.md`
  doesn't actually demonstrate the bug, `root-cause-analyzer` writes a
  diagnosis that says "cannot diagnose without reproduction" and stops.
- Artifacts persist on disk — replayable, auditable, learnable.

**Running the triad:**
```
You report bug → Claude invokes bug-reproducer
  → writes repro.md
Claude invokes root-cause-analyzer
  → reads repro.md, writes diagnosis.md
Claude invokes fix-implementer
  → reads BOTH, writes fix.md, ships the fix, verifies
```

Or all in one prompt:
```
"There's a bug where /dairy/new throws when the batch number contains
slashes. Fix it."
→ Claude orchestrates the triad end-to-end
```

The artifacts live in `.claude/bug-state/` — keep them in git for an
audit trail, or `.gitignore` them if you treat each fix as transient.

## Design principles

Each agent's system prompt follows the `agent-patterns` skill blueprint:
1. **Identity** — who they are and what they own
2. **Surfaces** — exact file paths under their jurisdiction
3. **Invariants** — bugs if violated (CLAUDE.md + design docs)
4. **How they work** — the project conventions
5. **Output style** — what they produce
6. **When they delegate** — who to hand off to
7. **Edge cases** — the gotchas

All agents:
- Default to **Arabic-first** with English secondary for technical labels
- Use the Heritage palette unless the surface is intentionally another vocabulary
- Never auto-mutate domain data — the brain proposes, humans commit
- Write strings (not enums) for role/status/sector/tier
- Use tabular numerals on every number
- Honor `prefers-reduced-motion` on every animation

## Model assignment
| Tier | Model | Why |
|---|---|---|
| `brain-architect` | opus | Cross-subsystem reasoning, hard debugging |
| Everyone else | sonnet | Workhorse for tool use + code edits |

## Permissions
Domain engineers and platform engineers have full Read + Edit + Write +
Bash + Glob + Grep.

`heritage-design-reviewer` is the only **strictly read-only** agent
(Read + Glob + Grep) — it recommends, it never touches a file.

`i18n-bilingual-reviewer` is a **fix-capable reviewer**: Read + Edit +
Glob + Grep. It applies bilingual / RTL corrections in place but has no
Write or Bash — it edits existing files, it never creates or runs.

`root-cause-analyzer` is read-only **on the codebase** (no `Edit`) but
holds a single scoped `Write` for one purpose: emitting
`.claude/bug-state/diagnosis.md`. Without that grant the triad's
artifact handoff (stage 2 → stage 3) cannot complete — it is not a
read-only agent, it is a write-one-artifact agent.

## When to add a new agent

Add a new agent file when:
- A new vertical opens up (e.g. a healthcare pack)
- A new platform layer emerges (e.g. observability)
- A cross-cutting concern needs its own guard rail (e.g. a11y)

Don't add an agent for:
- A one-off task (just do it inline)
- A subset of an existing agent's surface (extend the existing one)
- A skill or external tool (those live in `~/.claude/`)
