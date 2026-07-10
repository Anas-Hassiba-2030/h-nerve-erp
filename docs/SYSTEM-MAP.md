# H-Nerve — System Map & Navigation Roadmap

The single picture of **every section, where it lives, and where it routes** —
plus the organize-the-system plan. Built 2026-06-28 from the live route tree;
last synced 2026-07-09. **`src/lib/orrery/groups.ts` is authoritative — this
document mirrors it.** When they disagree, groups.ts wins; fix this file.

## Source of truth (code)

| Concern | File |
|---------|------|
| Orbit groups (the 5 sections + their items) | `src/lib/orrery/groups.ts` |
| Design-export href → real route mapper | `src/lib/orrery/routeMap.ts` |
| Operator chrome (sidebar, top control, MiniOrrery) | `src/app/(app)/layout.tsx`, `src/components/orrery/MiniOrrery.tsx` |
| Superadmin chrome | `src/app/(admin)/layout.tsx` |

The orbit menu is the navigation spine. **5 groups, 41 routes** (+ the header
UserMenu carrying the 6 personal utilities). The compact
dropdown (`MiniOrrery.tsx`) and the sibling rail read `groups.ts` directly;
the radial hub (`public/orrery/index.html`) keeps its own index-aligned AR/EN
arrays and is synced to groups.ts only as a deliberate, isolated step (see the
header comment in `groups.ts`) — keep them 1:1.

## The 5 orbit groups

### Group Board — the holding + sector units (8 routes)
| Route | Purpose |
|-------|---------|
| `/dashboard` | Executive pulse across all units |
| `/companies` | Holding / company master |
| `/workspace` | Company ERP console (moved here from System — it is company-level) |
| `/hotels` | Arena (hospitality) |
| `/dairy` | Maha (dairy) |
| `/farms` | Loran (agriculture) |
| `/education` | The Tank · AAU incubator |
| `/supply-chain` | Predictive logistics |

### The Brain — intelligence (13 routes)
`/brain` (hub) · `/insights` · `/alerts` · `/plans` · `/documents` ·
`/brain/graph` · `/brain/scenarios` · `/brain/council` · `/brain/memory` ·
`/brain/learning` · `/brain/narrate` · `/brain/trust` · `/brain/iq`

(`/brain/benchmarks` and `/brain/self-tuning` exist as pages but are reached
from the Brain hub, not the orbit — counted under orphans below.)

### Finance (7 routes)
`/finance` (GL · P&L) · `/analytics` · `/compare` · `/markets` ·
`/reports` · `/sustainability` (ESG) · `/projects`

### Team (7 routes)
`/messages` · `/tasks` · `/inbox` · `/digest` · `/employees` ·
`/achievements` · `/users`

### System — 6 honest routes (IA split #288, shipped 2026-07-10)
`/admin/system` (Mission Control) · `/admin` (**النواة / The Core** — the
ERP back-office hub fronting the 13 operator consoles) · `/workflows` ·
`/integrations` · `/audit-360` · `/activity`

> Trimmed 2026-06-28: `/admin/empire` and `/admin/tenants` fan out from
> Mission Control, `/workspace` moved to Group Board, `/roadmap` dropped.
> **Split 2026-07-10 (IA split B1):** the personal utilities — `/search`,
> `/pinned`, `/trash`, `/settings`, `/help`, plus `/me` — moved out of the
> section grid into the header **UserMenu**
> (`src/components/nav/UserMenu.tsx`, rendered by `PageHeader` on every
> authenticated page, with Sign out). System is no longer a junk drawer.

## Superadmin console — `(admin)` tier (ADMIN role only)

`/admin/empire` · `/admin/tenants` · `/admin/users` · `/admin/permissions-preview` ·
`/admin/audit` · `/admin/genesis` · `/admin/db` · `/admin/system`

Heritage cream re-skin (owner override of DESIGN-SKILL §1.F). Rail redesigned
2026-06-28: monogram wordmark + the shared MiniOrrery orbit control (no
Operator / Leave-admin text exits).

## Orphans — 22 routes with no orbit home

**ERP back-office (13)** — Phase 27 material, not yet surfaced:
`/admin/accounts` · `journal` · `products` · `warehouses` · `suppliers` ·
`purchase-orders` · `sales-orders` · `transfers` · `movements` · `mappings` ·
`customers` · `imports` · `brain`

**Internal / dev (6):** `/me` · `/memory` · `/learning` · `/changelog` ·
`/design-system` · `/showcase`

**De-listed from the orbit (3):** `/roadmap` (dropped from the menu
2026-06-28, page still live) · `/brain/benchmarks` · `/brain/self-tuning`
(both reachable from the Brain hub only)

## IA findings

1. **System overload** — ✅ resolved (IA split #288, 2026-07-10): personal
   utilities moved to the header UserMenu; System = 6 platform pills including
   The Core.
2. **Orphan routes** — ✅ homed (same split): the 13 ERP back-office consoles
   sit behind the `/admin` Core hub; `/me` lives in the UserMenu;
   `/changelog` + `/design-system` + `/showcase` are linked from `/help`
   ("For developers" shelf); `/brain/benchmarks` + `/brain/self-tuning` stay
   hub-reached by design; `/roadmap` stays unlisted.
3. **Company-card routing** (fixed 2026-06-28) — dashboard cards linked to
   `/companies/{id}` (a profile) instead of entering that company's
   `/workspace`; cookie default made it land on an unrelated unit.

## Workstream plan (pre-pitch)

| # | Workstream | Status |
|---|-----------|--------|
| 1 | Company-card bug → opens its workspace | ✅ shipped (PR #265) |
| 2 | Admin rail — monogram wordmark, shared Orbit button, drop Operator | ✅ shipped (PR #265) |
| 3 | Orbit sections menu — clearer compact dropdown (bloom untouched) | ⏳ needs owner direction |
| 4 | Dashboard — full redesign | ⏳ mockups next |
| 5 | Organize the IA — empty System, home the orphans, tighten groups | ✅ shipped (IA split #288, 2026-07-10) |
