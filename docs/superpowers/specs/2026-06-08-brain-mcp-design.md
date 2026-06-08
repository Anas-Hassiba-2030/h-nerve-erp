# Brain as MCP — Design Spec

- **Date:** 2026-06-08
- **Branch of origin:** `feat/brain-b1b-converse-graphrag`
- **Status:** Approved (brainstorming) → ready for implementation planning
- **Author:** Anas Hasiba + Claude

---

## 1. Context & current state

The H-Nerve "brain" (`lib/brain/`) is the product's differentiator: a causal graph,
a what-if simulator, a multi-agent council, a narrator, a planner, episodic memory,
a self-reflective meta layer, and a RAG layer (embeddings, retriever, GraphRAG, CRAG,
RAG eval/guard, document retrieval). Roughly 40 TypeScript files, with the pure cores
unit-tested.

Two facts about how it runs today shape this work:

- **The live path bypasses `Brain.ts`.** `Brain.ts` is a skeleton — `makeBrain()`
  returns `Proxy` stubs and composes nothing. The real conversational brain is
  `lib/brain/converse.ts`, called by `app/api/converse/route.ts`. Its `ask()` runs a
  **single-shot, hardcoded pipeline**: `pullFacts()` + `retrieveDocuments()` +
  `retrieveGraphContext()` → one `callLlm()` → answer. No step-by-step reasoning.
- **Consumption is in-process.** ~34 sites import `@/lib/brain/*` directly as
  TypeScript functions (server actions for council/plans/insights/narrate/iq/memory/
  graph, the dashboard, the theater director, client components, seed scripts).

`lib/brain/llm.ts` exposes `callLlm(req, stub)` — a **single** Anthropic Messages
call. It has **no tool-use support**, a per-process cost cap (`BRAIN_MAX_LLM_CALLS`,
default 200), a 20s timeout, a deterministic STUB fallback when `ANTHROPIC_API_KEY`
is absent, and an `extractJson()` helper.

## 2. Decision

"Replace the brain with an MCP" is implemented as **re-fronting, not rebuilding**.
Two gates, both confirmed with the user:

1. **Wrap the existing cores — do not delete them.** The graph, simulator, GraphRAG,
   CRAG, RAG layer, council, narrator, memory are the actual (tested) implementation.
   MCP tools call *into* them. "Replace" = replace the front door, not the engine.
2. **Two doors over one shared tool layer.** Brain capabilities become plain functions
   written **once**. An **in-app orchestrator** consumes them to reason step-by-step
   (the "thinking loop"); an **MCP server** exposes the *same* functions to outside
   clients (Claude Desktop, a pitch demo). The app never makes a protocol hop — it
   calls the functions directly. MCP is a thin transport on top.

Rejected alternative: a thin 1:1 MCP facade with no orchestrator. It yields the pitch
line ("our brain is an MCP") but leaves the in-app brain single-shot. The agreed prize
is the agentic loop, so the orchestrator is in scope.

Two micro-decisions, both approved:

- **Transport: stdio-first.** A local MCP server process, zero new deploy, works in
  Claude Desktop / Claude Code immediately. HTTP/SSE remote transport is deferred.
- **`Brain.ts` is retired.** The tool registry + orchestrator supersede the skeleton
  composition root.

## 3. Architecture — three layers

```
                         ┌─────────────────────────────┐
   in-app (no hop)  ───► │ Layer 2: Orchestrator        │
   /api/converse         │  LLM tool-use loop (LIVE)    │
                         │  single-shot pipeline (STUB) │
                         └──────────────┬──────────────┘
                                        │ calls
                         ┌──────────────▼──────────────┐
   external clients ───► │ Layer 1: Capability tools    │ ──► existing cores
   (Claude Desktop) ───► │  lib/brain/tools/*           │     (graph, simulator,
        via              │  typed Zod in/out, orgId     │      council, RAG, …)
   ┌──────────────┐      └─────────────────────────────┘
   │ Layer 3: MCP │             ▲
   │ stdio server │─────────────┘ registers the same tools
   └──────────────┘
```

The MCP server (Layer 3) and the orchestrator (Layer 2) both consume Layer 1. They
share the tool definitions; they do not call each other.

## 4. Layer 1 — Capability tools (`lib/brain/tools/`)

One file per "section." Each tool is a typed capability:

- A **name** and an LLM-facing **description** (what it does, when to call it).
- A **Zod input schema** (validates both orchestrator and MCP callers).
- A **structured output** (JSON-serializable — must cross the MCP boundary cleanly).
- A thin body that calls the existing core and shapes the result. No new algorithms.
- An explicit **`orgId`** (tenant scope) on every tool — load-bearing for the MCP door.

### Tool catalog

| Tool | Wraps (existing) | Input → Output |
|------|------------------|----------------|
| `causalSubgraph` | `graphrag.live.retrieveGraphContext` | `{ question, k?, topSeeds?, orgId }` → `{ nodes, links }` |
| `simulate` | `simulator.bfs.simulateOnSnapshot` + `graph.prisma.loadAll` | `{ nodeId, delta, orgId }` → ranked impacts |
| `councilDebate` | `council.live.convene` | `{ topic, subgraph?, orgId }` → `{ voices, synthesis }` |
| `recallMemory` | `memory.live.recall` | `{ situation, topK?, orgId }` → analogous memories |
| `retrieveDocuments` | `documents.retrieve` + `crag.evaluateRetrieval` + `ragGuard.sanitizeForPrompt` | `{ query, scope?, k?, locale?, orgId }` → graded, sanitized doc hits |
| `narrate` | `narrator.claude.write` | `{ facts, register, locale, topic, orgId }` → `{ text }` |
| `pullFacts` | `converse.pullFacts` (extracted) | `{ orgId }` → structured fact pack |

Deferred to v2 (lower call frequency, not needed for the converse loop):
`plan` (`planner.live`), `brainIQ` (`meta.reflector.computeIQ`).

`retrieveDocuments` keeps the CRAG grading and ragGuard sanitization **inside** the
tool, so every caller (orchestrator and external MCP clients alike) gets graded,
injection-sanitized hits by default — security can't be skipped by a caller.

## 5. Layer 2 — Orchestrator (`lib/brain/orchestrator.ts`)

Replaces the hardcoded pipeline inside `converse.ts`. `/api/converse` keeps its exact
contract — request `{ sessionId, question, scope?, locale? }`, response
`{ brainTurn, sessionTurns }` — so the conversational overlay UI is untouched.
`converse.ts` is reduced to the session store + the shared types + a thin `ask()` that
delegates to the orchestrator; the orchestrator owns all reasoning. `/api/converse`
keeps importing `ask` from `converse.ts`, so its import path is unchanged too.

Two modes, mirroring `llm.ts`:

- **LIVE (`ANTHROPIC_API_KEY` set): a bounded tool-use loop.** The model sees the
  Layer-1 tool catalog, calls tools (one or several rounds), receives their structured
  results, then writes the final grounded 3-sentence answer with `[c1]`-style
  citations. **Hard cap: ≤4 tool-call rounds per question** so one question cannot fan
  out unbounded (on top of the existing global `BRAIN_MAX_LLM_CALLS` cap).
- **STUB (no key): today's single-shot pipeline, preserved.** The deterministic path
  keeps its current behavior and zero cost — but is refactored to call the Layer-1
  tools (`pullFacts`, `retrieveDocuments`, `causalSubgraph`) instead of inline
  functions, so both modes share the tool layer. The demo experience does not regress.

**`llm.ts` change required.** `callLlm` is single-shot and cannot do tool-use. Add a
tool-calling capability for the LIVE loop. Implementation choice, to be settled in the
plan:

- **(A) Native Anthropic tool-use** — pass a `tools` array and handle `tool_use` /
  `tool_result` content blocks in a loop. Model-native, the honest "agentic" path.
  **Recommended target.**
- **(B) JSON-plan orchestration** — prompt the model to emit a JSON list of tool calls
  (reusing the existing `extractJson()`), execute, feed results back, loop. Works with
  the current `callLlm` shape; a lower-risk fallback if native tool-use integration is
  heavier than wanted.

Either way, the new capability lives behind the `llm.ts` seam and degrades to STUB on
no-key / error / timeout / cost-cap, exactly as `callLlm` does today.

## 6. Layer 3 — MCP server (`lib/brain/mcp/server.ts`)

An MCP server built on `@modelcontextprotocol/sdk` that registers the Layer-1 tools and
runs as a **separate entrypoint over stdio** (e.g. `npm run brain:mcp` →
`scripts/ops/brain-mcp.ts`). It imports `lib/brain/tools/*` and connects to the same
Postgres via the existing Prisma client. It is **not** wired into the Next.js request
path; it is a standalone process for external clients.

Each MCP tool registration maps 1:1 to a Layer-1 tool: same name, same Zod schema
(reused as the MCP input schema), same handler. Tool descriptions are written for an
external LLM that has no other context about H-Nerve.

## 7. Security & tenancy

The MCP door is the new risk surface — an external client must never read across
tenants.

- **Explicit `orgId` on every tool** (not an ambient cookie). The MCP server resolves
  `orgId` from an authenticated identity, never from untrusted tool input alone.
- **Authentication on the MCP server.** stdio launch carries a configured tenant/identity
  (env-provided) for v1; remote/HTTP transport (deferred) will need real per-request auth.
- **Reuse `ragGuard`** scope + prompt-injection redaction — already inside
  `retrieveDocuments`, so it applies to external callers automatically.
- **Rate limiting.** Mirror the `/api/converse` fixed-window limiter for the orchestrator
  path; the stdio MCP server inherits the global `BRAIN_MAX_LLM_CALLS` cap for any tool
  that calls the model (`councilDebate`, `narrate`).

No secrets, tokens, or model IDs are committed. `ANTHROPIC_API_KEY` stays in `.env`.

## 8. Scope

**In (v1):**
- Layer 1 capability tools (the catalog in §4, minus the v2-deferred two).
- Layer 2 orchestrator: LIVE tool-use loop + STUB single-shot, behind the existing
  `/api/converse` contract.
- The `llm.ts` tool-calling capability.
- Layer 3 stdio MCP server exposing the tools.
- Retire `Brain.ts`.
- Green gate: `npm run typecheck` + `npm test` (vitest) + `npm run lint`.

**Out (v1):**
- Migrating the other ~33 in-app consumers (council page, plans, insights, dashboard,
  theater, etc.) to route through the tool layer — they keep importing `lib/brain`
  directly, untouched.
- HTTP/SSE remote MCP transport (+ its per-request auth).
- Cron activation of the brain (separate concern; the loop unblocks it later).
- `plan` and `brainIQ` tools (v2).

## 9. Testing

- **Layer 1 tools** — thin contract tests per tool: valid input → expected output
  shape; bad input rejected by Zod; `orgId` scoping honored. The underlying cores are
  already unit-tested, so these stay light.
- **Layer 2 orchestrator** — with a mocked LLM seam: assert tool-selection drives the
  right tool calls in LIVE mode; assert STUB mode reproduces today's single-shot answer
  shape; assert the ≤4-round cap holds; assert degradation to STUB on error.
- **Layer 3 MCP** — a smoke test: server lists the registered tools and handles one
  `tools/call` end to end.
- Keep all new pure logic under `lib/**/*.test.ts` so `npm test` stays DB/network-free.

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Cross-tenant read via the MCP door | Explicit `orgId` per tool; server resolves it from auth, never trusts raw input; `ragGuard` scope reused. |
| Unbounded tool fan-out / cost | ≤4 tool-call rounds per question; global `BRAIN_MAX_LLM_CALLS` cap; per-user rate limit. |
| `/api/converse` contract drift breaks the overlay | Orchestrator preserves the exact request/response shape; covered by a contract test. |
| STUB demo regresses | STUB mode keeps today's deterministic single-shot path, now calling the tool layer; snapshot the answer shape in a test. |
| MCP output not serializable | Tool outputs are plain JSON-shaped objects; no class instances cross the boundary. |
| `llm.ts` tool-use integration heavier than expected | Fallback to JSON-plan orchestration (§5 option B) using the existing `extractJson()`. |

## 11. Future (not now)

- HTTP/SSE remote MCP transport with per-request auth → the brain reachable by remote
  clients, not only local stdio.
- Migrate in-app consumers onto the tool layer for one canonical call path.
- Turn on the cron brain using the orchestrator loop.
- `plan` and `brainIQ` tools.

## 12. File manifest

**New:**
- `lib/brain/tools/` — one file per tool (`causalSubgraph.ts`, `simulate.ts`,
  `councilDebate.ts`, `recallMemory.ts`, `retrieveDocuments.ts`, `narrate.ts`,
  `pullFacts.ts`) + an `index.ts` registry.
- `lib/brain/orchestrator.ts` — the thinking loop (LIVE) + single-shot (STUB).
- `lib/brain/mcp/server.ts` — the stdio MCP server.
- `scripts/ops/brain-mcp.ts` — the MCP entrypoint (+ an `npm run brain:mcp` script).
- Test files alongside each new pure module.

**Changed:**
- `lib/brain/llm.ts` — add the tool-calling capability behind the existing seam.
- `lib/brain/converse.ts` — reduced to the session store + shared types + a thin
  `ask()` that delegates to the orchestrator.

**Retired:**
- `lib/brain/Brain.ts` — superseded by the tool registry + orchestrator.

**Untouched:** the pure cores (`graph*`, `simulator*`, `graphrag*`, `crag`, `ragGuard`,
`documents.retrieve`, `narrator*`, `memory*`, `council*`, the `.test.ts` suite) and the
~33 existing in-app consumers.
