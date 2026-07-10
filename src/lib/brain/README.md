# lib/brain/ — the H-Nerve intelligence layer

> **The file to reference when asking to "improve the brain":** `lib/brain/Brain.ts`
> **The phase plan:** `docs/governance/PHASES-INTELLIGENCE.md`
> **The design language:** `docs/governance/DESIGN-SKILL.md`

---

## What this is

The Brain is the central nervous system of H-Nerve ERP. It is **not** a chatbot bolted onto a dashboard. It is the substrate every screen, every decision, and every outcome runs through.

It exists to answer one question better than any tool on the market:

> *"What should we do, why, and what happens if we do it?"*

---

## Architecture at a glance

```
                                ┌─────────────────────────┐
                                │   Brain.ts (conductor)  │
                                └────────────┬────────────┘
                                             │
   ┌──────────┬──────────┬──────────┼──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼          ▼          ▼
graph.ts  simulator   council    narrator   planner   memory    feedback   meta.ts
   │       what-if   multi-     editorial  insights  episodic  training   self-
   │       propag-   agent      voice      → action  recall    signal     tuning
causal      ation    debate                 plans    & analogy  loop
graph
```

| Subsystem        | File                  | Phase | What it does                                                                |
|------------------|-----------------------|-------|------------------------------------------------------------------------------|
| **Conductor**    | `Brain.ts`            | —     | Single entry point. Routes questions, composes subsystems.                    |
| **Causal graph** | `graph.ts`            | 1     | Every entity is a node; edges are causal weights. Substrate for everything.   |
| **Simulator**    | `simulator.ts`        | 2     | What-if propagation over the graph. Powers scenario UI + counterfactuals.    |
| **Council**      | `council.ts`          | 3     | Multi-agent panel debates a decision; moderator synthesizes.                  |
| **Narrator**     | `narrator.ts`         | 4     | Turns structured findings into editorial prose. Bilingual. 3 registers.       |
| **Planner**      | `planner.ts`          | 5     | Insight → ordered action plan with owners, deadlines, rollback condition.    |
| **Memory**       | `memory.ts`           | 6     | Long-term episodic memory. Vector recall of analogous past situations.       |
| **Feedback**     | `feedback.ts`         | 7     | Every dismiss/override/abandon becomes training signal. Reweights the brain. |
| **Federation**   | (Phase 8)             | 8     | Cross-tenant anonymized pattern learning. The SaaS moat.                     |
| **Meta**         | `meta.ts`             | 10    | Self-reflection. Rewrites the brain's own weights. Owns the Brain IQ score.  |

---

## How a question flows through the brain

```ts
const ctx: BrainContext = { orgId, userId, locale, now, industryPacks };
const answer = await brain.ask(ctx, {
  kind: "simulate",
  perturbation: { entity: "Hotel", id: "arena-1", field: "occupancy", to: 0.3 }
});
```

1. **Brain.ask** receives the question and routes it.
2. **graph** loads the relevant subgraph (Arena → Maha demand → Loran feed → Finance).
3. **simulator** propagates the perturbation; produces `ImpactRow[]`.
4. **memory** is queried for analogous past occupancy drops.
5. **council** is convened on the topic with the subgraph + memory hits.
6. **planner** drafts a candidate plan from the council recommendation.
7. **narrator** writes the editorial answer in the user's locale.
8. **feedback** records the response so the next user reaction trains the brain.
9. **meta** later reads this trace during weekly self-reflection.

Every answer carries:
- `summary` — 1-line headline (Heritage Modern display register)
- `narrative` — editorial paragraph
- `confidence` — 0..1
- `citations` — every claim is sourced
- `actions` — optional next steps (server-actionable)
- `trace` — full XAI breakdown (which agent said what, edge weights used)

---

## Design language for brain UIs

The brain has its own UI surfaces (Decision Theater, Brain Inspector, Self-tuning Reports, IQ Dashboard). They use **Heritage Modern** as the canonical aesthetic but lean harder into editorial typography because brain output is reading-heavy:

- Display register: Fraunces / Reem Kufi at editorial sizes
- Body register: IBM Plex Sans Arabic / Inter Tight at 14-16px, 1.55-1.65 leading
- Maximum measure: 65ch on narrative blocks
- Mono: JetBrains Mono for confidence scores, traces, IQ values
- Animations: see `docs/governance/DESIGN-SKILL.md` §4 — every reveal eases with `--ease-out-expo`

See `docs/governance/DESIGN-SKILL.md` for the full design language.

---

## Multi-tenant & industry-pack rules

H-Nerve is a generic ERP intelligence platform. The Brain is **industry-agnostic** at its core — graph, simulator, narrator, planner, memory, feedback, meta all work for any vertical.

Domain knowledge lives in **industry packs** under `lib/brain/agents/`:
- `agents/HospitalityExpert.ts` — only loads when org has HOSPITALITY pack enabled
- `agents/DairyExpert.ts` — only when DAIRY pack is enabled
- `agents/AgriExpert.ts`, `EduExpert.ts`, etc.

To stand up a new vertical (manufacturing, logistics, healthcare): add a pack file, register the agents, ship.

---

## What lives outside the brain

The Brain is read-mostly. It does **not** mutate domain data directly. Mutations always go through the existing server actions in `app/(app)/<resource>/actions.ts`. The Brain proposes; the user (or the rules engine) commits.

This boundary keeps the Brain auditable, replayable, and safely sandboxed for self-tuning.

---

## Reading order for new contributors

1. This README.
2. `docs/governance/PHASES-INTELLIGENCE.md` — the 20-phase plan.
3. `docs/governance/DESIGN-SKILL.md` — the design language.
4. `Brain.ts` — the contract.
5. The subsystem you're working on.
