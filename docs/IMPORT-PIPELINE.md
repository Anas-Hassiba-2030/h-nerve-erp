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
