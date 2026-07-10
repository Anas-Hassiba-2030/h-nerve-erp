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

The orbit menu is the navigation spine. **5 groups, 45 routes.** The compact
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

### System — ⚠ still overloaded (10 routes)
`/admin/system` (Mission Control) · `/workflows` · `/integrations` ·
`/audit-360` · `/activity` · `/search` · `/pinned` · `/trash` ·
`/settings` · `/help`

> Trimmed 2026-06-28: `/admin/empire` and `/admin/tenants` now fan out from
> Mission Control (one clear admin entry point), `/workspace` moved to Group
> Board, and `/roadmap` was dropped from the menu. Still a junk drawer:
> platform admin, automation, and personal utilities (search/pinned/trash)
> share one bucket.

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

1. **System is overloaded** — 10 routes today (down from 14: Empire/Tenants
   folded into Mission Control, `/workspace` lifted to Group Board, `/roadmap`
   dropped), but it still mixes platform-admin with personal utilities.
   Remaining split: keep platform-admin together and move personal utilities
   (search/pinned/trash/settings/help) out of the section grid. Scheduled as
   campaign Batch 3.
2. **22 orphan routes** float with no home — decide: surface (give an orbit
   home), fold into an existing section, or retire. Scheduled as campaign
   Batch 3.
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
| 5 | Organize the IA — empty System, home the orphans, tighten groups | ⏳ after 3–4 |
