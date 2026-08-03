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
| `scripts/build/build-voac-map.mjs` | generates `docs/architecture/voac.{html,json}` from the real source |
| `src/lib/finance/categories.ts` | canonical transaction categories + alias normaliser |

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

| `src/lib/voac/proposals.ts` | output contract + strict extraction |
| `src/lib/voac/driver.live.ts` | **the execution driver** — `runVoac()` / `runGroupBroker()` |
| `scripts/verify/voac-smoke.ts` | end-to-end proof against a real database |

### The driver

`driver.live.ts` deliberately owns almost no intelligence. It **sequences
existing machinery and records what happened**:

- topology `parallel` → `src/lib/brain/council.live.ts` (`council().convene`)
- every other topology → `src/lib/brain/orchestrator.ts` (`runToolLoop`)

Reusing those two is the point. The council already runs five voices in parallel
with a moderator and handles stub mode; a second debate implementation here
would drift from the first and be worse. The driver's job is the ledger, the
budget and the gate.

**Three independent brakes, in this order:** the topology's hop ceiling (refused
before a token is spent) → the per-tenant LLM budget (`brain/llmBudget.ts`) →
the roster's daily proposal cap (`budget.ts`, which limits what reaches a
*human*, not what the model may think about).

**Proposals are never salvaged from prose.** The driver appends a strict output
contract to the skill document at runtime — not into the `.md`, because that is
SkillOpt's trainable surface and a machine rewriting its own output contract is
how a pipeline silently stops parsing. If the contract is not honoured,
`extractProposals` returns **zero** proposals and records the parse error on the
run. A parser-invented proposal would carry a confidence nobody assigned.

`STUB` is its own run status. A run with no API key did not *fail* — the
bookkeeping worked and there was no model behind it. (The smoke test caught this
being recorded as `FAILED`, which would send someone hunting a defect that does
not exist.)

Verified end-to-end by `scripts/verify/voac-smoke.ts` — **23/23 checks**: steps
land contiguously, refusals persist as rows with reasons, the hop ceiling and
the autonomous opt-in both refuse before spending, council voices are marked
self-scored, the roster auto-creates, the cap holds, and **no domain table is
ever mutated**.

```bash
DATABASE_URL="file:./prisma/schema/dev.db" \
  npx tsx --tsconfig tsconfig.scripts.json scripts/verify/voac-smoke.ts
```

**Still not shipped:** any UI (the ledger has no screen), any cron/queue caller
(the driver is request-scoped — but because every step is persisted as it
happens, that is a change of caller, not a rewrite), and any migration against
production D1.

## 8. The ceiling test — RUN, and the result matters

Both the Logician and the Expansionist landed on the same instruction:
**compute the ceiling before building the flagship.** It is now a script:

```bash
npx tsx --tsconfig tsconfig.scripts.json scripts/ops/voac-ceiling.ts
```

**First run (2026-08-03): NOT COMPUTABLE.** Two required inputs did not exist —
`DairyBatch` had litres but no price, and hotel-side dairy consumption was not
modelled at all (`Transaction.category` was free text, so "F&B", "f and b" and
"أغذية ومشروبات" were three different categories and nothing aggregated).

**Both have since been instrumented** (same PR):

- `DairyBatch.pricePerLiter` + `costPerLiter` — **nullable on purpose**, so an
  un-entered price stays visibly un-entered instead of silently reading as zero
  recoverable value;
- `src/lib/finance/categories.ts` — a canonical category list with an alias
  normaliser, surfaced as a `<datalist>` on the finance form. Free text still
  submits, so existing rows keep working, but totals can finally aggregate.

**Second run — the ceiling computes:**

| | JOD |
|---|---|
| Margin on at-risk stock (7-day window) | **7,640** |
| Already written off (expired × cost) | **33,678** |
| Annualised hotel dairy demand | 55,078 |
| **Ceiling, capped by demand** | **7,640** |

*(Local seeded data — representative, not Hourani's actuals. Re-run against real
data before quoting anything.)*

**Read the second row, not the first.** Recovery of near-expiry stock is capped
around 7.6k; stock already written off is **4× larger**. That inverts the pitch:
the money is in *preventing* the overproduction, not in *rerouting* its output —
which is exactly what `dairy-yield-controller.md` already instructs ("prefer a
proposal that prevents the next loss over one that recovers the current one;
recovery is worth a fraction of the margin, prevention is worth all of it").

Recovery is also the **margin**, never the full price — the litre was already
produced and paid for. And expired stock recovers nothing; it is a write-off,
and the group-broker skill document forbids proposing otherwise.

Still not measurable, and it bounds everything above: **the hotels' purchasing
cycle**. A weekly ordering cycle against a 7-day shelf life captures a fraction
of that 7,640, and that fraction — not the ceiling — is the honest pitch number.

Two further constraints hold regardless of instrumentation. **Three of the five
hotels are in Bulgaria**; a Jordanian perishable batch cannot serve them, so the
addressable estate is smaller than the org chart implies (the script computes
this rather than assuming it). And the transfer-pricing rule must exist before
the transaction does. The `group-broker` skill document encodes both as hard
limits — but a document cannot substitute for the number.

Re-run the script against the database holding **real** Hourani data before
quoting any figure. A locally-seeded database proves the query works and proves
nothing about the business.

## 8b. The self-describing map

```bash
node scripts/build/build-voac-map.mjs
```

Emits two artifacts from one source of truth:

- **`docs/architecture/voac.html`** — a self-contained interactive map (no CDN,
  no build step, opens straight from disk). Click any node for its file, its
  skill-document version, and its invariants.
- **`docs/architecture/voac.json`** — the machine-readable twin, for the next
  agent picking this up cold. Layers, nodes, edges, roles, topologies, models,
  invariants, and an explicit `openQuestions` list.

Both are **generated by parsing the real registry, topology table, Prisma models
and skill documents** — not hand-drawn. A hand-drawn architecture diagram is
accurate exactly once, and a map that silently lies is worse than no map because
people stop checking it. Re-run the generator whenever `src/lib/voac/` changes.

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
