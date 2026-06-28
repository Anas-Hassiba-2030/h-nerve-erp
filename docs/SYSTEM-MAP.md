# H-Nerve — System Map & Navigation Roadmap

The single picture of **every section, where it lives, and where it routes** —
plus the organize-the-system plan. Built 2026-06-28 from the live route tree.

## Source of truth (code)

| Concern | File |
|---------|------|
| Orbit groups (the 5 sections + their items) | `src/lib/orrery/groups.ts` |
| Design-export href → real route mapper | `src/lib/orrery/routeMap.ts` |
| Operator chrome (sidebar, top control, MiniOrrery) | `src/app/(app)/layout.tsx`, `src/components/orrery/MiniOrrery.tsx` |
| Superadmin chrome | `src/app/(admin)/layout.tsx` |

The orbit menu is the navigation spine. **5 groups, 42 routes.** Both the
compact dropdown (`MiniOrrery.tsx`) and the radial hub (`public/orrery/index.html`)
read the same groups — keep them 1:1.

## The 5 orbit groups

### Group Board — the holding + sector units
| Route | Purpose |
|-------|---------|
| `/dashboard` | Executive pulse across all units |
| `/companies` | Holding / company master |
| `/hotels` | Arena (hospitality) |
| `/dairy` | Maha (dairy) |
| `/farms` | Loran (agriculture) |
| `/education` | The Tank · AAU incubator |
| `/supply-chain` | Predictive logistics |

### The Brain — intelligence (15 routes)
`/brain` (hub) · `/brain/council` · `/brain/graph` · `/brain/scenarios` ·
`/brain/memory` · `/brain/learning` · `/brain/iq` · `/brain/trust` ·
`/brain/narrate` · `/brain/benchmarks` · `/brain/self-tuning` · `/insights` ·
`/alerts` · `/plans` · `/documents`

### Finance
`/finance` (GL · P&L) · `/analytics` · `/compare` · `/markets` ·
`/reports` · `/sustainability` (ESG) · `/projects`

### Team
`/messages` · `/tasks` · `/inbox` · `/digest` · `/employees` ·
`/achievements` · `/users`

### System — ⚠ overloaded (14 routes)
`/admin/system` (Mission Control) · `/admin/empire` · `/admin/tenants` ·
`/workspace` (company ERP console) · `/workflows` · `/integrations` ·
`/audit-360` · `/activity` · `/search` · `/pinned` · `/trash` ·
`/settings` · `/help` · `/roadmap`

> System is a junk drawer: superadmin, the company workspace, automation,
> and personal utilities (search/pinned/trash) all share one bucket.

## Superadmin console — `(admin)` tier (ADMIN role only)

`/admin/empire` · `/admin/tenants` · `/admin/users` · `/admin/permissions-preview` ·
`/admin/audit` · `/admin/genesis` · `/admin/db` · `/admin/system`

Heritage cream re-skin (owner override of DESIGN-SKILL §1.F). Rail redesigned
2026-06-28: monogram wordmark + the shared MiniOrrery orbit control (no
Operator / Leave-admin text exits).

## Orphans — 19 routes with no orbit home

**ERP back-office (13)** — Phase 27 material, not yet surfaced:
`/admin/accounts` · `journal` · `products` · `warehouses` · `suppliers` ·
`purchase-orders` · `sales-orders` · `transfers` · `movements` · `mappings` ·
`customers` · `imports` · `brain`

**Internal / dev (6):** `/me` · `/memory` · `/learning` · `/changelog` ·
`/design-system` · `/showcase`

## IA findings

1. **System is overloaded** — split it: keep platform-admin together, lift the
   company `/workspace` console to its own affordance, and move personal
   utilities (search/pinned/trash/settings/help) out of the section grid.
2. **19 orphan routes** float with no home — decide: surface (give an orbit
   home), fold into an existing section, or retire.
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
