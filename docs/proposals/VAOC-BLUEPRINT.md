# VAOC — Virtual Agent Orchestration Company (concept blueprint)

> Status: **concept, not a phase.** This is Anas's idea for a generalized
> protocol — a reusable "company of agents" infrastructure that can be pointed
> at any new system to help build it, not just H-Nerve. This doc compares what
> already exists in this repo against a real production example (Decasonic, a
> Web3×AI venture fund running its own firm on ~80 named agents) and lays out
> what's reusable vs. what's net-new work.

## 1. The idea in one line

A standing "virtual company" of specialized AI agents + a supervisor/orchestrator
+ a shared memory, that you can hand *any* new project to, and it helps
architect/build/QA it — the same way `lib/brain/` helps H-Nerve reason about
hotels/dairy/farms today, but generalized past one ERP.

## 2. Two reference implementations, side by side

| Concern | H-Nerve `lib/brain/` (this repo) | Decasonic AI Operating System (external, production) |
|---|---|---|
| Agent registry | `tools/index.ts` — 7 typed tools (pullFacts, causalSubgraph, simulate, councilDebate, recallMemory, retrieveDocuments, narrate) | ~80-agent roster, named + swappable by performance (e.g. "Emma" = networking concierge, "Edison" = AI analyst) |
| Orchestration pattern | `orchestrator.ts` — single LLM tool-loop (Supervisor pattern) | Agent networks per workflow (deal sourcing, due diligence, PM) — closer to Hierarchical/Network hybrid |
| Domain specialists | `agents/*.ts` — one file per vertical (Hospitality, Dairy, Agri, Finance, Risk) — pluggable via `AgentDef` interface | Modular specialization, agents "swapped" when a better one outperforms — explicit agent-vs-agent competition |
| Multi-agent debate | `council.ts` + `Moderator.ts` — specialists argue, moderator synthesizes | Not described in detail, but "AI Due Diligence" is explicitly multi-agent + human co-partnered |
| Memory / institutional knowledge | `memory.ts` — episodic recall of past situations; RAG layer (`documents.retrieve.ts`, `graphrag.ts`) | Decasonic Knowledge Repository (DKR) — human-curated first, now AI-fed; explicit "if an agent produced it, it needs receipts" (traceability rule) |
| Human boundary | **Read-mostly**: Brain proposes, never mutates domain data directly — all writes go through server actions | Humans keep "judgment, context, non-consensus perspective" — agents synthesize signals, humans decide |
| Exposure / portability | `mcp/server.ts` — same tools exposed over stdio MCP, tenant-scoped | Not public — internal tooling only |
| Self-improvement | `meta.ts` / `meta.reflector.ts` — Brain IQ score, weekly self-tuning | RL networks trained on expert + AI feedback |
| Maturity model | N/A (built directly to Phase 10) | Explicit 4-stage arc: **writing about AI → using AI → building AI → innovating AI** — useful as a narrative for *any* org adopting this, including a pitch deck |

**Takeaway:** the two systems independently converged on the same core shape —
typed agent registry + supervisor loop + specialist agents + shared memory +
a hard human-judgment boundary. That convergence is itself evidence this
pattern is real, not just an H-Nerve invention. That makes it a legitimate
foundation for a *generalized* protocol (VAOC), not a one-off.

## 3. What's already reusable as-is

- `lib/brain/tools/` + `orchestrator.ts` + `mcp/server.ts` — strip the H-Nerve-specific
  tools (pullFacts, causalSubgraph, etc.) and what's left is a working
  **registry + tool-loop + MCP-exposure skeleton**. This is the VAOC engine room.
- `agents/*.ts` `AgentDef` interface — the plug-in contract for a "worker agent."
  Generalizing this from "industry expert" to "engineering role" (architect,
  reviewer, tester, deployer) is a naming change, not a redesign.
- `docs/SYSTEM-BLUEPRINT.md` — already *is* a generalized "how to bootstrap any
  system" playbook (stack choices, layered architecture, security baseline,
  bootstrap checklist). This is the non-agent half of VAOC: the standards a
  VAOC-built system should be held to.
- `docs/BLUEPRINT.md` — the distilled agent-pattern doc, written explicitly to
  be lifted into someone else's app. Already written for portability.
- The read-mostly boundary rule — directly reusable as VAOC's core safety
  invariant: agents propose, a human (or a gated action) commits.

## 4. The Storm Research pattern — a reusable verification discipline

The global skill `storm-research-report` (`~/.claude/skills/storm-research-report/`,
template at `assets/report-template.html`) already encodes a discipline VAOC
needs generally, not just for research write-ups:

- **5 distinct-lens synthesis** (practitioner / academic / skeptic / economist
  / historian) — forces genuinely different angles instead of one agent's
  single take dressed up as five agreeing voices.
- **Every claim independently checked against its primary source before
  publication** — tracks fabricated / corrected / demoted counts explicitly
  and reports them in a verification banner, instead of hiding that the check
  happened at all.
- **Reliability scored 1-10 on an evidence-quality hierarchy** (peer-reviewed
  causal work > official data > single survey > analogy > preprint) — not on
  how interesting or confidently-worded the claim sounds.
- **Explicit safe / caveat / avoid triage** — stops a weak claim from quietly
  hardening into asserted fact later in the document.
- **A self-declared blind spot** (the "missing 6th lens") — a report that
  can't name what it didn't check hasn't actually stress-tested itself.

**Why this matters for VAOC:** any agent role whose output feeds a decision —
a research/analyst agent, a due-diligence agent, a spec-drafting agent — needs
this same discipline, not just the build-agents needing a human merge gate
(§7). Read/propose agents need a *verification* gate before their output is
trusted at all. Concretely, adopt Storm Research's three practices as a
standard VAOC agent contract clause:

1. every asserted fact carries a reliability score + a primary-source check;
2. a running fabricated/corrected/demoted count is reported, never hidden;
3. output is explicitly partitioned into safe/caveat/avoid before a human
   reads it, not left as one undifferentiated wall of assertions.

This also plugs the verification hole in gap #4 below — a spec-drafting agent
claiming "the API supports X" should be held to the same checked-before-published
bar as a research finding, not trusted on tone alone.

## 5. What's missing (real gaps, not polish)

1. **No agent-to-agent handoff.** Current orchestrator is single-supervisor only.
   Decasonic's model implies agent networks (Network/Hierarchical topologies
   from the orchestration diagram) — VAOC needs this if it's meant to
   coordinate multiple *builder* agents (architect → coder → reviewer → deployer)
   rather than one loop calling read-only tools.
2. **No competitive/performance-ranked agent swap.** Decasonic explicitly
   swaps underperforming agents. H-Nerve has no agent scoring/replacement
   loop — `meta.ts` scores the *system* (Brain IQ), not individual agents.
3. **No cross-project registry.** `lib/brain/` is wired to one Prisma schema,
   one tenant model. VAOC as "point it at any new system" needs the agent
   layer decoupled from any single app's data model — a standalone package,
   not a folder inside one repo.
4. **No build-time agents.** (See §4 for the verification gate these agents
   also need.) Everything in `lib/brain/` is *read-mostly
   reasoning about a running app*. VAOC as you're describing it also needs
   agents that *write code* (architect/implementer/reviewer roles) — a
   different trust boundary than "propose an insight." This is closer to
   what Claude Code's own subagents (`.claude/agents/*`) already do in this
   repo today — worth treating those as VAOC's first working prototype rather
   than starting from zero.

## 6. Recommended path (in order)

1. **Extract, don't rebuild.** Pull `tools/index.ts` + `orchestrator.ts` +
   `mcp/server.ts` into a standalone package (own repo or `packages/` folder).
   Strip H-Nerve tool implementations, keep the registry/loop/MCP shell.
2. **Rename the plug-in contract.** `AgentDef` (industry expert) →  generalize
   to a role-based contract (architect/reviewer/implementer/domain-expert),
   same interface shape.
3. **Add a second orchestration mode.** Keep single-supervisor for
   read/reason tasks; add a hierarchical/handoff mode for build tasks
   (matches the "Hierarchical" + "Supervisor (as tools)" patterns from the
   LangGraph diagram you shared).
4. **Treat `docs/SYSTEM-BLUEPRINT.md` as VAOC's constitution.** Any system
   VAOC stands up should be checked against it (stack, layering, security
   baseline) — this is the reusable "what good looks like" the agents build
   toward.
5. **Borrow the maturity narrative for the pitch.** Decasonic's
   writing→using→building→innovating arc is a strong, credible framing if
   VAOC is ever pitched externally — it's a real firm's public case study,
   not a hypothetical.

## 7. Readiness note — carry the same discipline as H-Nerve itself

H-Nerve's own external framing is **prototype, supervised pilot** — not
"production ERP replacement" (see `docs/phases/READINESS.md`). VAOC should get the
same honesty: it's an internal builder-accelerator, not an autonomous company
that ships unsupervised. Every agent that writes code still needs a human
merge gate — same "read-mostly / propose-not-mutate" boundary that governs
`lib/brain/` today should govern VAOC's build-agents too, just applied to code
changes instead of ERP data.
