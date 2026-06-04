# Multi-tenant isolation — final state (Phase 11b)

This is the source-of-truth doc for how H-Nerve ERP keeps one tenant's
data invisible to another inside a single shared database. Read this
before adding a new model that holds business data.

## TL;DR

- **Every tenant-keyed read goes through `prisma`** (the scoped client
  exported from `lib/db.ts`).
- **`prismaUnscoped` is reserved for genuinely cross-tenant surfaces**:
  the Empire dashboard, the workspace switcher, the system-dump API,
  the brain engine running from cron, the `/api/brain/insights` external
  read endpoint, and the operator layout's banner lookups.
- Every `prismaUnscoped` call site MUST carry a `// CROSS-TENANT INTENT:`
  comment explaining why it bypasses scoping.
- The middleware in `lib/workspaceScope.ts` filters two parallel sets of
  models: `SCOPED_MODELS` by `companyId`, and `TENANT_SCOPED_MODELS` by
  the opaque `tenantId` slug. Pass-through is the invariant: when no
  cookie is set the app behaves byte-identically to pre-Phase-C.
- ADMIN bypasses all scoping (no workspace/tenant cookie at login).

## The two scoping planes

| Plane | Column | Cookie | Set | Models |
|---|---|---|---|---|
| Workspace | `companyId String` (FK to Company) | `h_nerve_workspace` | `SCOPED_MODELS` | Hotel, DairyBatch, Farm, Program, Transaction, FutureProject, SustainabilityScore |
| Tenant | `tenantId String` (opaque slug) | `h_nerve_tenant` | `TENANT_SCOPED_MODELS` | Product, Supplier, Customer, Warehouse, PurchaseOrder, SalesOrder, InventoryMovement, LedgerAccount, FinancialPeriod, JournalEntry, TenantImportMapping, BrainInsight, Booking, Crop, CouncilDiscussion, CouncilReply, ProtocolClause, ImportLog (nullable `tenantId` — null rows are filtered out for pinned operators, visible to ADMIN) |
| Dual-company | `sourceCompanyId` + `targetCompanyId` (two Company FKs) | `h_nerve_workspace` | `DUAL_COMPANY_SCOPED_MODELS` | SupplyForecast |

**Dual-company plane (Phase ISO-2).** A `SupplyForecast` bridges two
companies and is owned by **both** — a workspace is in-scope when it is
**either** the `sourceCompanyId` **or** the `targetCompanyId`. Reads `AND`
an `OR`-of-both-endpoints onto the where; `findUnique` drops a row when the
workspace is neither endpoint; `create` requires the workspace to be one
endpoint; the by-id write guard allows update/delete/upsert only when an
endpoint matches. Pass-through when there's no workspace cookie (ADMIN /
cron). The `create` rule is why auto-generate works: hotels are read
through the companyId-scoped client, so each draft's `sourceCompanyId` is
the operator's own workspace.

Both cookies are written at login in `app/(auth)/login/actions.ts` from
the user's `companyId` and the resolved `tenantSlug`
(`COMPANY_CODE_TO_TENANT_SLUG` map in `lib/tenancy.ts`). Both are
cleared at logout. The manual workspace switcher
(`app/actions/workspace.ts`) writes both atomically.

## How a read is filtered

`prisma.<model>.findMany(...)` flows through `lib/db.ts`'s `$use`
middleware → `applyWorkspaceScope`:

1. If the model is in `TENANT_SCOPED_MODELS` and a tenant slug is set,
   stamp `where.tenantId = slug`. Return.
2. Else if the model is in `SCOPED_MODELS` and a workspace id is set,
   stamp `where.companyId = workspaceId`. Return.
3. Else pass through unchanged.

`findUnique({where:{id}})` runs the query then drops the row if
`row.tenantId/companyId` doesn't match the active slug/id (id is
unique so we can't pre-filter the where-clause).

## How a write is gated

Same middleware:

- `create` / `createMany`: if `data.tenantId` is unset, stamp it.
  If it's set to a foreign tenant, throw `Cross-tenant create blocked`.
- `updateMany` / `deleteMany`: stamp the where-clause (same as reads).
- `update` / `delete` / `upsert` by `where: {id}`: **Phase F6 by-id
  write guard** runs a findUnique first; if the row's `tenantId`
  doesn't match, throw `Cross-tenant write blocked`. Compound-unique
  where-clauses (like `tenantId_sku_warehouseId`) pass through because
  the unique key already carries the tenant. **The same by-id guard now
  exists on the `companyId` plane** for `SCOPED_MODELS` (throws
  `Cross-workspace write blocked`) — previously the companyId by-id path
  was an explicit pass-through "documented follow-up"; it is now closed,
  so a pinned operator cannot update/delete another company's Hotel /
  DairyBatch / Farm / Program / Transaction / FutureProject /
  SustainabilityScore by guessing its id.

## How to add a new tenant-scoped model

If the model holds business data and a manager from one tenant must
NOT see another tenant's rows, follow this checklist:

1. **Schema** — add `tenantId String` (NOT NULL). Add `@@index([tenantId])`.
   Prefer denormalizing into a string column over a real FK — the
   existing 14 models use the opaque-string pattern for SQLite-to-Postgres
   portability.

2. **Migration** — if backfilling existing rows, follow the
   `prisma/migrations/20260520_add_tenant_id_to_booking_crop` template:
   add the column nullable → backfill from parent → verify zero NULLs →
   set NOT NULL → add index. **Never `ALTER … SET NOT NULL` before
   the backfill** — it will fail loud on the first NULL row.

3. **Middleware** — add the model name to `TENANT_SCOPED_MODELS` in
   `lib/workspaceScope.ts`. Add a vitest case to
   `lib/workspaceScope.test.ts` for the standard read/write shapes.

4. **Server actions** — make sure they use `prisma` (not
   `prismaUnscoped`). The middleware stamps `tenantId` on creates
   automatically; explicit `data.tenantId` is allowed as long as it
   matches the active slug.

5. **Pages** — same rule: `prisma.<model>.findMany(...)`. Don't add a
   manual `where: { tenantId: user.tenantSlug }` — that duplicates the
   middleware and de-syncs over time.

6. **Test** — append a per-tenant count check to
   `scripts/test/test-isolation.ts` so the per-tenant numbers stay visible.

7. **Seed** — if the demo seed creates rows for this model, include
   `tenantId` in the upsert. Prefer hardcoding to the seed's tenant
   slug; resist the urge to derive it lazily.

## What's intentionally NOT scoped

- `User` — companyId is optional; scoping it would break auth (a foreign-
  workspace user.findUnique returning null causes both layouts to redirect
  to /logout).
- `Company`, `Tenant`, `TenantStep`, `TenantTheme`, `TenantPack` — the
  workspace switcher and the superadmin console must see them all.
- `JournalLine`, `PurchaseOrderLine`, `SalesOrderLine` — child rows.
  Filter through the parent (`journalEntry.lines`, `po.lines`, `so.lines`)
  and inherit the parent's tenant.
- `MarketStock` — companyId is optional; the markets surface is
  intentionally cross-company.
- `AIInsight` — NOW scoped via the `SHARED_COMPANY_SCOPED_MODELS` plane
  (Phase ISO-4): NULL companyId = group-wide, else company-pinned. It is a
  shared-company model, not a `TENANT_SCOPED_MODELS` one.
- `Plan`, `ActivityLog` — pre-F3 surfaces with their own scoping rules in
  the workspace pages. Not yet folded into TENANT_SCOPED_MODELS pending audit.

## Per-tenant UX

- Sidebar Operations group is filtered per tenant in
  `components/Sidebar.tsx` via `filterOpsForTenant`. Map lives at the
  top of the same file.
- Per-user theme auto-applies in `app/(app)/layout.tsx`. Lookup order:
  superadmin view-as cookie → user's TenantTheme.preset → Heritage Modern.
- WorkspaceBanner suppression rule: shown on every (app) route when a
  workspace cookie is set, EXCEPT exact `/companies` (the "above all
  workspaces" hub). Path is forwarded from `middleware.ts` via the
  `x-pathname` request header.

## Verifying isolation locally

`npx tsx scripts/test/test-isolation.ts` reads the prod Neon DB and prints
per-tenant counts plus simulated-middleware proofs for Hotel scoping
(F2) and Product scoping (F3). Run after every isolation-relevant
change.

## Known follow-ups (not closed yet)

- The Phase 5 route-permission map (`lib/permissions.ts`) gates routes
  but `H_NERVE_PERMS_ENFORCED` is an env flag — confirm it's `true`
  in production.
- Plan + ActivityLog still use the workspace-pages-explicit filter pattern;
  consider folding into `TENANT_SCOPED_MODELS` after the next pitch.
  (AIInsight is now scoped — Phase ISO-4, see follow-ups below.)

### Isolation audit follow-ups (2026-06-04)

- **`SupplyForecast` — CLOSED (Phase ISO-2).** Decision: a forecast is owned
  by **both** its source and target company; a user whose active workspace
  is `sourceCompanyId` **or** `targetCompanyId` may see/edit it. Implemented
  as the dual-company plane (`DUAL_COMPANY_SCOPED_MODELS`, see above) plus
  an ownership probe in all six `supply-chain/actions.ts` actions
  (`createForecast` ownership + the by-id `setForecastStatus` /
  `deleteForecast` / `restoreForecast` / `approveForecast` / `rejectForecast`
  bail on a null/foreign row).
- **`create`-action HARDEN — CLOSED (Phase ISO-3).** `createBatch` /
  `createProgram` / `createFarm` / `createHotel` / `createProject` now route
  the companyId through `resolveOwnCompanyId(submitted, getActiveWorkspaceId())`
  — a pinned operator is forced to their own workspace, a cross-company
  ADMIN keeps the submitted value — so they are correct by construction,
  not just by the middleware backstop. (`updateCustomer` / `deleteCustomer`
  / `updateWarehouse` take only an `id`, no client tenant/company, and are
  already covered by the F6 by-id guard — no change needed.)
- **`AIInsight` — CLOSED (Phase ISO-4).** `AIInsight` gained a **NULLABLE
  `companyId`** (migration `20260604_insight_scope_company`: add column + FK
  `SetNull` + index; legacy rows backfilled to NULL = group-wide, preserving
  today's shared visibility). Scoped via the new **`SHARED_COMPANY_SCOPED_MODELS`**
  plane: a row is in-scope iff `companyId IS NULL` (group-wide, visible in
  every workspace) **OR** `companyId === activeWorkspace` (mirrors
  `AlertRule.scopeCompanyId`). `createInsight` stamps the author's active
  workspace (ADMIN → NULL = group-wide); `setInsightStatus` / `deleteInsight`
  / `restoreInsight` bail on a null/foreign row; the workspace-signal actions
  `dismissSignal` / `acceptSignal` now use the **scoped** client so a pinned
  MANAGER can no longer flip a foreign company's signal by id. Bulk ops
  (`bulkResolveInsights` / `bulkDeleteInsights`) ride the where-stamped
  `updateMany` / soft-delete path. ADMIN / brain-cron (no workspace) →
  pass-through, sees everything.
