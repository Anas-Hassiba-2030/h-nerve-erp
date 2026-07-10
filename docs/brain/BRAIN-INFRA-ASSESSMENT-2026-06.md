# H-Nerve — Brain & Infrastructure Assessment

owner: Anas Hasiba
last-updated: 2026-06-07

> ⚠️ **DATED POINT-IN-TIME ASSESSMENT (2026-06-07).** Several findings below
> have since been fixed: the stub `Brain.ts` was **retired** (PR #240,
> merged 2026-06-11) in favor of the wired tool-loop
> (`src/lib/brain/tools/` + `orchestrator.ts` + stdio MCP server); the cron
> workflow was committed; the docintel parser gained a real Claude Vision path;
> and `/api/converse` gained per-user rate limiting + an LLM call cap. For the
> current state see **`docs/status/STATUS.md`**.

> **Author:** Principal Systems Architect review (backend / frontend / UI-UX / AI systems).
> **Date:** 2026-06-07. **Method:** every claim below is grounded in the actual code
> (`lib/brain/*`, `app/api/*`, `prisma/schema/*`, `middleware.ts`) and the existing
> spec set, not in the marketing narrative. Where the repo's own docs disagree with
> the code, that is called out as drift.
> **Companion docs:** `docs/governance/RE-INFRASTRUCTURE-PLAN.md` (strategy + 13-doc gap analysis),
> `docs/spec/*` (the spec stack), `docs/status/AUDIT-2026-06.md` (health + backlog).

---

## 0. The one-paragraph verdict (read this first)

The system is **green, live, and genuinely above-average** for an ERP: a real
retrieval stack (CRAG + Graph RAG + injection-guard, all unit-tested), a
75-model schema split cleanly by pillar, middleware-enforced multi-tenant
isolation, and 600 passing tests. **It will not "crack" tomorrow.** But three
things are true that the screenshot does *not* say:

1. **The screenshot is stale.** Six of its seven "missing" documents already
   exist under `docs/spec/` (generated 2026-06-02, derived from code). The *one*
   real documentation gap left is the **PRD + executable acceptance criteria**,
   which needs your product intent.
2. **The "Brain" is not yet a brain.** What runs on a live question is a
   competent **single-shot RAG answerer** (`converse.ts`). The grand
   orchestrator (`Brain.ts`) and its 9-step composition is **scaffolding +
   per-question-kind routing** — and the conversational surface bypasses it
   entirely. There is no agentic loop, no learning write-back, and the weekly
   self-tuning cron is **not firing in production.**
3. **The real structural risks are operational, not documentary** — unmetered
   AI endpoints (cost/abuse), in-memory conversation state that won't survive
   scale, and `Float`-typed money in a finance system.

None of this requires a rebuild. `docs/governance/RE-INFRASTRUCTURE-PLAN.md` already made
that call ("don't rebuild from zero — derive specs from working code, harden
module-by-module"), and this assessment agrees. What follows is **targeted
hardening**, sequenced so it runs *alongside* feature work, not instead of it.

---

# Part 1 — Deconstructing the Brain & the RAG logic

## 1.1 The RAG layers (what is actually implemented)

H-Nerve's retrieval is a **7-layer compound system**, all 7 layers shipped
(`RE-INFRASTRUCTURE-PLAN.md` §2 marks RAG-1…RAG-7 complete, PRs #97–#107). Mapped
to files:

| Layer | Role | File(s) | Pure / Live |
|---|---|---|---|
| **Embedding seam** | `getEmbedder()` → Gemini `gemini-embedding-001` → OpenAI → Voyage → deterministic local hash fallback | `embeddings.ts` | seam (pure + network) |
| **Dense retriever** | embed query + items, rank by cosine (`rankByRelevance`) | `retriever.ts` | pure |
| **Document retrieval** | DB-backed semantic search over `Document` + clauses, scope-filtered | `documents.retrieve.ts` | live (DB) |
| **Graph RAG** | HippoRAG-style Personalized PageRank over the **causal graph** → relevant multi-hop subgraph + signed causal links | `graphrag.ts` / `graphrag.live.ts` | pure core + live |
| **Corrective RAG (CRAG)** | grade retrieval Correct / Ambiguous / Incorrect → keep / hedge / drop + grounding-confidence multiplier | `crag.ts` | pure |
| **Retrieval security** | neutralize prompt-injection markers (ar+en) in retrieved text; tenant scope + anti-dominance | `ragGuard.ts` | pure |
| **RAG eval** | decomposed triad (context-relevance / faithfulness / answer-relevance) → `BrainIQ.ragQuality` | `ragEval.ts` / `ragEval.live.ts` | pure core + live |
| *(plumbing)* | render prompt context as a Python literal (read more accurately than JSON) | `serialize.ts` | pure |

**This is the genuinely strong part of the system.** Graph RAG over a causal
graph is a real differentiator — almost no ERP has it. And the pure cores are
**unit-tested** (`crag.test.ts`, `graphrag.test.ts`, `ragEval.test.ts`,
`ragGuard.test.ts`, `retriever.test.ts`, `serialize.test.ts`, `ragPipeline.test.ts`,
…). Retrieval quality is the part you should trust most.

## 1.2 How a question is processed end-to-end

The live path is `app/api/converse/route.ts` → `lib/brain/converse.ts → ask()`.
Exact sequence:

1. **Auth + validate** (route): `getCurrentUser()` → 401 if absent; JSON guard
   (400); `sessionId`/`question` required (400); `question` capped at 800 chars
   (413). *(No zod, no rate limit — see Part 2.)*
2. **Retrieve — three sources in parallel** (`converse.ts:463`):
   - `pullFacts()` — **hand-assembled** structured pulls from Prisma (open
     insights, draft/active plans, integrations, hotel/dairy/farm counts). This
     is *not* semantic; it is a fixed fact pack.
   - `retrieveDocuments()` — **semantic** doc retrieval (k=3, minScore 0.08),
     scope-filtered. The RAG "retrieve" stage.
   - `retrieveGraphContext()` — **Graph RAG** subgraph (PPR from query-matched
     seeds) → related entities + signed causal links. Degrades to empty on an
     unseeded graph.
3. **Grade (CRAG)** — `evaluateRetrieval(docHits)`: drops INCORRECT docs, hedges
   AMBIGUOUS, keeps CORRECT, emits a grounding-confidence multiplier.
4. **Guard** — `sanitizeForPrompt()` strips injection markers from every snippet
   *before* it enters the prompt.
5. **Augment + serialize** — approved docs become drill-through citations + a
   compact quoted context block; `serialize.ts` renders it as a Python literal.
6. **Generate** — `callLlm(...)` with a stub fallback. **LIVE** (prod:
   `ANTHROPIC_API_KEY` set) = Claude, "answer in exactly 3 sentences, cite with
   `[c1] [c2]`, never invent numbers." **STUB** (no key) = deterministic
   keyword-topic generator (`detectTopic` → templated bilingual answer).
7. **Post-ground (stub only)** — appends one real document clause + the single
   strongest causal link, so retrieval is visible end-to-end even with no LLM.
8. **Confidence** — adjusted down when leaning on ambiguous retrieval.
9. **Eval (telemetry, offline)** — `ragEval` triad rolls into `BrainIQ.ragQuality`.

## 1.3 Is it a true "Brain" — or a search tool?

**It is more than a search tool, and less than a brain. Today it is a reliable,
well-guarded single-shot RAG answerer wearing the *architecture* of a brain.**

Evidence it is **more than search**: CRAG grading, multi-hop causal Graph RAG,
prompt-injection sanitization, first-class citations, calibrated confidence,
bilingual generation. That is a real compound-AI retrieval system.

Evidence it is **not yet a brain**:

- **Single-shot.** One retrieval pass, one generation. No
  retrieve→reason→retrieve loop, no query decomposition, no tool-calling.
- **Read-only with no learning write-back.** A conversation never writes an
  episode to `memory.live`; the feedback loop is not closed on this path.
- **It bypasses its own orchestrator.** `converse.ts` does **not** import
  `Brain.ts`. The README's 9-step flow (graph→simulator→memory→council→planner→
  narrator→feedback→meta) **never executes on a live question.**
- **`Brain.ts` is a composition root that doesn't compose.** `ask()` routes each
  question-*kind* to **one or two** live subsystems (e.g. `explain` = narrator
  only, with a hard-coded `confidence: 0.82`; `plan` = narrator only — it never
  calls the planner). `makeBrain()` returns a `Proxy` **stub**. It is harmless
  now (because `ask()` dynamic-imports the `.live` modules directly), but the
  composition root is not real.
- **The repo's own docs are stale here** — `docs/phases/READINESS.md:37` and
  `docs/phases/PITCH-WALKTHROUGH.md:111` still claim *"Brain.ask not yet wired / throws"*,
  which the current `Brain.ts` contradicts. **This drift is itself the
  argument** for enforcing specs (Part 3).
- **The learning loop is inert in prod.** `/api/brain/cron` (daily/weekly
  self-tuning) was a Vercel cron; Railway has no built-in cron, so it **isn't
  firing** (`AUDIT-2026-06.md` §3 P2). The "tunes itself weekly" claim is
  currently off.

## 1.4 How to make it an actual Brain (architecturally)

The goal is **agentic reasoning over reads, with writes kept human-in-the-loop**
— this is non-negotiable, and `RE-INFRASTRUCTURE-PLAN.md` §2 is explicit about
why: compound error in agentic loops (95%/step → ~60% over 10 steps) means an
autonomous write-agent is a liability. Preserve the read-mostly boundary.

1. **One composition root.** Either route `converse.ts` *through* `Brain.ts`, or
   formally designate `converse` the conversational entry and have **it** compose
   subsystems. Kill the duality. Delete or finish `makeBrain()`'s stub.
2. **An agentic READ loop.** Let the brain (a) plan a retrieval strategy, (b)
   call retrieval / simulator / council / graphrag as **tools** via LLM
   tool-calling, (c) observe, (d) decide whether one more hop is warranted, then
   answer — with a **hard hop cap** (compound-error discipline).
3. **Close the learning loop.** Write conversation episodes → `memory.live`; wire
   `feedback` → `meta`; and **actually fire the cron** (Railway cron service or
   external scheduler hitting `/api/brain/cron` with `CRON_SECRET`). Without this,
   "it learns" is aspirational.
4. **Verify before shipping an answer.** Put `verifier.ts` / `confidence` in the
   loop as a faithfulness gate (Self-RAG "IsSup") so an ungrounded answer is
   caught before it returns.
5. **Writes stay proposals.** The brain emits `BrainAction`s that map to existing
   server actions; the user commits. Never let the loop mutate domain data.

---

# Part 2 — Infrastructure & foundation check

## 2.1 What is genuinely solid (credit where due)

- **Schema.** ~75 models across 18 pillar-split `prisma/schema/*.prisma` files
  (Prisma `prismaSchemaFolder`), Postgres in prod, **141 `@@index`/`@@unique`**.
  Clean separation, sane indexing density.
- **Tenancy.** Dual isolation (company-keyed + tenant-keyed) enforced by Prisma
  `$use` middleware over a **pure, unit-tested** decision function
  (`workspaceScope.ts`). Documented in `docs/spec/DATA-MODEL.md` §2 and
  `docs/architecture/ISOLATION.md`.
- **Auth.** iron-session signed cookies, bcrypt, role gate re-checked in both
  `(app)` and `(admin)` layouts; `isSafeId()` rejects malformed IDs.
- **Retrieval cores tested** (see Part 1.1). The brain's hardest logic has the
  best coverage.
- **Spec stack exists** (`docs/spec/*`), code-derived, owned, dated.
- **CI is real** — typecheck + tests on every PR; 600 tests green; clean
  `next build`.

## 2.2 What an expert panel would flag (the real gaps)

Ordered by **risk × likelihood**, not by how easy they are to say:

| # | Gap | Why it bites | Evidence |
|---|---|---|---|
| **A** | **AI endpoints are unmetered.** No rate limit, no per-tenant quota, no cost ceiling on `/api/converse` or `/api/tts`. | Each authed call can hit Claude. One script (or one bug) = unbounded spend. `middleware.ts` rate-limits **only** `/login`, and its `matcher` **excludes `/api/`** entirely. | `middleware.ts:47,90`; `converse/route.ts` (auth only) |
| **B** | **Conversation state is an in-memory `Map`.** Process-global, not persisted, **not bound to userId/tenant**. | (1) Won't survive multi-instance scale or a restart. (2) Sessions keyed by a client-supplied `sessionId` with no user binding. | `converse.ts:70` `const SESSIONS = new Map(...)` |
| **C** | **Money is `Float`.** Finance/P&L/margins stored as `Float`/`Int`, no `Decimal`. | Float rounding errors accumulate — unacceptable in an ERP ledger. | `docs/spec/DATA-MODEL.md` §1 ("no Decimal type in use") |
| **D** | **`prismaUnscoped` sprawl.** 164 call sites across 53 files. | Each is a potential cross-tenant leak. Many are legit (admin/empire/workspace/cron) but the set is too large to eyeball. | grep: 164 occurrences |
| **E** | **No guard test for tenant-scoping.** A new tenant-keyed model can be added *uncovered* and silently leak. | The system's top risk (cross-tenant leak) has no automated backstop. | **Your own** `THREAT-MODEL.md` §3.1 says "Add a guard test." |
| **F** | **Test pyramid is bottom-only.** Strong unit coverage; **no** integration / E2E / API-contract tests. Nothing asserts the converse route, the ~150 server-action auth gates, or end-to-end isolation at the HTTP layer. | Unit-green ≠ system-correct. | `lib/**/*.test.ts` only; no route/E2E suite |
| **G** | **CI gate is partial.** `ci.yml` runs typecheck + tests but **not** `lint` and **not** `next build`. | "Green gate" has holes; lint/build regressions can merge. | `AUDIT-2026-06.md` §3 P2 |
| **H** | **Self-tuning cron inert in prod.** `/api/brain/cron` not firing on Railway. | The learning loop is off; "Brain IQ" trends don't update. | `AUDIT-2026-06.md` §3 P2 |
| **I** | **Validation inconsistency.** Server actions use zod (documented contract); API routes (e.g. converse) hand-roll `String(...)` coercion. | Drift from the stated contract; weaker input guarantees on the network edge. | `API-CONTRACTS.md` §2 vs `converse/route.ts:35` |
| **J** | **Referential actions incomplete.** 52 `onDelete` across ~75 models. | Some relations lack explicit cascade/restrict → orphan rows on delete. | grep: 52 `onDelete` |
| **—** | **Secret rotation** (already on your backlog) — keys shown in screenshots should be rotated. | Known; tracked. Do it, no lecture. | `AUDIT-2026-06.md` §3 P2 |

**UI/UX performance note:** the conversational overlay returns the full answer in
one POST and animates the reveal client-side (`converse/route.ts` header comment)
— fine for now, but with the agentic loop (Part 1.4) latency grows; budget for
**token streaming (SSE)** then, and a visible "thinking" state.

---

# Part 3 — The phased hardening plan

## 3.1 Validating the screenshot (brutal honesty)

The screenshot is an **excerpt of `RE-INFRASTRUCTURE-PLAN.md` §3** — and it
**predates `docs/spec/`** (generated 2026-06-02). Current status of its
"missing" list:

| Screenshot item | Real status today |
|---|---|
| 1. PRD + testable acceptance criteria | ❌ **Still missing — the one real gap.** `docs/spec/README.md` marks PRD "⏳ needs product intent (do with Anas)." |
| 2. API / Server-Action contract catalog | ✅ **Exists** — `docs/spec/API-CONTRACTS.md` (code-derived). |
| 3. Data Model / ERD narrative | ✅ **Exists** — `docs/spec/DATA-MODEL.md`. |
| 4. Bilingual domain glossary | ✅ **Exists** — `docs/spec/GLOSSARY.md`. |
| 5. ADRs as immutable records | ✅ **Exists** — `docs/spec/ADRS.md` (9 records). |
| 6. Test Strategy + Definition of Done | ✅ **Exists** — `docs/spec/TEST-STRATEGY.md`. |
| 7. Security / Threat Model | ✅ **Exists** — `docs/spec/THREAT-MODEL.md`. |

**So: are these points crucial? Yes — and you already acted on six of them.** The
honest correction is that the work is ~85% done on *paper*. The two things the
screenshot is *right* about that remain open: **the PRD/acceptance-criteria
gap**, and the cross-cutting best practice it lists last — **specs must be
enforced (reviewed in the same PR, never allowed to drift).** The stale
`docs/phases/READINESS.md` "Brain.ask not yet wired" line is live proof that **existence ≠
enforcement.** That is the real Part-3 work, plus the architectural gaps the
screenshot never mentions (Part 2.2).

## 3.2 "Will this harm our momentum?" — No, if sequenced like this

Every phase below is tagged **Effort**, **Disruption**, and **Parallel-safe?**
(can it run *alongside* feature work, or does it need a focused pause). The
proof that the answer is "no" is **Phase 0**: it retires the worst risks in days,
surgically, with zero feature freeze.

## 3.3 The phases

### Phase 0 — Stop the bleeding *(Effort: S · Disruption: low · Parallel-safe: ✅)*
The cheap, high-risk-retiring fixes. Do first.
- **Rate-limit + per-tenant cost ceiling** on `/api/converse` and `/api/tts`.
  Reuse `lib/import/rateLimit.ts` (token bucket already in the repo). *(Gap A)*
- **Bind conversation sessions to `userId` + tenant**; reject a foreign
  `sessionId`. *(Gap B, security half)*
- **Add the tenant-scoping guard test** your own threat model asks for: assert
  every tenant-keyed model is in a scoped set. *(Gap E)*
- **Finish the CI gate**: add `lint` + a `next build` step (Postgres service
  container). *(Gap G)*
- **Exit criteria:** converse endpoint returns 429 under load; a foreign session
  id is rejected; CI fails on an unscoped new model.

### Phase 1 — Close + enforce the spec set *(Effort: M · Disruption: low · Parallel-safe: ✅, needs Anas for PRDs)*
Finish the screenshot, properly.
- **Write PRDs** for the 2–3 highest-value capabilities (brain/converse, finance,
  dairy-expiry) with **executable Given/When/Then** acceptance criteria + explicit
  **non-goals**. *(Gap: screenshot #1)*
- **Spec-drift CI gate**: a check that flags schema/route changes not reflected in
  `DATA-MODEL.md` / `API-CONTRACTS.md`; require spec edits in the same PR. Fix the
  stale `docs/phases/READINESS.md`/`docs/phases/PITCH-WALKTHROUGH.md` Brain lines as the first drift
  caught.
- **Decision Log discipline:** keep appending `ADRS.md`; a settled question never
  re-opens.
- **Exit criteria:** the acceptance criteria from the PRDs are pasted in as
  pending tests (they become Phase 3's spec).

### Phase 2 — Data & contract integrity *(Effort: M–L · Disruption: medium · Parallel-safe: ⚠️ finance migration needs a focused slot)*
- **Money correctness:** migrate finance `Float` → `Decimal` (or integer minor
  units). Schema migration + format-at-edge change. *(Gap C — do this before the
  finance module grows.)*
- **`prismaUnscoped` audit + lint guard:** require a `// CROSS-TENANT INTENT:`
  comment at every site; CI fails otherwise. Triage the 164. *(Gap D)*
- **zod-everywhere on API routes**, starting with `/api/converse`, to match the
  documented contract. *(Gap I)*
- **Fill `onDelete`** on the remaining relations. *(Gap J)*
- **Exit criteria:** no `Float` in finance models; every `prismaUnscoped` is
  commented + justified; converse route validates with zod.

### Phase 3 — Verification harness *(Effort: M · Disruption: low · Parallel-safe: ✅)*
Prove the system, not just the units.
- **API-contract + auth-gate tests** for the 26 routes and the server-action
  auth gates. *(Gap F)*
- **One end-to-end isolation test:** tenant A cannot read tenant B via *any*
  surface.
- **Wire a RAG-eval threshold in CI** (`ragEval` exists) to catch silent
  degradation (e.g. a prod fallback to hash-mode embeddings).
- **Turn Phase 1's acceptance criteria into executable tests** — close the
  PRD↔test loop.
- **Exit criteria:** Definition of Done = unit + contract + one E2E isolation
  test, all gating PRs.

### Phase 4 — Persist & scale the brain's state *(Effort: M · Disruption: medium · Parallel-safe: ✅)*
- **Move `SESSIONS` Map → a `ConverseSession` Prisma table** (the code comment
  already anticipates it), tenant-scoped. Unlocks multi-instance scale, history,
  and audit. *(Gap B, scale half)*
- **Persist brain traces** for replay/XAI.
- **Fire `/api/brain/cron`** on Railway (cron service or external scheduler +
  `CRON_SECRET`). *(Gap H — turns the learning loop on.)*
- **Exit criteria:** a restart/2nd instance preserves conversations; the IQ
  trend updates on schedule.

### Phase 5 — Elevate the Brain into an agentic (read) brain *(Effort: L · Disruption: medium · Parallel-safe: ⚠️ design-gated; do last)*
The differentiator. Depends on 0–4 being solid.
- **Unify the composition root** (Part 1.4 #1).
- **Agentic read loop with tool-calling + a hard hop cap** (#2).
- **Memory write-back + feedback→meta wired** (#3).
- **Verifier-in-the-loop faithfulness gate** (#4).
- **Writes stay human-in-the-loop proposals** (#5) — preserve the read-mostly
  boundary `RE-INFRASTRUCTURE-PLAN.md` insists on.
- **Add answer-token streaming (SSE)** since loop latency rises.
- **Exit criteria:** a hard question triggers ≥2 grounded retrieval hops, a
  verifier gate, a written episode, and an answer whose every claim is cited —
  through **one** orchestrator.

---

## Sequencing summary

```
Phase 0  Stop the bleeding        ── days,  parallel-safe ── DO NOW
Phase 1  Close + enforce specs    ── weeks, parallel-safe ── needs Anas (PRDs)
Phase 2  Data & contract integrity── weeks, focused slot for finance migration
Phase 3  Verification harness     ── weeks, parallel-safe
Phase 4  Persist & scale state    ── weeks, parallel-safe
Phase 5  Agentic read-brain       ── the differentiator, last, design-gated
```

**Bottom line:** you are not staring at a system about to crack. You are staring
at a strong retrieval system, a half-built brain, and a documentation effort
that is nearly finished but not yet *enforced*. Harden in this order and the
foundation carries the weight — while the team keeps shipping features.
