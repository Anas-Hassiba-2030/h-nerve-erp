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

## Wave W5 — Cross-company elegance ✅ COMPLETE

- ✅ **Workspace switcher in the band** — pure `<details>` disclosure
  (no client state lib), lists every unit with sector glyph + code,
  current marked "here"; each row posts to the existing
  `enterWorkspace` action → cookie swap → land on the new unit's
  Command. Jump Maha → Arena → Loran without ever leaving the shell.
- ✅ **Deep-link into a unit's Command from the portfolio roll-up.**
  (Re-framed: the Empire grid is white-label *tenants* + synthetic
  siblings, not the operating companies — deep-linking there would be
  dishonest. The Holding workspace's cross-unit roll-up rows *are*
  the operating companies, so each row is now a `enterWorkspace`
  form-button: Holding → click Maha → in Maha's Command → switcher →
  hop to Arena. Loop closed with the switcher.)
- ✅ **Time-Machine aware: scrub a company's past state.** The global
  `TimeMachineBanner` already announces travel app-wide; the gap was
  that workspace *numbers* stayed live (a lie). Now: Finance bounds
  its P&L + ledger query to `occurredAt ≤ asOf` and stamps the
  section "State as of {date}"; the Holding roll-up's 30d window ends
  at the cursor (group as it stood that day). One `where` clause
  each — low-risk, honest. (Command Center health composite left
  live — a deliberate follow-up, too many sub-queries to bound safely
  in this pass.)
- ✅ **"Compare two units" side-by-side (reuse `/compare`).** A
  "Compare vs unit" pill in the command band deep-links to
  `/compare?a=<thisUnit>`. Verified safe: `lib/workspaceScope.ts`
  explicitly excludes `Company` from scoping ("the switcher must see
  them all"), so `/compare`'s `company.findMany()` still returns
  every unit even with a workspace cookie active. The page
  auto-fills B with the next unit and ships its own A/B pickers —
  zero new comparison code, full reuse.

---

## Wave W6 — Role-gating the ERP ✅ COMPLETE

Makes the CLAUDE.md invariant *literally true*: the brain proposes,
**only MANAGER+ commits**. Mirrors the Phase D create/update gating.
Defense in depth — two independent layers:

- ✅ **Server gate (the security boundary).** All six W4 mutations in
  `app/(app)/workspace/actions.ts` swapped `requireUser()` →
  `requireRole("MANAGER")` (returns the `SessionUser`, throws
  `ForbiddenError` otherwise — drop-in, audit `actorId` unchanged).
  A direct POST by STAFF is rejected server-side regardless of UI.
- ✅ **UI gate (read-only workspace for STAFF).** Each of the four
  pages computes `canMutate = !!(await getUserIfRole("MANAGER"))` and
  hides the action forms when false: Operations (advance-batch on
  the dairy board), Pipeline (budget edit + advance stage),
  Intelligence (accept → plan + dismiss), Team (assign owner). STAFF
  still see every number and signal — they just can't act. Holding
  roll-up deep-links stay open (navigation, not a mutation).

Hierarchy (`lib/authz.ts`): STAFF < MANAGER < EXECUTIVE < ADMIN —
`requireRole("MANAGER")` admits MANAGER, EXECUTIVE, ADMIN.

**Dry-run (no seed change needed — accounts already exist, all
password `admin123`):**
- Read-only path: `staff@hourani.jo` → enter any workspace → every
  number/signal visible, zero action buttons.
- Commit path: `maha.gm@hourani.jo` (MANAGER) → Maha workspace →
  full action buttons. `admin@hourani.jo` (ADMIN) also passes.

**Minor follow-ups — both now resolved:**
- ✅ `team/page.tsx` conditional re-indented (cosmetic, done).
- ✅ `ForbiddenError` UX — *already_ handled. `app/(app)/error.tsx`
  is a polished branded boundary covering every `(app)` descendant
  (incl. workspace server actions). A STAFF direct-POST gets the
  calm "your data is safe · retry · back" panel with collapsed
  technical details — never a raw stack trace. No new code needed.

---

## Wave W7 — Pitch hardening ✅ COMPLETE

Make what exists not break on stage; make the role model legible.

- ✅ **Read-only badge in the command band.** When the signed-in
  user is below MANAGER, an amber `🔒 Read-only` pill sits in the
  band actions (bilingual tooltip explaining why). Turns "buttons
  are missing" into "the system visibly enforces roles" — a thing
  to point at during the demo, not a gap to explain away.
- ✅ Confirmed the `(app)/error.tsx` boundary already shields every
  workspace error path (no raw traces in front of leadership).
- ✅ Dry-run accounts verified in seed (all `admin123`):
  `staff@hourani.jo` read-only · `maha.gm@hourani.jo` MANAGER ·
  `admin@hourani.jo` ADMIN. No seed change required.

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
