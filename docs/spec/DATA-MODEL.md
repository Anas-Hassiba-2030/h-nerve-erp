# H-Nerve — Data Model / ERD

> **Source of truth for fields & types:** `prisma/schema.prisma` (PostgreSQL, 72 models).
> This document is the **narrative ERD**: it explains the *shape, relationships,
> invariants, and lifecycle rules* the schema cannot make obvious. Read this to
> understand the model; read `schema.prisma` for the exact columns. Do **not**
> duplicate field lists here — they drift. Owner: platform. Last-updated: 2026-06-02.
>
> Part of the spec set defined in `docs/governance/RE-INFRASTRUCTURE-PLAN.md` §3.

---

## 1. Conventions & invariants (the rules a developer must not guess)

These hold across the whole schema. Verified against `prisma/schema.prisma`.

- **IDs:** primary keys are `String @id @default(cuid())` (75 models). Treat IDs
  as opaque; never parse or order by them. ID-shape validation lives in
  `lib/authz.ts → isSafeId()`.
- **No Prisma enums — string columns + TS unions.** Role, status, sector, tier,
  kind, register, etc. are **plain `String` columns**, with the allowed values
  expressed as TypeScript unions in code (e.g. `Role = "ADMIN" | "EXECUTIVE" |
  "MANAGER" | "STAFF"`). This is a hard rule (SQLite-origin compatibility). When
  adding a status field, add a `String` column + a TS union, never a Prisma enum.
- **Soft delete (21 models):** rows carry `deletedAt DateTime?`. "Deleting" sets
  the timestamp; the row moves to the Trash module before permanent cleanup
  (`lib/softDelete.ts`, `lib/cleanupSoftDeletes.ts`). **Every list query on a
  soft-deletable model must filter `where: { deletedAt: null }`.** Forgetting
  this is the most common bug class here.
- **Timestamps:** most models carry `createdAt DateTime @default(now())`; some
  also `updatedAt DateTime @updatedAt`. The Time Machine (`lib/timemachine.ts`)
  reads `createdAt` against the `as-of` cursor for point-in-time views.
- **Money & numbers:** stored as `Float`/`Int` (no Decimal type in use). Format
  only at the edge via `lib/utils.ts` (`formatMoney`, `formatNumber`).
- **Bilingual columns:** user-facing names are paired — `name` (Arabic, canonical)
  + `nameEn` (English, often optional). The Arabic column is the source of truth;
  English is a secondary label.

---

## 2. The two isolation mechanisms (CRITICAL — read before any query)

H-Nerve is multi-tenant. Isolation is enforced by Prisma `$use` middleware
(`lib/db.ts`) driving the **pure** decision function in `lib/workspaceScope.ts`.
There are **two distinct keys**, and a model belongs to at most one set:

### 2a. Company-scoped (`SCOPED_MODELS`) — keyed by required `companyId`
`Hotel, DairyBatch, Farm, Program, Transaction, FutureProject, SustainabilityScore`.
Filtered by the active **workspace company id** (`h_nerve_workspace` cookie).

### 2b. Tenant-scoped (`TENANT_SCOPED_MODELS`) — keyed by opaque `tenantId` string
`Product, Supplier, Customer, Warehouse, PurchaseOrder, SalesOrder,
InventoryMovement, LedgerAccount, FinancialPeriod, JournalEntry,
TenantImportMapping, BrainInsight, Booking, Crop, CouncilDiscussion,
CouncilReply, ProtocolClause`.
Filtered by **`Tenant.slug`** (`h_nerve_tenant` cookie). `tenantId` is an opaque
string slug, **not** a FK to `Tenant`.

### The invariant that makes this safe
> When the workspace/tenant cookie is **null**, OR the model is in **neither**
> set, query params pass through **unchanged** — the app behaves byte-identically
> to single-tenant. This pass-through is the first thing the unit tests assert.

**Deliberately NOT scoped** (and why — see `workspaceScope.ts` header):
- `User`, `MarketStock` — `companyId` is optional; scoping `User` would break
  auth (`findUnique` returns null in a foreign workspace → forced logout).
- `Company`, `Tenant` — the workspace switcher must see all of them.
- `Booking`, `Crop` — no `companyId`; isolated via a **denormalized `tenantId`**
  backfilled from their parent Hotel/Farm (Phase F4 migration).

**Escape hatch:** `prismaUnscoped` bypasses all scoping. Every call site **must**
carry a `// CROSS-TENANT INTENT:` comment (Empire dashboard, workspace switcher,
system-dump, brain cron, layout banner lookups). New tenant-keyed models go in
`TENANT_SCOPED_MODELS`. Full checklist: `docs/architecture/ISOLATION.md`.

---

## 3. Domain map (72 models in 11 domains)

The schema clusters into these domains. Arrows show the principal ownership FK
(`A → B` = B belongs to A). Field-level detail: `schema.prisma` line refs noted.

### Identity & Organization
- **User** (L18) — operator. `role` string-union; gamification fields (`rank`,
  `xp`, `bonusPercent`, `loginCount`). Optional `companyId`. Auth via
  iron-session, password via bcrypt (`lib/auth.ts`).
- **Company** (L70) — the canonical org unit. `sector` string-union
  (HOSPITALITY/DAIRY/AGRICULTURE/EDUCATION/…). Company → Hotel/DairyBatch/Farm/
  Program/Transaction/FutureProject/SustainabilityScore.
- **Tenant** (L1156) + **TenantStep**, **TenantTheme**, **TenantPack** — white-label
  layer (Phase 11). `Tenant.slug` is the opaque key for tenant-scoped models.
  `TenantTheme.preset` drives palette overrides; `TenantPack` enables industry packs.
- **RolePermission** (L1236) — flag-gated path access (global config, read via
  `prismaUnscoped`; enforced in the `(app)` layout when `H_NERVE_PERMS_ENFORCED`).

### Sector verticals
- **Hospitality:** Hotel (L108) → Booking (L127, tenantId-denormalized).
- **Dairy:** DairyBatch (L159).
- **Agriculture:** Farm (L182) → Crop (L203, tenantId-denormalized).
- **Education:** Program (L228).

### Supply chain & Inventory (tenant-scoped)
- **Product** (L1593), **Warehouse** (L1698), **InventoryMovement** (L1648),
  **Supplier** (L1861), **Customer** (L1890).
- **PurchaseOrder** (L1759) → **PurchaseOrderLine** (L1789);
  **SalesOrder** (L1812) → **SalesOrderLine** (L1835).
- **SupplyForecast** (L249, company-scoped), **TenantImportMapping** (L1725).
- Cross-tenant supply bridge: a buyer-tenant's PO can reference a supplier whose
  `linkedTenantId` points at the supplier-tenant (surfaced read-only in `/workspace`).

### Finance (tenant-scoped ledger)
- **LedgerAccount** (L1916), **FinancialPeriod** (L1937), **JournalEntry** (L1953)
  → **JournalLine** (L1975) — double-entry ledger.
- **Transaction** (L284, company-scoped), **MarketStock** (L411),
  **FutureProject** (L387), **SustainabilityScore** (L434).

### The Brain (read-mostly — see §4)
- Graph: **BrainNode** (L628), **BrainEdge** (L655).
- Council: **CouncilSession** (L726) → **CouncilVoice** (L752);
  **CouncilDiscussion** (L690) → **CouncilReply** (L712) (tenant-scoped, operator-shared).
- Output & planning: **Narrative** (L783, carries Phase 22 trust telemetry),
  **Plan** (L820) → **PlanStep** (L867).
- Learning: **Memory** (L906, vector recall), **BrainFeedback** (L947),
  **BrainPattern** (L974), **BrainIQHistory** (L1078), **BrainWeight** (L1098),
  **SelfTuningReport** (L1119), **AIInsight** (L309), **BrainInsight** (L1495).
- Federation: **FederationOptIn** (L1008), **FederationPeer** (L1026),
  **FederationPattern** (L1044).

### Collaboration & Team
- **MessageThread** (L494) → **ThreadParticipant** (L513), **Message** (L529).
- **Task** (L327), **Pin** (L557), **ActivityLog** (L578), **Digest** (L604),
  **AlertRule** (L459), **Achievement** (L357) → **UserAchievement** (L372).

### Workflows & Integrations
- **Workflow** (L1248) → **WorkflowNode** (L1269), **WorkflowEdge** (L1293),
  **WorkflowRun** (L1306).
- **Integration** (L1330) → **IntegrationCredential** (L1358), **IntegrationLog** (L1368).

### Documents & Import
- **Document** (L1392) → **DocExtraction** (L1440), **DocClause** (L1455).
- **ImportLog** (L1520) → **ImportRow** (L1554).

### Governance
- **ProtocolClause** (L2000) — the Living Protocol constitution (tenant-scoped,
  Phase 20).

---

## 4. The Brain data model — special rules

The Brain is **read-mostly by contract** (`lib/brain/README.md`). Its tables are
written by the brain engine + narrator, but the brain **never mutates domain
data** (Hotels, Transactions, …) directly — those go through server actions.

- **BrainNode / BrainEdge** = the causal knowledge graph. Edges carry `weight`,
  `confidence`, and `kind` ("causal" | "learned" | "manual"). This is the
  substrate for Graph RAG (see RE-INFRASTRUCTURE-PLAN §2, priority 4).
- **Narrative** — cached LLM output keyed by `@@unique([scope, topic, register,
  locale, factsHash])`. Carries Phase 22 trust telemetry (`trustScore`,
  `trustLabel`, `claimsTotal`, `claimsMatched`). `scope` is the tenancy key here.
- **Memory** — episodic recall; `vectorJson` holds the embedding (today a
  bag-of-words vector; the RAG plan upgrades this to pgvector `vector(N)`).
- **Federation*** — cross-tenant anonymized pattern learning. **Security note:**
  this is the corpus-poisoning surface flagged in RE-INFRASTRUCTURE-PLAN §2/§7;
  never let raw tenant data cross via these tables — only anonymized patterns.

---

## 5. Keeping this accurate

- `schema.prisma` is authoritative for fields; this doc is authoritative for
  *rules and relationships*. When you add a model: (1) decide its isolation set
  (§2), (2) note soft-delete + status conventions (§1), (3) add it to the domain
  map (§3) in the same PR.
- A future enhancement (RE-INFRASTRUCTURE-PLAN §1): a small script that parses
  `schema.prisma` and emits the field-level reference automatically, so the
  inventory never drifts. Until then, the line refs above are the index.
