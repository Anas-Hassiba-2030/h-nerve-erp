# Workspace ERP — Roadmap

The per-company ERP track. Sister document to `PHASES-INTELLIGENCE.md`
(which covers the 20 intelligence phases). This file tracks the
company-workspace build, the polish backlog, and the long horizon.

Status legend: ✅ done · 🔄 in progress · ⬜ planned

---

## Wave W0 — Polish & corrections (current)

Direct responses to live feedback.

- ✅ **Kill the phantom CFO cursor.** The simulated mouse that drifted
  around the screen is disabled. Real multi-user presence still works.
- ✅ **Stop the "always moving" ticker.** The dashboard live-ticker
  marquee auto-scrolled (laggy on long rows). Now a calm static wrapped
  stat strip — zero motion, zero jank.
- ✅ **Remove the unprofessional duplicate sparklines.** The little
  REVENUE/EXPENSE squiggles on top of the 12-month bar chart were
  redundant and looked broken. Removed; the bar chart + legend stays.
- ✅ **Recolor the Company Health hero.** Was near-black (off-theme).
  Now Heritage cream/ink/copper — matches every other surface.

---

## Wave W1 — The workspace shell ✅

Turn "Enter workspace" into a real product.

- ✅ Company-branded command band (glyph · name · sector · staff · exit)
- ✅ Six-section nav: Command · Operations · Finance · Team · Pipeline ·
  Intelligence
- ✅ Nested layout — every `/workspace/*` route renders inside the shell
- ✅ Auto-scoped data via the `lib/db.ts` middleware (pitch-safe)

---

## Wave W2 — Flagship: Maha Dairy ✅

The deepest, most polished company. The demo unit.

- ✅ Command Center — Company Health Index (composite 0-100, 4 factors),
  financial pulse, section signposts
- ✅ Operations — live production board (status columns), expiry watch,
  QC grade distribution, **throughput trend**, **destination split**
- ✅ Finance — scoped P&L + transaction ledger
- ✅ Team — unit org, roles, XP
- ✅ Pipeline — project stage board
- ✅ Intelligence — sector-filtered signal feed + plans w/ confidence

---

## Wave W3 — Replicate flagship depth ✅ COMPLETE

Bring the other companies up to Maha's bar. Each is a domain-engineer
agent's job; they can run in parallel (independent verticals).

- ✅ **Arena Space (Hospitality)** — flagship-depth Operations shipped:
  occupancy KPIs · ADR · RevPAR · per-property occupancy board
  (color-graded bars) · room-type mix · 14-day arrival pace. Health
  operational axis (occupancy %) already wired in the Command Center.
- ✅ **Loran (Agriculture)** — flagship Operations shipped: crop-cycle
  board (Planted→Growing→Harvested→Failed) · harvest watch (14-day) ·
  yield-realization (actual vs forecast, color-graded). Health axis:
  crops-on-track ratio (wired in Command).
- ✅ **The Tank (Education)** — flagship Operations shipped: incubator
  pipeline board (Intake→Screening→Active→Demo→Graduated) · funding
  per cohort. Health axis: program load (wired in Command).
- ✅ **Hourani Holding (Investment)** — portfolio roll-up shipped:
  unscoped cross-unit view — every company's 30d revenue, net, margin,
  headcount as color-graded contribution bars + group totals.

Acceptance bar per company: matches Maha's section depth, one
flagship-grade operations analytic, health operational axis wired.

---

## Wave W4 — Functional (mutations, not just views) ✅ COMPLETE

Make the ERP *do*, not only *show*. `app/(app)/workspace/actions.ts` —
each is a guarded server action: `requireUser` → mutate ONE field on a
workspace-scoped row → `ActivityLog` audit row → `revalidatePath`.

- ✅ Operations: **advance a batch's status** (IN_PRODUCTION → READY →
  SHIPPED → RETAIL) — button on each dairy board card
- ✅ Pipeline: **advance a project stage** (IDEA → … → LIVE) — button
  on each pipeline card
- ✅ Intelligence: **dismiss a signal** (soft — flips OPEN→DISMISSED,
  never deletes) — button on each signal
- ✅ Per-action audit row in `ActivityLog` (action/entity/summary
  bilingual/meta JSON/actor) — never blocks the mutation
- ✅ Intelligence: **accept** a signal → spawns a DRAFT Plan
  (`sourceInsightId` linked, metric mapped from module, target sized
  by severity), signal → ACTIONED. Plan stays DRAFT — the human
  commits it later in `/plans`. The marquee "brain proposes, human
  commits" flow.
- ✅ Pipeline: **inline budget edit** — per-card JOD field, clamped
  `[0, 1e9]`, skips no-op, audited (UPDATE/PROJECT)
- ✅ Team: **assign owner to a unit project** — per-project owner
  `<select>` on the Team page populated from this unit's members
  (+ Unassigned), writes `FutureProject.ownerName` (existing column,
  no schema change), audited, revalidates Team + Pipeline

Scoping note: batch/project reads go through the scoped client so a
user can't mutate another company's row. AIInsight is unscoped (no
companyId) so dismiss uses the unscoped client + status flip only.

---

## Wave W5 — Cross-company elegance

- ⬜ Workspace switcher in the band (jump company without exiting)
- ⬜ "Compare two units" side-by-side (reuse `/compare`)
- ⬜ Time-Machine aware: scrub a company's past state
- ⬜ Empire dashboard tiles deep-link into each company's Command

---

## Long horizon (carried from PHASES-INTELLIGENCE.md)

- ⬜ Phase 18 real Claude Vision in `lib/docintel/parser.ts`
  (currently a deterministic stub)
- ⬜ Phase 17 polling → WebSocket transport
- ⬜ SQLite → Postgres (Float→Decimal money, real migrations, citext)
- ⬜ Production auth hard-gate (`role === "ADMIN"` for `/admin/*` —
  already done) + rate limiting

---

## How this gets executed

The 23-agent suite under `.claude/agents/` owns this. Routing:

| Work | Agent |
|---|---|
| Arena ops depth | `hospitality-engineer` |
| Loran ops depth | `agri-engineer` |
| Tank ops depth | `education-engineer` |
| Holding roll-up | `finance-engineer` |
| New mutations | `next-route-group-engineer` + the domain engineer |
| Schema for actions | `prisma-schema-architect` |
| Brain-proposed plans | `brain-architect` |
| Every UI change reviewed | `heritage-design-reviewer` |
| Every bug | the `bug-reproducer → root-cause-analyzer → fix-implementer` triad |

Waves W3+ are parallelizable: the domain engineers touch disjoint
route folders, so Arena / Loran / Tank can be built concurrently and
synthesized — no sequential-pipeline bottleneck.
