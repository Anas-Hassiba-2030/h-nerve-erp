# H-Nerve — Brain & Infrastructure Architecture Review

> **Author role:** Principal Systems Architect / Lead Full-Stack (BE · FE · UI/UX · AI).
> **Written:** 2026-06-06. **Mode:** brutal engineering honesty, code-grounded.
> **Scope:** the "Brain" (`lib/brain/`), its RAG layer, and the platform infra beneath it.
> **Method:** every claim below is read out of the actual source on branch
> `chore/readiness-pass-90`, not from `README`/marketing copy. Where the docs and the
> code disagree, the **code wins** and I say so.

> **⚠️ Assumption about the attached image (`image_f3adc7.jpg`):** I could not view the
> image in this session. From the (partially garbled) prompt text — "API contracts, ERD
> narrative, Bilingual Domain Glossary for Arabic/English RTL, [Data] Model, eval
> criteria" — I infer it is the **gap list from `docs/RE-INFRASTRUCTURE-PLAN.md` §3**.
> The whole of Part 3 is built on that inference. **If the image is something else, tell
> me and I'll re-scope.** Important up-front correction either way: most of that gap list
> has **already shipped** — see Part 3.0.

---

## Part 1 — Deconstructing "The Brain" and system logic

### 1.1 The actual RAG layers (what runs, not what's drawn)

The RAG stack is **real and complete** — 7 layers, all merged (#97–#107), all pure cores
unit-tested. This is the strongest part of the system and I want to be clear about that
before the criticism lands. Layers, bottom to top:

| # | Layer | File | What it actually does |
|---|---|---|---|
| 0 | **Embedding seam** | `embeddings.ts` | `getEmbedder()` → Gemini `gemini-embedding-001` (then OpenAI/Voyage) when a key is set; deterministic **local hash embedder** otherwise. Falls back to local on any API error. This is the seam everything semantic hangs off. |
| 1 | **Dense retrieval** | `retriever.ts` (pure) + `documents.retrieve.ts` (DB) | Embed query + items, rank by cosine. Tenant-scope-filtered. In-process cosine, **not** `pgvector` yet. |
| 2 | **Graph RAG** | `graphrag.ts` / `.live.ts` | HippoRAG-style Personalized PageRank over the causal graph (restart α=0.5, edge strength = \|weight\|×confidence) → relevant multi-hop subgraph. This is genuinely rare in ERP. |
| 3 | **Corrective RAG** | `crag.ts` | Grades retrieval Correct/Ambiguous/Incorrect from hit scores → use / blend-and-hedge / drop, plus a grounding-confidence multiplier. |
| 4 | **RAG eval** | `ragEval.ts` / `.live.ts` | Decomposed triad (context-relevance / faithfulness / answer-relevance) → rolls into `BrainIQ.ragQuality`. |
| 5 | **Retrieval security** | `ragGuard.ts` | `sanitizeForPrompt` neutralizes prompt-injection markers (en+ar), `enforceScope` (tenant defense-in-depth), `limitPerSource` (anti-dominance / corpus poisoning). |
| 6 | **Serialization** | `serialize.ts` | Renders prompt context as a Python literal (read more reliably by the model than JSON). |

**Verdict on Part 1.1:** the retrieval pipeline is legitimately well-architected and ahead
of most ERP products. No notes. The problems are *above* it, in orchestration.

### 1.2 How it processes / retrieves / synthesizes — the conversational path

The live "talk to the brain" path is `converse.ts → ask()`. Trace:

1. Append the user turn to an in-memory session (`SESSIONS` Map — see 2.2, this is a bug-class).
2. **In parallel:** `pullFacts()` (a *fixed-shape* batch of Prisma queries — top 6 insights,
   4 plans, 6 integrations, hotel/dairy/farm counts) **and** `retrieveDocuments()` (semantic
   doc retrieval via the embedding seam).
3. CRAG grades the doc hits; INCORRECT dropped, AMBIGUOUS hedged, CORRECT used.
4. `ragGuard.sanitizeForPrompt` cleans every snippet before it enters the prompt.
5. **LIVE mode** (prod, `ANTHROPIC_API_KEY` set): Claude gets the question + the fact pack +
   the approved, sanitized document snippets and **synthesizes its own 3-sentence answer
   with `[c1][c2]` citations.** **STUB mode** (no key): a deterministic keyword-routed
   template answer is returned instead.
6. Confidence + citations attached; turn stored.

So to be fair and precise: **in production this is genuine generative synthesis grounded on
real semantic retrieval**, not a canned template with LLM lipstick. The stub is the *fallback*.

**But three honest criticisms survive, and they are unrebuttable:**

- **Structured fact selection is heuristic.** `detectTopic()` is keyword/regex routing
  (`/dairy|milk|maha|.../`), and `pullFacts()` is a hardcoded query shape. Document
  retrieval is semantic; the *numeric/structured* grounding is not — it always pulls the
  same surfaces regardless of the question's true intent.
- **Base confidence is hardcoded per topic** (0.78 dairy, 0.74 hotels, 0.70 farms…), only
  nudged by CRAG. The number the UI underlines is mostly a constant, not a measured belief.
  (Scope this carefully — see 1.4; it does *not* apply to the narrator/verifier path.)
- **Business constants are inline magic numbers** — `activeBookings * 95` JOD ARR proxy,
  "78% seasonal target" — buried in `converse.ts`. These should be tenant config, not code.

### 1.3 Is it a "Brain" or a search tool? — the central finding

**Neither. It is more than search, less than the marketed brain: a set of genuinely
differentiated reasoning parts (causal graph, what-if simulator, multi-agent council,
semantic+graph RAG, episodic memory) that are NOT wired into a single reasoning loop.**

The evidence is in `Brain.ts` itself, the supposed "composition root":

- `makeBrain()` **returns `Proxy` stubs** for every subsystem (`const stub: any = new
  Proxy(...)`). The constructor args are dead. The class composes *nothing*.
- `ask()` routes each `BrainQuestion` kind to **exactly one subsystem + the narrator**:
  - `kind: "plan"` → does **not** call the planner. It narrates the goal string. The
    real planner (`planner.live.ts`, 483 lines) is never reached from here.
  - `kind: "explain"` → does **not** load the entity or its subgraph. It narrates
    `{entity, id}`.
  - `kind: "simulate"` → this one is real (loads graph snapshot, runs BFS propagation).
  - `kind: "council"` → real (convenes the live council).
- The `README`'s celebrated flow — *graph → simulator → memory → council → planner →
  narrator → feedback → meta*, all chained for one question — **does not execute anywhere.**
  It is aspirational documentation.

On top of that, there are **two unconnected "brain" entry points** that don't share
orchestration: `Brain.ts::ask()` (the typed router) and `converse.ts::ask()` (the
conversational RAG path). They were built at different phases and never unified.

**So the precise answer to "is it a brain":** the *organs* exist and several are excellent
(the causal graph + Graph RAG genuinely have no peer in commodity ERP). The *nervous system
that makes them think together* — a real orchestrator that retrieves, simulates, debates,
remembers, plans, and reflects in one loop — **is drawn but not built.** Today it behaves as
a very well-instrumented, RAG-grounded Q&A assistant with strong but disconnected scaffolding.

### 1.4 How to structurally make it a real brain (agentic-ready)

Scope note first, to be fair: the **Trust layer is real** — the verifier is wired into the
narrator, telemetry persists on `Narrative`, `ragEval.ts` is genuine, Phase 22 shipped. The
"confidence is fake" criticism applies **only to the conversational path**, not globally.

Structural upgrades, in dependency order:

1. **Make `Brain.ts` the true orchestrator.** Delete the `Proxy` stub. Have `ask()` actually
   compose subsystems: `plan` calls `planner.live`, `explain` loads the subgraph + memory +
   narrator. Collapse `converse.ts::ask` to call `Brain.ask` so there is **one** brain entry
   point, one trace, one citation model.
2. **Replace heuristic fact-selection with a retrieval planner.** `detectTopic` + fixed
   `pullFacts` → a small "router agent" that decides *which* structured queries + which
   retrievers (docs, graph, memory) a given question needs. This is the step from RAG to
   **agentic RAG**.
3. **Compute confidence, don't declare it.** Derive the conversational confidence from
   `ragEval` faithfulness + CRAG grade + citation coverage — the machinery already exists,
   it's just not feeding the conversational number.
4. **Persist the reasoning trace.** `BrainTrace` is returned but discarded. Persist it
   (a `BrainTrace`/`ReasoningStep` table) so meta-reflection (Phase 10) and feedback (Phase 7)
   have real episodes to learn from — today the self-tuning loop is partly starved.
5. **Close the agentic loop safely.** Keep the read-mostly boundary (it is the correct
   reliability control — compound error in agentic chains is real). Add a *typed proposal*
   object the brain emits and a human approves, which then calls the existing server actions.
   That turns "brain proposes" from prose into an executable, auditable contract.
6. **Externalize tenant business constants** (ARR proxy, occupancy targets) to config so the
   brain's numbers are real per tenant, not Hourani-hardcoded.

---

## Part 2 — Infrastructure & foundation check

### 2.1 Is the foundation solid, logical, legitimate?

**Mostly yes for a sophisticated prototype; no for a multi-tenant agent platform at scale.**
The bones are good and intentionally minimal — and that minimalism is a feature, not a flaw:

- **Good:** App Router with 4 clean route-group boundaries; server-actions-as-default with a
  documented `app/api/` exception list; Prisma `prismaSchemaFolder` split one file per pillar
  (20 schema files); `lib/` fully domain-organized (27 pillars, zero root files); cookie
  iron-session auth; string-unions-over-enums (portable SQLite↔Postgres); soft-delete;
  bilingual/RTL throughout; **600+ unit tests green, lint/types/build green.** This is a
  disciplined codebase, not a hack pile.

The structural problems are concentrated and **systemic, not cosmetic**:

### 2.2 What a panel of senior engineers would flag (ranked, with file evidence)

**🔴 Blocker class — horizontal scale (this is one disease with several symptoms):**

1. **No DB connection pooling.** Railway PG is a direct connection; Prisma's default pool
   exhausts. Per the AUDIT: safe at 10–15 concurrent users, **breaks at 100–200.** Fix =
   Prisma Accelerate or a PgBouncer sidecar. *This is the single hardest cap on growth.*
2. **In-memory state that can't survive >1 replica.** `converse.ts` stores sessions in a
   process-local `SESSIONS = new Map()` (comment even admits "Production would persist
   these"), and the realtime presence store is likewise in-memory — which is exactly why the
   AUDIT pins `numReplicas = 1`. **Same root cause:** the app holds request-spanning state in
   process memory, so it physically cannot scale out. Conversations are also lost on every
   deploy/restart. Fix = move both to Redis (or a Postgres `ConverseSession` table).
3. **Dashboard query fan-out.** ~22 queries per `force-dynamic` dashboard load, uncached.
   Mitigated partially (`take:` limits added in #194) but not cached. Couples with #1.

**🟠 Reliability / correctness:**

4. **Self-tuning brain is dormant in prod.** `/api/brain/cron` exists but Railway has no
   built-in cron, so Phase 10 weekly reflection **never fires.** The "learns over time" claim
   is currently false in production. Fix = Railway cron service or external scheduler with
   `CRON_SECRET`.
5. **`pgvector` not used.** Retrieval is in-process cosine — fine now, won't hold as
   documents/memories grow. Re-embed-on-provider-switch is also an open foot-gun.
6. **`Brain.ts` dead composition root** (1.3) — actively misleading to any new engineer.

**🟡 Test & quality coverage:**

7. **Zero component/integration tests.** 600+ tests are all `lib/**` pure-unit + a 30-test
   API smoke floor. **No `app/`/`components/` tests** — the entire UI, server actions, and
   auth flows are unverified by CI. For an agent platform this is the scariest gap after
   scale, because the read-mostly→server-action boundary is exactly where a regression does
   real damage.

**🟡 Security / ops:**

8. **Exposed secrets need rotation** — Anthropic/Gemini/DB-URL/session keys appeared in
   screenshots. Rotate before any wider exposure. (Already in the AUDIT — do it.)
9. **Threat model exists but is doc-only** (`docs/spec/THREAT-MODEL.md`) — the federation
   corpus-poisoning surface and the RAG injection surface are documented; verify the controls
   (`ragGuard`, `enforceScope`) are actually exercised by tests (they have unit tests — good;
   no end-to-end adversarial test — gap).

**Net:** the foundation is legitimate and unusually clean for its stage, but it has a **hard
horizontal-scale ceiling** (items 1–3 are the same systemic issue) and a **UI/integration
test blind spot** that together would stop a serious engineering panel from calling it
production-grade for a multi-tenant agentic platform. None of it requires a rebuild.

---

## Part 3 — The phased hardening plan

### 3.0 Validating the image's gap list — and the big correction

If my inference about the image is right (the RE-INFRA §3 gap list), then **yes, every item
on it is genuinely crucial** — API contracts, ERD/data-model rules, bilingual glossary, ADRs,
test strategy, threat model are exactly the docs that stop a team re-deriving context and
"cracking" later. **But here is the correction you need:**

**Most of that list already shipped.** `docs/spec/` exists today (#88, #89) and contains:

| Spec doc | Status |
|---|---|
| `DATA-MODEL.md` (ERD, 72 models, invariants, isolation) | ✅ shipped |
| `API-CONTRACTS.md` (~150 server actions + 26 routes) | ✅ shipped |
| `GLOSSARY.md` (locked Arabic/English per term) | ✅ shipped |
| `ADRS.md` (9 immutable decisions) | ✅ shipped |
| `TEST-STRATEGY.md` | ✅ shipped |
| `THREAT-MODEL.md` | ✅ shipped |
| **PRD** (per capability, testable acceptance criteria, non-goals) | ⏳ **the one real gap** — needs *your* product intent, can't be derived from code |

So the doc-gap work is ~85% done. The remaining doc gap is the **PRD**, and it requires a
working session with you (acceptance criteria + non-goals are product decisions, not
code-derivable). Don't let the image make you re-generate what exists — **verify, then move on
to the engineering hardening, which is where the real risk now lives.**

### 3.1 Will hardening harm momentum? No — if sequenced right.

The hardening below is mostly **additive and behaviour-preserving** (pooling, Redis, tests,
cron). It does not block feature work and each phase is independently shippable as its own PR.
The one item that touches feature code (unifying the two brain entry points, H2) is the only
one needing care — it gets its own isolated phase.

### 3.2 The phases (sequential, reconciled with the existing AUDIT roadmap)

I am **not** inventing a competing roadmap. This re-orders and sharpens the AUDIT's existing
P1/P2/P3 + Phase 29 around the findings above.

**Decision (2026-06-06, Anas):** the **Brain is the priority**, not infra. Scale is
**parked** (10–15 concurrent users is fine until after the pitch / payment). The PRD is
**parked** (not needed for brain work; revisit when a team joins or a big new feature wave
starts). The phases below are therefore re-scoped to be **100% brain-focused** and to fix
**every brain weak point** (A–H) raised in Part 1, mapped 1:1.

The Brain must become the "smart employee" that does three things — **look things up,
reason, remember & learn** — plus be honest about how sure it is. Each phase targets one.

**Phase B1 — Put the manager in the chair → fixes REASONING (weak points A, B, C)**
- Delete the `Brain.ts` `Proxy` stub; make `ask()` genuinely compose subsystems.
- Make `plan`/`explain` call the real planner/graph instead of just narrating.
- Collapse `converse.ts::ask` onto `Brain.ask` → **one** entry point, one trace, one
  citation model.
- **Exit criterion:** one question exercises graph→memory→council→planner→narrator in a
  single traced call. *This is the phase that makes it a brain, not a search box.*

> **B1a status — LANDED (branch `feat/brain-b1-orchestrator`, 2026-06-06):**
> Proxy stub removed; `makeBrain()` returns a real `Brain`. `explain` now loads the real
> causal neighbourhood (`graphNodeId` + `causalGraph().neighbors`) and cites it; `plan` now
> drafts a real ordered plan via a new **non-persisting** `draftPlanFromGoal()` (read-mostly
> preserved — no DB write on an ask); `simulate` node-id resolution bug fixed centrally
> (`graphNodeId` matches the seeder's `bn_<kind>_<refId>`); every kind now emits a real
> `trace.steps` (the substrate B3 learns from). Green gate: tsc clean, **706/706** tests,
> lint clean; runtime-verified in stub mode. **Discovery:** `Brain.ask`/`makeBrain` had
> **zero callers** — it was a dead contract; live surfaces call subsystems directly.
> **B1b (deferred, own PR):** route the live brain surfaces + `converse.ts` through
> `Brain.ask` so users hit the composed reasoning (touches the chat/Trust contract — needs
> care). B1a makes the substrate real, tested, and honest first.

**Phase B2 — Teach it what to look up → fixes LOOK-UP (weak point D)**
- Replace `detectTopic()` keyword/regex routing + the fixed-shape `pullFacts()` with a small
  retrieval-planner step that decides *which* structured queries + which retrievers (docs,
  graph, memory) a given question actually needs (agentic RAG).
- **Exit criterion:** two differently-worded questions on the same topic pull different,
  appropriate fact sets — not the same hardcoded bundle.

**Phase B3 — Real memory & learning → fixes REMEMBER-&-LEARN (weak points F, G)**
- Persist `BrainTrace` (a `ReasoningStep`/`BrainTrace` table) so feedback (Phase 7) and meta
  (Phase 10) have real episodes to learn from.
- Wire the dormant self-tuning cron (Railway cron / external scheduler + `CRON_SECRET`) so
  weekly reflection actually fires in prod.
- **Exit criterion:** a week of usage measurably moves a brain weight / IQ input.

**Phase B4 — Make it honest → fixes TRUST (weak points E, H)**
- Compute conversational confidence from `ragEval` faithfulness + CRAG grade + citation
  coverage instead of the hardcoded per-topic constants.
- Externalize tenant business constants (ARR proxy, occupancy target) to config.
- **Exit criterion:** the displayed confidence changes when the underlying evidence changes.

**Coverage:** B1–B4 fix **every brain weak point A–H**, 1:1. Nothing brain-related is left out.

**Parked by decision (visible, not forgotten):**
- *Scale* (pooling, Redis sessions/presence, `pgvector`, dashboard cache) — revisit
  post-pitch / post-payment.
- *PRD* — revisit when a team joins or a new feature wave starts.
- *Untested screens* (component/integration tests) — the one non-brain risk; fine for now,
  worth a small pass before the real pitch.

### 3.3 One-line priority call

**B1 first.** Wiring the organs into one reasoning loop is what turns "great parts" into "a
brain." Everything else compounds on top of it.

---

## Appendix — confidence in this report

- **High confidence** (read directly from source): the `Brain.ts` Proxy/router finding, the
  `converse.ts` LIVE-vs-stub flow, hardcoded confidence constants, in-memory `SESSIONS`, the
  `docs/spec/` set already existing, the RAG layer composition.
- **Medium confidence** (from `docs/AUDIT-2026-06.md`, not independently load-tested):
  the 100–200 user pooling ceiling, the dormant cron, the test-coverage counts.
- **Inferred, flagged for your confirmation:** the contents of `image_f3adc7.jpg`.
