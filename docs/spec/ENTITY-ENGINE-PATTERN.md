# Entity-Engine Pattern (Phase 27 CRUD scaffold)

Inspired by Daftra's **v2 entity engine** (`/v2/owner/entity/<x>/list` — generic
list/detail/form rendered from an entity definition instead of one hand-built
page per resource). See [docs/competitive/daftra-product-suite.md](../competitive/daftra-product-suite.md).

**Not adopted as-is.** Daftra's engine is schema-less (JSON entity defs, PHP
runtime). H-Nerve's doctrine is typed Prisma models + `String` columns/TS unions
(CLAUDE.md) — a dynamic schema-less entity table would fight that. What's worth
copying is the *shape*: one generic list/detail/form + server-action factory,
config-driven per resource, instead of 13 bespoke CRUD screens for Phase 27.

## Correction to hnerve-gap-map.md

Prior gap-map claim ("biggest gap = double-entry accounting, none exists") is
**stale**. Current schema already has it: `LedgerAccount` / `JournalEntry` /
`JournalLine` / `FinancialPeriod` ([prisma/schema/finance.prisma](../../prisma/schema/finance.prisma)),
plus `Supplier` / `Customer` / `PurchaseOrder` / `SalesOrder`
([prisma/schema/inventory.prisma](../../prisma/schema/inventory.prisma) +
`finance.prisma`). The real remaining gap for Sales/Billing is narrower than
mapped: **Invoice, Estimate, tax rates, document numbering** — Daftra's `Client`
concept is already covered by the existing `Customer` model (tenant-scoped,
`tenantId` opaque string, same family as `Product`/`Supplier`).

## 1. Config layer (`lib/entity/*.ts`, new pillar folder)

```ts
// lib/entity/types.ts
export interface EntityField<T> {
  key: keyof T & string
  label: { ar: string; en: string }
  type: "text" | "number" | "money" | "date" | "select" | "relation"
  required?: boolean
  options?: { value: string; label: { ar: string; en: string } }[] // for "select"
  relation?: { model: string; labelKey: string }                   // for "relation"
  listColumn?: boolean   // show in the generic list table
}

export interface EntityConfig<T> {
  name: string                 // "invoice"
  labelAr: string              // "الفواتير"
  labelEn: string
  fields: EntityField<T>[]
  statuses?: string[]          // "DRAFT" | "SENT" | "PAID" | ... (String enum, per house rule)
  numbering?: { prefix: string; padTo: number } // "INV-000001"
}
```

```ts
// lib/entity/invoice.config.ts
import type { EntityConfig } from "./types";
import type { Invoice } from "@prisma/client";

export const invoiceEntity: EntityConfig<Invoice> = {
  name: "invoice",
  labelAr: "الفواتير",
  labelEn: "Invoices",
  statuses: ["DRAFT", "UNPAID", "DUE", "OVERDUE", "PAID", "OVERPAID", "CANCELLED"],
  numbering: { prefix: "INV-", padTo: 6 },
  fields: [
    { key: "invoiceNumber", label: { ar: "رقم الفاتورة", en: "Invoice #" }, type: "text", listColumn: true },
    { key: "customerId", label: { ar: "العميل", en: "Client" }, type: "relation",
      relation: { model: "Customer", labelKey: "name" }, listColumn: true, required: true },
    { key: "issueDate", label: { ar: "تاريخ الإصدار", en: "Issue Date" }, type: "date", listColumn: true },
    { key: "status", label: { ar: "الحالة", en: "Status" }, type: "select", listColumn: true,
      options: [/* mirrors statuses above */] },
    { key: "total", label: { ar: "الإجمالي", en: "Total" }, type: "money", listColumn: true },
  ],
};
```

## 2. Generic pieces the config drives

- `<EntityList config={invoiceEntity} rows={...} />` — Heritage Modern table,
  reads `listColumn` fields, renders `.badge-*` for `status`, `formatMoney()` for
  `type: "money"`.
- `<EntityForm config={invoiceEntity} action={createInvoice} />` — generic form
  builder; still submits to a **hand-written server action** (business rules —
  tax calc, numbering, journal posting — are not generic).
- `makeListAction(config)` — factory for the read-only list query (tenant-scoped
  via `prisma`, respects `deletedAt`).

**What stays hand-written per resource** (by design — matches "Server Actions
are the default for CRUD" in CLAUDE.md): `createX`/`updateX`/`deleteX` actions,
since Invoice creation must compute tax, apply numbering, and post a
`JournalEntry` — logic no generic engine should own. The engine kills
boilerplate (list table, form scaffold, column labels), not business logic.

## 3. First concrete gap this unlocks: Invoice

New models — `prisma/schema/finance.prisma` (same file as the existing
Accounting block; Invoice is downstream of `Customer` + `LedgerAccount`,
already there):

```prisma
// =====================================================================
// INVOICE — Sales/Billing (Phase 27). Tenant-scoped opaque tenantId,
// same family as Product/Supplier/Customer/LedgerAccount. Posts a
// JournalEntry on issue (AR debit / Revenue credit) — reuses the
// existing double-entry engine, does not duplicate it. Numbering via
// NumberingScheme (below), not generateNumber() — Daftra-style
// per-doc-type configurable sequences, a genuine gap.
// =====================================================================
model Invoice {
  id            String   @id @default(cuid())
  tenantId      String
  invoiceNumber String
  customerId    String
  // DRAFT | UNPAID | DUE | OVERDUE | PAID | OVERPAID | CANCELLED
  status        String   @default("DRAFT")
  issueDate     DateTime @default(now())
  dueDate       DateTime?
  currency      String   @default("JOD")
  // Decimal(12,2) — Postgres-prod convention (see Product.unitCost).
  subtotal      Decimal  @default(0)
  taxTotal      Decimal  @default(0)
  total         Decimal  @default(0)
  note          String?

  // Set once the AR/Revenue journal posts (issue-time). Null while DRAFT.
  journalEntryId String?  @unique
  journalEntry   JournalEntry? @relation(fields: [journalEntryId], references: [id])

  customerRef   Customer @relation(fields: [customerId], references: [id])
  lines         InvoiceLine[]

  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([tenantId, invoiceNumber])
  @@index([tenantId, status])
  @@index([tenantId, customerId])
  @@index([tenantId, issueDate])
}

model InvoiceLine {
  id         String   @id @default(cuid())
  invoiceId  String
  productId  String?
  description String
  quantity   Decimal  @default(1)
  unitPrice  Decimal  @default(0)
  taxRateId  String?
  lineTotal  Decimal  @default(0)

  invoice    Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product    Product?  @relation(fields: [productId], references: [id])
  taxRate    TaxRate?  @relation(fields: [taxRateId], references: [id])

  @@index([invoiceId])
  @@index([productId])
}

// =====================================================================
// TAX RATE — Config prerequisite (Daftra: Tax Settings). Blocks real
// invoicing until it exists — see hnerve-gap-map.md build order #1.
// =====================================================================
model TaxRate {
  id        String   @id @default(cuid())
  tenantId  String
  name      String   // "16% GST", "0% Exempt"
  rate      Decimal  // 0.16
  active    Boolean  @default(true)

  invoiceLines InvoiceLine[]

  @@unique([tenantId, name])
  @@index([tenantId, active])
}

// =====================================================================
// NUMBERING SCHEME — Config prerequisite (Daftra: Auto Number Settings).
// Per-tenant, per-doc-type sequence — generateNumber() (lib/utils/utils.ts)
// is a one-shot generator with no persisted counter/prefix config; this
// is the gap that blocks configurable numbering per Daftra parity.
// =====================================================================
model NumberingScheme {
  id        String   @id @default(cuid())
  tenantId  String
  docType   String   // "INVOICE" | "ESTIMATE" | "PURCHASE_ORDER" | ...
  prefix    String   @default("")
  nextValue Int      @default(1)
  padTo     Int      @default(6)

  @@unique([tenantId, docType])
}
```

Register `Invoice`, `InvoiceLine`, `TaxRate`, `NumberingScheme` in
`TENANT_SCOPED_MODELS` (`src/lib/tenancy/workspaceScope.ts`) alongside
`Product`/`Customer`/`LedgerAccount`. Add `"invoice"` is **not** a valid
`SoftEntity` (`src/lib/db/softDelete.ts` union is `task|project|insight|forecast`)
— per the CLAUDE.md rule, flash toasts on Invoice actions use `entity: "info"`
until/unless Invoice is deliberately added to that union.

## 4. Build order (supersedes the old #6 "COA + Journal engine" step — already built)

1. **TaxRate + NumberingScheme** (config prerequisites — unchanged from gap map).
2. **Invoice + InvoiceLine**, `app/(app)/invoices/actions.ts`: `createInvoice`
   computes line totals + tax, allocates from `NumberingScheme`, posts a
   `JournalEntry` (AR debit / Revenue credit) through the *existing*
   `lib/finance` posting helpers — no new ledger engine needed.
3. **Estimate** (near-identical shape, `convertToInvoice` action).
4. Entity-engine list/form scaffold (`lib/entity/`) built alongside Invoice,
   then reused for Estimate/Supplier-facing Purchase Invoice — the payoff
   compounds after the second resource, not the first.
