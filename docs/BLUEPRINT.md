# The Brain Pattern — a portable intelligence layer for any ERP

This document describes a reusable architecture, not a product. Any team
running **Next.js (App Router) + Prisma** can lift the `lib/brain/`
directory into their own app and have a reasoning layer that sits *beneath*
every screen — explaining the business, debating decisions, planning
actions, and learning from outcomes — without ever owning the data.

## What the Brain is

A **read-mostly** intelligence layer over an existing CRUD application. It
reads your domain rows, reasons about them, and *proposes*. It does not
replace your forms, your tables, or your database of record. You bolt it on;
you do not rebuild around it.

## The six-file core

The layer is six conductors. Each is small and generic; the heavy lifting
lives in a sibling `.live.ts` / `.claude.ts` file so the core stays readable.

| File | Role |
|------|------|
| `graph` | Causal graph. Every entity is a **node**; every relationship is a **weighted edge**. |
| `simulator` | What-if propagation. Perturb one node, watch the impact ripple outward. |
| `council` | Multi-agent debate. Specialists argue; a moderator synthesizes a recommendation. |
| `narrator` | Turns numbers into editorial prose (bilingual, multiple registers). |
| `planner` | Turns an insight into an ordered, human-committable action plan. |
| `memory` | Episodic recall of analogous past situations to ground new decisions. |

The rest of the app talks to the layer through a **typed tool registry** plus an
**orchestrator tool-loop** (the old single `Brain.ts` composition root has been
retired); the same tools are exposed over a stdio MCP server. A question routes
to the right subsystem and returns an answer.

## The agent-pack pattern

Domain expertise is **not** in the core. It lives in `agents/*.ts` — one file
per expert (a hospitality expert, a dairy expert, a finance brain, a risk
officer…). The engines (graph, simulator, council) know only an `AgentDef`
interface; they never hard-code an industry rule.

This is what makes the layer portable. To support a new vertical you **add an
agent file and register it** — you touch no engine code. The generic
machinery stays put; the knowledge is pluggable.

## The read-mostly boundary (the rule that keeps it safe)

> The Brain **proposes**; it never **mutates** domain data.

Every write the Brain makes targets a **brain-owned** table — graph
nodes/edges, council transcripts, plans, memories, feedback, self-tuning
history. A real-world change (create a purchase order, update a booking) goes
through the app's existing **server actions**, exactly as a human-clicked
button would.

Why this matters:

- **Auditable** — every proposal is a logged record, not a silent write.
- **Replayable** — re-run a council from its stored votes; re-simulate from
  stored edges.
- **Safe to self-tune** — the Brain can rewrite its own edge weights weekly
  without any risk to your books.

Enforce it in CI with one grep: no
`prisma.<domainModel>.(create|update|delete|upsert)` may appear inside
`lib/brain/`.

## The stub / live toggle

One environment variable controls everything. With `ANTHROPIC_API_KEY`
**empty**, every subsystem runs its **deterministic stub** — coherent canned
personas, rule-based propagation, fixed prose. Set the key and the `.live`
path calls the model instead. There is **no code change and no feature flag
to plumb**: each subsystem checks for the key at call time and picks its path.

The payoff: tests, demos, and CI run at **zero cost and full determinism**;
production gets real reasoning by adding a secret.

## The causal-graph schema

Two tables carry the whole graph.

```
Node  { id, kind, refId, label, payload(JSON), importance }
Edge  { fromId, toId, kind, weight(0..1), confidence(0..1) }
```

`kind` is the entity type, `refId` points back to the domain row, `label` is
the human-readable name, `payload` carries the metrics that matter.
`weight` is the strength of causal influence; `confidence` is how sure we are
of that link.

Propagation is one formula. A perturbation `Δ` on a source node flows to each
neighbour as:

```
Δ_next = Δ × weight × confidence × attenuation^hop
```

…pruned below a noise floor and keeping the largest-magnitude delta per node.
That single line yields both the **% impact** on each downstream entity and,
multiplied by the node's own metric, the **currency impact**.

## Adding a new industry agent — complete example

```ts
// lib/brain/agents/AgriExpert.ts
import type { AgentDef } from "./base";

export const AgriExpert: AgentDef = {
  id: "agri-expert",
  speakerLabelAr: "خبير الزراعة",
  speakerLabelEn: "Agriculture Expert",
  systemPrompt: `You sit on the council as an agronomist. You reason about
crop cycles, irrigation, yield risk, and seasonality. Be concrete; surface
the trade-offs the others will miss.`,
  // Prompt sent to the model in live mode:
  buildUserPrompt: (input) =>
    `Topic: "${input.topic}"\nContext: ${input.context.summary}\n` +
    `State your position in one paragraph with up to 3 evidence items.`,
  // Deterministic fallback used whenever ANTHROPIC_API_KEY is empty:
  stubVoice: (input) => ({
    position: "support", // support | oppose | qualify | moderate
    thesis:
      input.locale === "ar"
        ? "العائد يتحسّن مع الري بالتنقيط؛ أوصي بتوسيع الدفيئات تدريجيًا."
        : "Yield improves with drip irrigation; I recommend a phased greenhouse expansion.",
    evidence: [{ ref: "yield", label: "Drip irrigation → +18% yield", weight: 0.8 }],
  }),
};
```

Register it once:

```ts
// lib/brain/agents/index.ts
export const SPECIALIST_AGENTS = [
  HospitalityExpert, DairyExpert, AgriExpert, FinanceBrain, RiskOfficer,
];
```

The council now convenes your new expert automatically — bilingual, in both
stub and live modes, with the moderator synthesizing last. **No engine code
changed.**

## Porting checklist

1. Copy `lib/brain/` into your app.
2. Write a `graph.prisma` builder that reads *your* entities into Node/Edge rows.
3. Write one agent file per domain expert and register them in `agents/index.ts`.
4. Add the Prisma models: `Node`, `Edge`, plus the brain-state tables you use.
5. Leave `ANTHROPIC_API_KEY` empty until you are ready — the layer works in
   stub mode from day one.

The result is an intelligence layer that is generic in its engines, pluggable
in its knowledge, safe by its boundary, and free until you switch it on.
