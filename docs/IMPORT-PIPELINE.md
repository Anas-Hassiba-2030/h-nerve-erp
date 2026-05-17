# H-Nerve — External Import Pipeline

_The n8n → API → SQLite ingestion path and its operator surface. Written
2026-05-16. Covers Phases 1–5: ingest → mapping → Product upsert →
inventory-movement ledger._

---

## One-line

A scheduled n8n Cloud workflow POSTs warehouse records to a
Bearer-authenticated endpoint; every batch is persisted (header + per-row
structured columns) and visible at `/admin/imports`.

## The flow

```
n8n Cloud (every ~15 min)
  → Cloudflare tunnel
  → POST /api/import/test            app/api/import/test/route.ts
  → Zod validate + per-record shape
  → Prisma write                     ImportLog (1) + ImportRow (N)
  → SQLite (prisma/dev.db)
  → /admin/imports                   app/(app)/admin/imports/page.tsx
```

- One `ImportLog` row per POST (the batch header).
- One `ImportRow` per record, cascade-deleted with its batch.
- Synchronous. No queue — fine at this cadence (do not add BullMQ).
- The n8n **workflow JSON lives in n8n Cloud, not in this repo.** It is
  managed in the n8n Cloud UI and is intentionally not version-controlled
  here. Treat n8n as an external system.

## Payload shape

`POST /api/import/test`, `Content-Type: application/json`. Either
`{ source?, tenantId?, records[] }` or a bare `records` array (back-compat).

| Field | Required | Notes |
|---|---|---|
| `source` | no | ≤120 chars. Batch label, e.g. `legacy-warehouse-db-20260516`. |
| `tenantId` | no | ≤64 chars. **Opaque caller-supplied label**, not a Tenant FK. Never auto-creates a tenant. |
| `records[]` | yes | ≤10000 items. |
| `records[].sku` | **yes** | Non-empty string. Missing/empty → that row is **rejected** (`"sku is required"`). |
| `records[].name` | no | → `ImportRow.productName`. |
| `records[].quantity` | no | Int. |
| `records[].unitCost` | no | Number → `Decimal`. |
| `records[].supplier` | no | String. |
| `records[].warehouse` | no | String. |

Unknown fields are preserved verbatim in `ImportRow.rowData` (raw JSON,
truncated at 4000 chars for debugging). One bad record never fails the
others — validation is per-row.

Response (always `200` on auth+parse success):

```json
{ "accepted": 5, "rejected": 1, "errors": [{ "index": 5, "error": "sku is required" }] }
```

Batch `status` is `OK` (all accepted), `PARTIAL` (mixed), or `REJECTED`
(none accepted).

## Auth

Bearer token, constant-time compared against the `IMPORT_API_TOKEN`
environment variable.

| Condition | Response |
|---|---|
| `IMPORT_API_TOKEN` unset on the server | `503` (endpoint not configured) |
| Missing / malformed / wrong token | `401` |
| Valid token | proceeds |

The token is documented in `.env.example`. `.env` is gitignored — a real
token is **never** committed.

## Rate limits

In-memory fixed window (`lib/importRateLimit.ts`):

- **100 requests / 60s**, keyed by `tenantId` → `ip` → `"anon"`.
- Over the cap → `429` with a `Retry-After` header (seconds to window reset).
- Per-process, resets on restart, not shared across instances. This only
  contains a haywire client at the current scale; swap the `Map` for Redis
  when scaling horizontally (the function signature is the seam).

## Swapping the dev token for production

The running dev server uses a throwaway token in the gitignored `.env`
(`dev-local-import-token-change-me`). For any real/shared use:

1. Generate a strong token:
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
2. Set `IMPORT_API_TOKEN=<that>` in the **production** environment (the
   host's env / secrets store — not the dev `.env`, not committed).
3. Update the Bearer credential on the n8n Cloud HTTP Request node to match.
4. Rotate by repeating 1–3; the endpoint reads the env var per request, so
   no redeploy of code is needed — just the env change + n8n credential.

## Clearing test data

`/admin/imports` has a **Clear test imports** button → `clearTestImports`
server action (`app/(app)/admin/imports/actions.ts`). It deletes
`ImportLog` rows (and their cascaded `ImportRow` children, children-first
in one transaction) where `source` starts with `legacy-`, contains
`test`, is null/empty, **or** `tenantId = "flood-tenant"`. Confirm dialog
first; an info toast reports the count. This is a dev cleanup button —
aggressive by design.

## Movement integration (Phase 5)

Every import now also writes to the **inventory-movement ledger**
(`InventoryMovement`, `lib/inventory.ts`). The ledger is the source of
truth; **`Product.quantity` is a denormalized cache** =
`SUM(InventoryMovement.delta) WHERE deletedAt IS NULL`, rewritten by
`recalcProductQuantity` (the single writer of that column).

On each accepted row, inside the same transaction as `ImportLog` /
`ImportRow` / `Product`:

- **New product** → an `IMPORT` movement, `delta = quantity`,
  `reason = "Initial import: <source>"`.
- **Existing product, quantity changed** → an `ADJUSTMENT` movement,
  `delta = newQty − oldQty`, `reason = "Reconciliation from import:
  <source>"`. `oldQty` is read from the live ledger sum (not the cached
  column) so the same brand-new SKU appearing twice in one batch can't
  double-count.
- **Quantity unchanged** → no movement; other fields still update.

`recalcProductQuantity` runs once per touched product after the batch.
The response gains `movements: { created: N }`. Movements are
**append-only** — a correction is a new signed `ADJUSTMENT`, never an
edit/delete. Manual adjustments go through the **Adjust stock** form on
`/admin/products` (`adjustStock` server action, attributed to the
current user); the full ledger is at `/admin/movements`.

## Phase 6 — Purchase Orders & Sales Orders

`lib/orders.ts` adds the two real-world stock events. **PO** lifecycle
`DRAFT → SENT → PARTIAL → RECEIVED → CANCELLED`; **SO** lifecycle
`DRAFT → CONFIRMED → PARTIAL → FULFILLED → CANCELLED`. Only two
transitions touch stock, and they reuse the Phase-5 ledger primitives —
no new inventory logic:

- **PO receipt** → `RECEIVED` movements (`+receivedQty`, `documentRef =
  poNumber`) via `recordMovement` + `recalcProductQuantity`.
- **SO fulfillment** → `SOLD` movements (`−fulfilledQty`, `documentRef =
  soNumber`).

`DRAFT/SENT` and `DRAFT/CONFIRMED` are planning states (no movement).
`createSO`/`confirmSO` run a soft stock check **inside the transaction**
(TOCTOU-safe). Partial receive/fulfil → `PARTIAL`; all lines complete →
`RECEIVED`/`FULFILLED`. `cancelPO`/`cancelSO` refuse once stock has moved
(`PARTIAL`/`RECEIVED`/`FULFILLED`) — reverse with a manual `ADJUSTMENT`
first (append-only rule). Numbers via `generateNumber("PO"/"SO")`
(`PO-YYYYMMDD-RRRR`, the codebase convention). Supplier/customer are
opaque strings (FK in Phase 7). Admin-only, **server actions only** — no
API route; n8n/`/api/import/test` is untouched. Surfaces:
`/admin/purchase-orders`, `/admin/sales-orders`; `/admin/movements`
`documentRef` deep-links back to the originating order.

## Phase 7 — Supplier & Customer entities

The opaque `supplier`/`customer` strings on `Product`/`PurchaseOrder`/
`SalesOrder` were promoted to tenant-scoped FK tables (`Supplier`,
`Customer`) via a 4-step migration: add nullable FKs → backfill script
(seed entities from the unique strings, set FK) → migrate all readers →
`db push --accept-data-loss` to drop the legacy columns and make
`PurchaseOrder.supplierId` / `SalesOrder.customerId` **non-null**.
`Product.supplierId` stays **nullable** (import rows may carry no
supplier). Forward relations are `supplierRef` / `customerRef` (the
scalar names were freed by the drop but kept as the relation names).

**Import auto-promote:** an accepted row's `supplier` string is
idempotently `upsert`ed into a real `Supplier` on `(tenantId, name)` in
the same tx, and `Product.supplierId` is linked — **n8n keeps sending
the plain string unchanged**; the first import that sees a new vendor
creates the entity. `findOrCreateSupplier`/`findOrCreateCustomer` in
`lib/orders.ts` are shared by the import endpoint and the PO/SO create
actions. New surfaces: `/admin/suppliers`, `/admin/customers` (CRUD,
inline edit, linked orders; soft-delete blocked while non-cancelled
PO/SO exist). PO/SO creation now uses Supplier/Customer dropdowns.

## Phase 8 — Double-entry accounting

`lib/accounting.ts` adds the ledger. Three business events auto-post
balanced, immutable `JournalEntry`s (SUM debits = SUM credits, enforced
in code before any write — all `Prisma.Decimal`, never JS floats):

- **PO receipt** (`receivePO`): `DR Inventory (1001) / CR Accounts
  Payable (2001)` — qty × `PurchaseOrderLine.unitCost`.
- **SO fulfillment** (`fulfillSO`): two JEs — `DR AR (1201) / CR Sales
  Revenue (4001)` (qty × unitPrice) **and** `DR COGS (5001) / CR
  Inventory (1001)` (qty × weighted-average cost).
- **Stock adjustment** (`adjustStock`): `DR/CR Inventory Adjustment
  (5002)` vs `Inventory` by `|delta| × WAC`.

**Weighted-average cost** = `Σ(δ × unitCost) / Σ δ` over costed inflows
(`IMPORT|RECEIVED`, `unitCost` not null, not soft-deleted) — a perpetual
moving average (pool not depleted on sale). `InventoryMovement.unitCost`
carries cost on costed inflows; **IMPORT movements do NOT post JEs**
(decision #7 — data sync, not a financial event) but still feed the
costing pool. Each contributing line is rounded to 2dp (banker's) then
summed, so both JE sides are built from identical numbers.

All posting is inside the existing PO/SO/adjust transaction → atomic
with the stock movement. Degenerate (null cost / WAC=0) entries are
skipped. The Chart of Accounts must be seeded per tenant first
(`getLedgerAccount` fails loud) — historical pre-Phase-8 events get no
retroactive JEs. Surfaces: `/admin/journal` (period ledger + balance
check), `/admin/accounts` (CoA + P&L + Balance Sheet; Equity includes
current-period net income since period close is Phase 11).

## Phase 9 — Multi-warehouse + stock transfers

`Product.warehouse` (string) was promoted to a tenant-scoped
`Warehouse` table (`code`, `name`, `address`, `type`
MAIN|COLD|DRY|TRANSIT, `active`, soft-delete) via the same two-step
migration as Phase 7: add nullable `warehouseId` → backfill (one
`Warehouse` per unique string per tenant, `UNASSIGNED` for the
string-less) → `db push --accept-data-loss` to make it **non-null**,
drop the legacy string, and swap the key.

**Product identity is now `@@unique([tenantId, sku, warehouseId])`.**
The same SKU in two warehouses = **two Product rows**. `Product.quantity`
is therefore stock *at one warehouse*. The import endpoint resolves a
row's free-text `warehouse` to a `Warehouse` (created on first sight,
slug→`code`; no string → the tenant's oldest active warehouse, lazily
creating `UNASSIGNED` for brand-new tenants), cached per batch, then
upserts on `(tenantId, sku, warehouseId)`. **n8n keeps sending the
same payload unchanged.**

**Transfers** (`lib/transfers.ts`, `/admin/transfers`) are a paired,
atomic operation: one `TRANSFER_OUT` at the source + one `TRANSFER_IN`
at the destination, sharing a generated `TRF-…` `transferRef`, both
via the Phase-5 ledger primitives. `createTransfer` validates positive
int qty, same-tenant source+destination, distinct warehouses, and
sufficient stock; it creates the destination Product row on first
transfer there. **Transfers post NO journal entries** — total
inventory value is unchanged (decision #5); `LedgerAccount` carries a
forward-provisioned nullable `warehouseId` for a future sub-ledger.
`InventoryMovement` gained scalar `warehouseId` (auto-inherited from
the product unless `createTransfer` sets it explicitly) + `transferRef`.
New surface `/admin/warehouses` (CRUD, per-warehouse inventory, delete
blocked while it holds products). PO/SO lines are unchanged (Phase 11).

## Notes / boundaries

- **SKU dedup is live (Phase 3).** Re-posting the same `(tenantId, sku)`
  upserts the `Product` (and reconciles quantity via the ledger, above) —
  it does not create duplicate products. `ImportLog`/`ImportRow` remain
  the per-POST audit trail and are still append-only.
- **SQLite, as-is.** No Neon/Postgres here (that is W9, separate). `unitCost`
  is a Prisma `Decimal` stored exact; the `@db.Decimal(12,2)` precision
  annotation is unsupported on SQLite and is deferred to the Postgres
  cutover (carried as a schema comment).
- **Visibility surfaces** are `/admin/imports` (audit), `/admin/products`
  (catalog + Movement History) and `/admin/movements` (ledger) — all
  `(app)` route group, Heritage Modern, gated: no session → `/login`,
  non `ADMIN|EXECUTIVE|MANAGER` → `/dashboard`.
