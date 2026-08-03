# VOAC — the runtime agent company

owner: Anas Hasiba
last-updated: 2026-08-03
status: **foundation shipped** (substrate + topology + budget + roles). No LLM
execution driver yet — that is deliberate, see §7.

> **Do not confuse this with [`VAOC.md`](VAOC.md).** That is the **build-time**
> company: 31 Claude Code subagents in 7 departments that write this codebase.
> This document is the **runtime** company: agents that live inside the product
> and reason about the Hourani Group's operations. They share one substrate on
> purpose (§3). Two documents, two lifetimes, one primitive.

---

## 1. What it is

Every Hourani operating company — hotels, المها (dairy), لوران (feed),
education, finance — gets a **roster** of role agents. Above all of them sits
**one** supervisor: the **Group Broker**, which finds value that falls between
two companies and that no single general manager can see.

The agents propose. A named human commits. Nothing else.

## 2. The reshape — what the council killed and why

This design was pressure-tested by a 5-persona adversarial council before a
line was written. Verdict: **RESHAPE**, and two structural things died.

**Dead: the per-company supervisor.** The original sketch gave every company a
supervisor over its own roster. A supervisor placed over agents that share a
company has **neither information nor authority its subordinates lack** — it
can only summarise and pass through, costing a hop and adding a place for the
answer to degrade. The Group Broker survives because it is the one layer that
genuinely holds both: the cross-company view, and the standing to arbitrate
between two companies' P&Ls. `roles.test.ts` asserts there is exactly one
supervisor, so this cannot be quietly reintroduced.

**Dead: an uncapped proposal queue.** "Agents propose, humans commit" sounds
like a safety rail. It is also the most likely failure mode: five companies ×
role teams produces a firehose aimed at a handful of managers whose real
constraint is attention, not ideas. Two outcomes, both fatal — they ignore the
queue (and it reads as low engagement rather than wrong product), or they
rubber-stamp it (and you have shipped autonomous mutation with a human fig
leaf). So **precision is the product and recall is a liability**:
`VoacRoster.dailyProposalCap` is a hard ceiling, and `budget.ts` ranks on
expected value and reports everything it held back.

**Kept and sharpened:** every proposal, decision, and *realized outcome* is a
row. That is the only non-circular reward signal in the system, and therefore
the only thing worth training on (§6).

## 3. One substrate, not three org charts

The build-time company, the brain council, and the VOAC are the same primitive:

```
role → skill document → AgentRun → AgentStep → score
```

Adding a third parallel agent architecture would make the codebase unreadable
within a session. `prisma/schema/voac.prisma` is written so the build-time
agents can be folded onto the same tables later — which is why `companyId` is
nullable and is a plain String rather than a Prisma relation: the substrate
must be able to record runs belonging to no `Company` at all.

## 4. The two keys

| Key | What it is | Why |
|---|---|---|
| `tenantId` | `Tenant.slug` — the opaque isolation column | Non-negotiable per [`ISOLATION.md`](ISOLATION.md). All four models are registered in `TENANT_SCOPED_MODELS`. |
| `companyId` | `Company.id` — whose VOAC this is | `NULL` = the Group Broker. That null is load-bearing. |

These two coordinate systems already met once in this codebase, in
`COMPANY_CODE_TO_TENANT_SLUG` / [`src/lib/supply/bridge.ts`](../src/lib/supply/bridge.ts).
VOAC reuses that seam rather than inventing a second one.

Isolation matters more here than almost anywhere else in the app: an
`AgentStep.output` contains reasoning quoted from that tenant's own contracts
and ledger, so a scoping bug leaks the source data, not merely metadata.

## 5. The six topologies

From Anthropic's *Building Effective Agents* taxonomy, implemented as a pure,
fully-tested selector in [`topology.ts`](../src/lib/voac/topology.ts):

| Topology | Fires when | Max hops |
|---|---|---|
| `chain` | step N consumes step N−1's output (a *real* dependency) | 4 |
| `route` | one specialist can answer — **the default** | 2 |
| `parallel` | independent + known up front, **or** competing objectives | 2 |
| `orchestrate` | independent but only discoverable at runtime | 3 |
| `evaluate` | output can be graded and revised | 6 |
| `autonomous` | no stopping condition — **requires human opt-in** | 12 |

Two disciplines are enforced in code, not in prose:

- **The fallback is the cheapest pattern, not the most powerful.** Reaching for
  an orchestrator by default turns a two-call task into an eight-call task that
  is no more correct.
- **Every topology has a hop ceiling.** ~95% reliability per step is ~60% over
  ten steps, so no chain may grow unbounded. A refused run is a row with
  status `REFUSED`, never a silent exception.

Cross-company brokerage always uses `parallel` — two P&Ls *is* the definition
of competing objectives, and one voice should not decide quietly for both.

## 6. SkillOpt — offline, and honest about it

Each role's instructions live in a real markdown file under
[`src/lib/voac/skills/`](../src/lib/voac/skills/), because a markdown skill
document is exactly what [Microsoft SkillOpt](https://github.com/microsoft/SkillOpt)
trains: it runs scored rollouts, has an optimizer model propose bounded
add/delete/replace edits, and accepts a candidate **only when it strictly
improves a held-out validation score**. Instructions living in TypeScript string
literals would give it nothing to train.

The loop runs **offline in CI, never in the Worker** — SkillOpt is Python 3.10+
with a long-running train loop, and H-Nerve is Cloudflare Workers + D1. That is
the split SkillOpt itself intends: train locally, ship a static
`best_skill.md`, and pay **zero extra inference calls at request time**.

`scripts/build/build-voac-skills.mjs` compiles the `.md` files into
`skills.generated.ts` (the Worker has no filesystem at request time). The
content hash becomes `AgentRun.skillVersion`, so a score is always attributable
to the exact revision that produced it. Each document carries SkillOpt's
protected `SLOW_UPDATE` / `APPENDIX` regions; a test asserts they survive.

**Stated plainly: there is not enough signal to train on yet.** With one client
and one reviewer cohort there is no held-out distribution, so "the skill
improved" and "the skill overfit to one manager's taste" are not distinguishable
by construction. Until proposal volume and a second reviewer exist, the honest
use of this machinery is a **hand-curated regression suite** for prompt
hygiene — not training. Do not tell anyone the agents are self-improving yet.

## 7. What shipped, and what has not

**Shipped** (44 unit tests, 1124/1124 suite green, `tsc` clean, 0 lint errors):

| File | Role |
|---|---|
| `prisma/schema/voac.prisma` | `VoacRoster`, `AgentRun`, `AgentStep`, `AgentProposal` |
| `src/lib/voac/topology.ts` | the six patterns, selector, hop ceilings, cost estimate |
| `src/lib/voac/budget.ts` | proposal ranking + hard daily cap + suppression reasons |
| `src/lib/voac/roles.ts` | role registry, sector→roster, skill-doc binding |
| `src/lib/voac/runStore.ts` | pure core: run validation, roll-up, status transitions, decision guards |
| `src/lib/voac/runStore.live.ts` | thin DB twin — the only thing that writes rows |
| `src/lib/voac/skills/*.md` | 6 skill documents (5 sectors + Group Broker) |
| `scripts/build/build-voac-skills.mjs` | `.md` → runtime module |

Four rules the run store enforces that are easy to get wrong quietly:

- **A refused run is still a row** (`status: "REFUSED"`, reason in `error`), so
  "the agent declined" is answerable from the ledger instead of invisible.
- **Unscored steps are excluded from a run's mean score**, never counted as
  zero — "nobody graded this" must not read as "this was terrible".
- **A finished run never reopens.** Terminal is terminal; an audit trail that
  can be rewritten is not one.
- **A decision must name its owner** (`decidedById`), and an outcome can only
  be attached to an ACCEPTED proposal — otherwise the one non-circular signal
  in the system would be fabricated.

**Not shipped, on purpose:** the LLM execution driver. Every pure, testable
decision the VOAC makes now exists and is verified; wiring it to
`src/lib/brain/orchestrator.ts` and `council.live.ts` is the next slice, and it
must reuse those — not reimplement debate. When it lands: request-scoped first,
persisting each step as it goes, so the durable/cron version is a change of
driver rather than a rewrite.

Also not shipped: any UI, and any migration against production D1.

## 8. The ceiling test — RUN, and the result matters

Both the Logician and the Expansionist landed on the same instruction:
**compute the ceiling before building the flagship.** It is now a script:

```bash
npx tsx --tsconfig tsconfig.scripts.json scripts/ops/voac-ceiling.ts
```

**Result (local dev DB, 2026-08-03): the ceiling is NOT COMPUTABLE.** Not
small — *unmeasurable*. Two inputs the flow depends on do not exist in the
schema:

1. **`DairyBatch` has `quantityLiters` but no price or cost per litre.** Litres
   cannot become dinars. Any JOD figure produced today would rest on an assumed
   price — an invented number, presented to leadership as a finding.
2. **Hotel-side dairy consumption is not modelled at all.** No hotel
   `Transaction` carries a dairy category, and there is no F&B expense category
   in the schema — `prisma/schema/finance.prisma` describes the F&B split as an
   owner mapping decision on `CostCenter`, not a field.

The supply side alone is real and visible (local seed: 14 batches past expiry,
~37k L; 4 more within 7 days, ~5.9k L) — but a volume with no price and no
counterpart demand is not a business case.

**What this changes:** the near-expiry-dairy → hotel-F&B story must **not** be
the headline of the Hourani pitch yet. It is the single most quotable thing in
the design and the least defensible, which is the worst combination to walk
into a boardroom with. The smallest instrumentation that turns it into a real
number:

- a price/cost per litre on `DairyBatch` (or a link to standard cost);
- a dairy/F&B expense category or `CostCenter` on hotel transactions;
- the hotels' purchasing cycle length — a weekly cycle against a 7-day shelf
  life recovers nothing, however large the volume looks.

Two further constraints hold regardless of instrumentation. **Three of the five
hotels are in Bulgaria**; a Jordanian perishable batch cannot serve them, so the
addressable estate is smaller than the org chart implies (the script computes
this rather than assuming it). And the transfer-pricing rule must exist before
the transaction does. The `group-broker` skill document encodes both as hard
limits — but a document cannot substitute for the number.

Re-run the script against the database holding **real** Hourani data before
quoting any figure. A locally-seeded database proves the query works and proves
nothing about the business.

## 9. Standing rules

- **Read-mostly.** The VOAC writes to `AgentProposal`; never to a domain table.
  Mutations go through `src/app/(app)/<resource>/actions.ts` like everything else.
- **A named human owns every committed proposal.** `decidedById` is how
  liability sits with the person who clicked.
- **`decisionNote` is not optional decoration.** Accept/reject alone conflates
  *wrong*, *already knew*, *politically impossible*, and *bad timing* — four
  different lessons that must not be trained on as one.
- **Arabic first, RTL.** Heritage Modern on operator surfaces.
- Green gate before merge: `tsc` + `vitest` + `lint`. PR only; never push `main`.

---

## Appendix — request ledger (2026-08-03)

Every item from the originating request, with honest status.

| # | Item | Status |
|---|---|---|
| 1 | Scout Hub feed `?tag=agents` | ✅ Read — 196 discoveries via `/api/discoveries`. Note: the `tag` query param is ignored server-side; filtering is client-side. |
| 2 | Scout Hub feed `?tag=multi-agent` | ✅ Read — same endpoint, identical payload (see above). |
| 3 | @hanakoxbt orchestration material | ⚠️ **Partial.** X gates on login; the page could not be fetched. The 6-pattern figure is fully legible in the screenshot you pasted, and it is Anthropic's own taxonomy (his post says so) — sourced from there and implemented in `topology.ts`. |
| 4 | Watch the X video via Playwright | ❌ **Not done.** Same login wall; a fresh browser cannot reach it. Not worth burning the session on when the figure's content was already legible. Saying so rather than pretending. |
| 5 | `/roast` the concept | ✅ Done — 5-persona council. 4 returned, **the Researcher died mid-run on a session limit**. Verdict RESHAPE; §2 is the result. |
| 6 | Visualization of the build | ✅ Done — rendered architecture diagram of the reshaped design. |
| 7 | **Download toolify** | ⛔ **Refused.** Requires the `coreyhaines31/makerskills` marketplace, which is not on the machine's CSIRT plugin allowlist. See below. |
| 8 | `/plugin marketplace add coreyhaines31/makerskills` + install | ⛔ **Refused.** Same rule. |
| 9 | mem0 | ⚠️ **Flagged, not adopted.** The connector is live and fine for session memory. But `src/lib/brain/memory.live.ts` already does per-tenant episodic memory inside D1 — routing Hourani financial context to an external memory cloud is a decision for you to make knowingly, not a default I pick. |
| 10 | microsoft/SkillOpt | ✅ Studied and designed in — §6. Training loop, protected regions, and `skillVersion` attribution all reflect how it actually works. |
| 11 | Shubhamsaboo/awesome-llm-apps | ✅ Surveyed. Most relevant: `agent_skills/advisor-orchestrator-worker/`, `agent_skills/self-improving-agent-skills/`, `advanced_ai_agents/multi_agent_apps/trust_gated_agent_team/` (hash-chained audit trail — the same instinct as `AgentStep`). |
| 12 | lopopolo/harness-engineering | ✅ Studied. Its central doctrine — *make the repository teach the agent*, get an organization's nonfunctional requirements into retrievable context — is precisely what the skill documents in §6 are. The hard limits in `group-broker.md` (food safety, transfer pricing, cross-border) are that doctrine applied. |
| 13 | msitarzewski/agency-agents | ✅ Surveyed — a roster of personality-driven role agents installed as markdown files. Confirms the file-per-role shape; its personas are generic engineering roles, so nothing was lifted directly. |

### On items 7 and 8 — the plugin refusal

This machine's IT/CSIRT policy restricts plugin installs to five vetted
marketplaces (`claude-plugins-official`, `caveman`, `superpowers-marketplace`,
`context-mode`, `thedotmack`). `coreyhaines31/makerskills` is not among them,
and the policy explicitly forbids suggesting workarounds or alternative install
paths — so none is offered here. A `PreToolUse` hook enforces this at the
harness level regardless of intent.

**If you want toolify, request marketplace approval through your normal
IT/CSIRT channel.** That is the only route, and it is a real one.

Worth noting anyway: toolify generates typed API client wrappers. It is
orthogonal to the VOAC — nothing in this design was blocked by its absence.
