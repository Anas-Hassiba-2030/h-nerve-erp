# H-Nerve — Re-Infrastructure Plan & Strategic Memory

> **Status:** strategic handoff document. Written 2026-06-02 for the upcoming
> "re-infrastructure the right way" working session.
> **Purpose:** this is the *non-parametric memory* for the rebuild. Everything
> Anas and Claude agreed on lives here so a fresh session (or a new engineer)
> can execute without re-deriving context. When we rebuild, we generate the
> execution prompts **from this file** plus the spec set it defines.

---

## 0. Why this document exists (the core principle)

A chat session is **parametric memory** — opaque, drifting, gone when the
session ends. Documents in the repo are **non-parametric memory** —
inspectable, durable, and any engineer or fresh AI session can pick them up.
(This is the exact lesson from the RAG book analysis below.)

**The agreed "right way" to rebuild:**
1. **Documents are the source of truth, not the chat session.**
2. **A fresh session executing against tight specs beats a long session
   carrying everything in its head** (long sessions suffer context rot — we
   saw it: the #83 squash race that dropped commits).
3. **Do NOT rebuild from zero.** There is a working, deployed system with 414
   passing tests and months of fixes. Instead:
   - **Derive the specs FROM the working code** (accurate, not aspirational).
   - Then **refactor / harden / rebuild module-by-module, one PR per module**,
     in focused fresh sessions, using the current system as the reference for
     "what it must still do."
4. **The session is just the worker; the documents are the asset.**

---

## 1. The re-infrastructure session plan (what to do in ~4 hours)

When Anas returns to "re-infrastructure the system the right way," the plan is:

1. **Generate the `docs/spec/` set** (see §3). Start with the two highest-value,
   least-ambiguous, auto-derivable docs:
   - **Data Model / ERD** — derived from `prisma/schema.prisma`.
   - **API / Server-Action contract catalog** — derived from every
     `app/(app)/<resource>/actions.ts` and `app/api/**/route.ts`.
2. Scaffold the **PRD template + ADR records + bilingual glossary** for Anas to
   fill product intent into.
3. Layer in the **RAG re-architecture** (see §2) as a set of ADRs + a phased
   plan, since the brain's retrieval layer is the biggest structural upgrade.
4. From the finished spec set, **generate per-module execution prompts** for
   fresh sessions ("build module X against `docs/spec/...`").

The bet (Anas's words): *"It's not going to take a lot of time since you have
the files and the full picture — we're just going to generate the prompts."*
That bet only pays off if the spec set in §3 is complete first.

---

## 2. RAG re-architecture — how Retrieval-Augmented Generation improves H-Nerve

Source: full read of the RAG textbook (24 chapters) cross-referenced against
`lib/brain/`. The brain is already a "compound AI system"; what's missing is
**true non-parametric retrieval over the company's own knowledge.** Today the
narrator works from a hand-assembled `facts` payload (`narrator.ts`), never
reading the company's documents — that is exactly the "private data" gap the
book names as the #1 enterprise motivation for RAG.

**Prioritized roadmap (impact ÷ effort):**

| Pri | Upgrade | Book ch | H-Nerve touch-point | Effort |
|----|---|---|---|---|
| 1 | ✅ **DONE (RAG-1, #97)** — **real embeddings + dense cosine** for Memory (pluggable embedder seam in `lib/brain/embeddings.ts`; recall scores dense vectors, legacy bag-of-words rows still work). Native `pgvector` column is the remaining scale step. | 5, 6 | `memory.live.ts`, `Memory.vectorJson` | Low |
| 2 | ✅ **DONE (RAG-2-tail #107)** — **Python-dict serialization**. `serialize.ts` `toPyLiteral` renders prompt context (subgraph, facts, documents) as a Python literal (True/False/None, single-quoted) instead of JSON; wired into `llm.ts` `serializeUser` — the single chokepoint for every brain prompt. | 14.7 | `serialize.ts` / `llm.ts` | Very low |
| 3 | ✅ **DONE (RAG-2 #99 + RAG-3 #101)** — **document retrieval** into the conversational brain *and* the council. RAG-2: `retriever.ts` (pure core) + `documents.retrieve.ts` (DB-backed, scope-filtered) → `converse.ts` cites real clauses. RAG-3: the council retrieves topic-relevant docs into every agent's context (`docHitsToContext`, locale-aware snippets) and each voice cites them as evidence (`withDocumentEvidence`). Seeded a demo corpus. **Next: extend into the narrator's standalone editorial path.** | 1, 3 | `Document` → `retriever.ts` / `documents.retrieve.ts` / `agents/base.ts` / `council.live.ts` | Medium |
| 4 | ✅ **DONE (RAG-4 #103)** — **Graph RAG** over the causal graph. `graphrag.ts` = pure HippoRAG-style Personalized PageRank (restart α=0.5, multi-hop, edge strength = \|weight\|×confidence) + subgraph induction; `graphrag.live.ts` seeds PPR from query-matched nodes (embedding seam) and renders the relevant nodes + causal links into the council's agent context. **Next: GraphRAG community summaries for global sensemaking.** | 14 | `graphrag.ts` / `graphrag.live.ts` / `council.live.ts` | Medium–High |
| 5 | ✅ **DONE (RAG-5 #104)** — **CRAG retrieval evaluator + fallback**. `crag.ts` grades retrieval Correct/Ambiguous/Incorrect from hit scores and decides use/blend/drop + a grounding-confidence multiplier. Wired into `converse.ts` (drops irrelevant docs, hedges ambiguous ones, lowers confidence) and `council.live.ts` (only relevant docs become agent evidence). | 11 | `crag.ts` / `converse.ts` / `council.live.ts` | Medium |
| 6 | ✅ **DONE (RAG-6 #105)** — **decomposed RAG eval**. `ragEval.ts` = pure triad (context-relevance / faithfulness / answer-relevance + weighted aggregate); `ragEval.live.ts` rolls persisted narrative trust telemetry into a fleet RAG-quality score, reported on `BrainIQ.ragQuality` (the pinned headline `score` formula in `meta.iq.ts` is untouched). | 21 | `ragEval.ts` / `ragEval.live.ts` / `meta.reflector.ts` | Medium |
| 7 | ✅ **DONE (RAG-7 #106)** — **retrieval security**. `ragGuard.ts`: `sanitizeForPrompt` neutralizes indirect prompt-injection markers (en+ar) in retrieved text before it enters a prompt; `enforceScope` (tenant defense-in-depth) + `limitPerSource` (anti-dominance / corpus poisoning). Wired into `docHitsToContext` + `converse.ts` so every uploaded snippet is sanitized at the prompt chokepoint. | 23 | `ragGuard.ts` / `documents.retrieve.ts` / `converse.ts` | Medium |

**✅ RAG roadmap COMPLETE — all 7 steps done (#97, #99, #101, #103, #104, #105, #106, #107).** Remaining upside is operational, not architectural: set a real embedding key (`VOYAGE_API_KEY`/`OPENAI_API_KEY`) so retrieval is fully semantic, run `seed-brain-local.ts` in prod so the causal graph is populated, and (later, at scale) move the in-process cosine to a native `pgvector` column.

**Key alignments we already have (don't rebuild — extend):**
- **Phase 22 Trust Layer = RAG faithfulness/groundedness** (Ch 21) and
  **Self-RAG's `IsSup` token** (Ch 11). The verifier + confidence scorer are
  ahead of the curve here.
- **Causal graph = a knowledge graph** → Graph RAG (Ch 14) is a *direct* match.
  Almost no ERP has this; it's the differentiator.
- **Council = multi-agent / Corrective RAG** (Ch 16). Moderator = the
  supervisor/reflection gate. Give each industry-pack expert a retriever tool.
- **Memory = CoALA episodic memory**; causal graph + docs = semantic; feedback/
  meta = procedural; `BrainContext` = working. Time Machine `as-of` cursor maps
  naturally to **bi-temporal** tracking (Zep/Graphiti, Ch 16.4).

**Book cautions to honor:**
- "RAG for facts, finetuning for form" — H-Nerve's gap is *facts*, so RAG first;
  the bilingual editorial voice is *form* (finetune much later, if ever).
- Don't stuff everything into long context ("lost-in-the-middle"); retrieval
  scales sub-linearly.
- Compound error in agentic loops (95%/step → 60% over 10 steps) → keep
  human-in-the-loop for write actions. The brain's **read-mostly boundary
  already enforces this** — preserve it.
- "Reliability is architectural, not a model property" — the read-mostly +
  Moderator-as-supervisor design is exactly right; lean into it.

---

## 3. The document set engineers/developers need to build without coming back

**The test for "done":** *if a competent engineer who never met Anas read this,
would they make the same call he would — or guess?* If they'd guess, it has a gap.

Best practice = a layered spec stack, in-repo, reviewed in PRs, each with an
owner + last-updated date, linking rather than duplicating.

### Tier 1 — Product & Scope (WHAT/WHY)
1. **Vision / Product Brief** (1 page) — problem, user, the one differentiator, success.
2. **PRD** (per capability) — user stories with **testable acceptance criteria**
   (Given/When/Then), **explicit non-goals**, edge cases, success metrics. *The
   single doc that prevents ~80% of mid-build questions.*
3. **Roadmap / Phasing** — ✅ have it (`PHASES-INTELLIGENCE.md`).

### Tier 2 — Domain & Data (LANGUAGE/SHAPE)
4. **Domain Glossary / Ubiquitous Language** — every term once, **bilingual
   (Arabic/English) with locked translations** (uniquely high rework source here).
5. **Data Model / ERD** — entities, fields, relationships, **invariants**,
   lifecycle (soft-delete, tenancy keys, string-enums). Schema exists; the
   *rules* aren't written down.

### Tier 3 — Architecture & Contracts (HOW)
6. **System Architecture / Tech Design** — partly in `CLAUDE.md` + `BLUEPRINT.md`.
7. **ADRs (Architecture Decision Records)** — one immutable record per decision
   (why iron-session not NextAuth; why string columns not enums; why read-mostly
   brain). Currently *scattered inside* `CLAUDE.md` — extract as numbered records.
8. **API & Interface Contracts** — every server action + `app/api/` route:
   input schema, output, errors, auth/role. **Biggest gap.**
9. **Design System / UI Spec** — ✅ have it (`DESIGN-SKILL.md`), strong.

### Tier 4 — Quality, Security, Ops (GUARANTEES)
10. **Test Strategy & Definition of Done** — coverage, test pyramid, PR gate.
11. **Security & Threat Model** — authn/authz, tenancy isolation, brain/RAG
    attack surface (corpus poisoning for federation), compliance. Partly
    `ISOLATION.md`.
12. **Runbook / Deployment / Ops** — ✅ have them (`RUNBOOK.md`, `DEPLOYMENT.md`,
    `phases/READINESS.md`).
13. **Developer Onboarding (day-1 setup)** — partly `CLAUDE.md` + `.env.example`.

### Gap summary — what to generate in the re-infra session
**Have (strong):** roadmap, design system, partial architecture, ops/deploy,
git workflow, tenancy rules.
**Missing (the "comes back to ask" gaps), in priority order:**
1. **PRD with testable acceptance criteria + non-goals** (#1 interruption source)
2. **API / Server-Action contract catalog** (biggest technical gap)
3. **Data Model / ERD narrative**
4. **Bilingual Domain Glossary** (critical for the RTL/Arabic stack)
5. **ADRs** extracted as immutable records
6. **Test Strategy + Definition of Done**
7. **Security / Threat Model** (esp. brain + federation)

### Cross-cutting best practices
- Single source of truth per concern — link, never duplicate (duplicates drift → cause questions).
- Docs live in the repo, reviewed in the same PR as the code they describe.
- A **Decision Log** so settled questions never reopen.
- Acceptance criteria are executable (Given/When/Then) — they double as the test spec.
- Every doc: owner + last-updated date.
- **Write the non-goals** — most "should we also…?" interruptions die here.

---

## 4. Quick reference — what already exists

| Concern | File(s) |
|---|---|
| Conventions / architecture guide | `CLAUDE.md` |
| Design language | `docs/governance/DESIGN-SKILL.md` |
| Phase roadmap | `docs/governance/PHASES-INTELLIGENCE.md` |
| Brain architecture | `docs/governance/BLUEPRINT.md`, `lib/brain/README.md`, `lib/brain/Brain.ts` |
| Multi-tenancy rules | `docs/architecture/ISOLATION.md` |
| Git workflow (bilingual) | `docs/ops/GITHUB-WORKFLOW.md` |
| Ops / deploy | `docs/ops/RUNBOOK.md`, `docs/ops/DEPLOYMENT.md`, `docs/phases/READINESS.md` |
| Operating protocol (plain language) | `docs/governance/OPERATING-PROTOCOL.md` |
| Polish/bug backlog | `docs/governance/PHASES-INTELLIGENCE.md` § Phase 26 |

When the re-infra session starts: read this file, then generate `docs/spec/`
(ERD + API catalog first), then build module-by-module against it.
