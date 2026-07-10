# Phase 11 — Performance Audit

owner: Anas Hasiba
last-updated: 2026-05-18

**Date:** 2026-05-18 · branch `feat/workspace-erp`

## Done — indexes (the substantive win)

Migration `20260518130000_phase11_perf_indexes` (additive, zero data
risk; Vercel `prisma migrate deploy` applies it on deploy):

| Model | Index | Serves |
|---|---|---|
| Transaction | `@@index([companyId, occurredAt])` | finance lists (filter company, sort occurredAt) |
| Transaction | `@@index([createdById])` | "created by" joins / by-me |
| Booking | `@@index([hotelId])` | bookings → hotel join |
| Booking | `@@index([checkIn])` | upcoming-bookings / date filters |
| Task | `@@index([assigneeId, status])` | /inbox "my open tasks" |
| Task | `@@index([dueAt])` | task due-date sort |

These three were the only hot models with **0** indexes. All other
hot models (Product, InventoryMovement, PO/SO, Journal*, Message,
Customer, Supplier, ActivityLog, BrainInsight, Warehouse, User) already
carry adequate FK/filter indexes.

## Pagination — audited, intentionally NOT changed

Only two list pages do `findMany` without `take`:

- **`/admin/accounts`** — computes a **trial-balance aggregate**
  (`sumType` reduces balances across *all* accounts). Paginating it
  would corrupt the accounting totals. Chart of accounts is naturally
  bounded (tens of rows). Pagination is the wrong fix → left as-is.
- **`/admin/mappings`** — computes KPIs over the full set
  (`activeCount`, distinct tenants/systems). Same aggregate-corruption
  risk; `TenantImportMapping` is a tiny per-(tenant,sourceSystem)
  config table. Left as-is.

Genuinely high-growth lists (InventoryMovement, Transaction, Journal*,
ActivityLog, Booking, products/movements) are **already** capped or
paginated (e.g. `/admin/audit` paginates 50, Phase 7). So "no
pagination changes" is the correct outcome, not a skipped task —
forcing pagination here would have introduced an accounting
regression (the exact Phase 11 risk flagged in review).

## Honest scope — deferred (Phase 11b)

- **Lighthouse > 85**: not measurable in this environment (no
  browser/Lighthouse runner here). Needs a manual or CI Lighthouse
  pass on the live deploy.
- **Lazy-load heavy components** (charts/brain UI via `next/dynamic`):
  separate UI workstream — not bundled into the index/migration
  change to keep this deploy low-risk and reviewable.
- **MANAGER data scoping** (`where:{ companyId }` on every query):
  large cross-cutting workstream (every list/detail query). Route
  gates exist (Phase 5); raw row scoping still pending. Tracked.
