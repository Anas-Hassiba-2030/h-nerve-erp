# Daftra → H-Nerve Gap Map

What H-Nerve already has vs. what Daftra covers, per area. Feeds the Phase 27 ERP
backlog. Legend: ✅ parity · 🟡 partial · 🔴 missing.

> **Corrected 2026-07-17.** Prior version claimed Accounting/Purchases/Inventory
> catalog were 🔴 missing. They are not — `prisma/schema/finance.prisma` and
> `inventory.prisma` already have `LedgerAccount`/`JournalEntry`/`JournalLine`/
> `FinancialPeriod` (double-entry) and `Product`/`Supplier`/`Customer`/
> `PurchaseOrder`/`SalesOrder`. Rows below reflect actual schema state. See
> [ENTITY-ENGINE-PATTERN.md](../spec/ENTITY-ENGINE-PATTERN.md) for the real
> remaining gap (Invoice/Estimate/tax/numbering) and a concrete Prisma sketch.

| Area | Daftra capability | H-Nerve today | Status | Phase 27 action |
|------|-------------------|---------------|--------|-----------------|
| **Auth / RBAC** | Employees + roles + granular per-module perms | SessionUser roles, route RBAC, admin users | ✅ / 🟡 | Add per-module permission grants |
| **CRM — accounts** | Client (individual/business) + contacts + statements | Companies/tenants; Lead/Opportunity draft (PR #280) | 🟡 | Add Client + Contact entities, statement of account |
| **CRM — client portal** | Branded self-service portal, service bookings, appointments | none | 🔴 | Client portal + booking/appointment entities |
| **CRM — loyalty** | Loyalty points + memberships/subscriptions + SLA | none | 🔴 | Loyalty/points + membership plans |
| **Sales — invoicing** | Invoice w/ line items, tax, discount, statuses | none (Transaction is a generic ledger row, not an invoice doc) | 🔴 | **Invoice + InvoiceLine, posts to existing JournalEntry engine** — see [ENTITY-ENGINE-PATTERN.md](../spec/ENTITY-ENGINE-PATTERN.md) |
| **Sales — estimates** | Estimate → invoice conversion | none | 🔴 | Estimate entity + convert action |
| **Sales — credit/refund** | Credit notes, refund receipts | none | 🔴 | Credit note + refund entities |
| **Sales — recurring** | Subscription/recurring invoices | none | 🔴 | Recurring schedule + generator job |
| **Payments** | Client payments applied to invoices, treasury | none | 🔴 | Payment entity + treasury posting |
| **Inventory — catalog** | Products & services, SKU, pricing | `Product` model (tenant-scoped, warehouse-linked) | ✅ | — |
| **Inventory — stock** | Multi-warehouse, stocktaking (recorded vs actual), requisitions (in/out) | `Warehouse` + `InventoryMovement` (append-only ledger) exist; no stocktaking-count or requisition UI | 🟡 | Stocktaking session + requisition workflow on top of existing movement ledger |
| **Inventory — traceability** | Serial number, lot & expiry tracking, avg-cost | none (Product has no serial/lot fields) | 🔴 | Serial/lot/expiry fields + moving-average cost |
| **Manufacturing** | BOM, routing, mfg orders, stage/workstation, cost rollup | none (DairyBatch is closest) | 🔴 | BOM + manufacturing-order engine (seed from DairyBatch) |
| **Inventory — pricing** | Price lists per segment | none | 🔴 | Price list entity |
| **Purchases** | Purchase invoices, refunds, debit notes, suppliers, payments | `Supplier` + `PurchaseOrder`/`PurchaseOrderLine` exist; no purchase-invoice/payables doc | 🟡 | Purchase Invoice (mirror of Sales Invoice) + debit note + payables |
| **Finance — cash** | Expenses, incomes, treasuries/banks, transfers, cheque cycle | `Transaction` ledger, group P&L | 🟡 | Split into expense/income + treasury + cheque cycle |
| **HR — payroll** | Salary structures, pay runs, loans, attendance, ESS, contracts | roles/RBAC only | 🔴 | Payroll engine (posts to cost centers/journals) |
| **Accounting — double-entry** | COA, journal entries, cost centers | `LedgerAccount` + `JournalEntry` + `JournalLine` + `FinancialPeriod` (`finance.prisma`) — real double-entry, posted entries immutable | ✅ | Already built. Invoice/Payroll/Payables should **post into this**, not duplicate it |
| **Accounting — assets** | Fixed assets + depreciation (straight-line, declining-balance, units-of-production) | none | 🔴 | Asset entity + multi-method depreciation schedule |
| **Reports — financial** | Trial balance, P&L, balance sheet, ledgers | dashboards + Brain insights; ledger data exists but no statement views | 🟡 | Statement views reading off the existing `JournalLine` data |
| **Reports — operational** | Sales/purchase/stock/client reports | sector dashboards | 🟡 | Fill per-domain report set |
| **Config — tax** | Tax definitions + rates | none | 🔴 | Tax engine (blocks real invoicing) |
| **E-invoicing (gov)** | ZATCA(KSA)/JO/EGY/UAE compliance, QR, auto-VAT | none | 🔴 | Regional e-invoice compliance (if selling in KSA/JO) |
| **POS** | In-store sales, cash sessions, offline desktop app, loyalty | none | 🔴 | POS surface + cash-session engine |
| **Config — numbering** | Auto-number schemes | `generateNumber()` | 🟡 | Configurable per-doc numbering |
| **Config — payment methods** | Gateways + manual methods | none | 🔴 | Payment method registry |
| **Comms** | SMTP, email templates, reminder rules | Workflows engine (no email) | 🟡 | Wire SMTP + email templates to Workflows |
| **Docs / files** | Central document store | Document Intelligence + ledger | ✅ | — |
| **White-label** | Logo & color | tenant theming | ✅ | — |
| **Apps / plugins** | Apps Manager marketplace | industry packs + integrations hub | ✅ | — |
| **API** | API keys | Living Protocol + OpenAPI | ✅ | — |

## Recommended Phase 27 build order (corrected — accounting engine already built)

Dependency-ordered — each unlocks the next:

1. **TaxRate + NumberingScheme** (config prerequisites — genuine gap, blocks real invoicing).
2. **Invoice + InvoiceLine** — posts into the *existing* `JournalEntry`/`LedgerAccount`
   engine (AR debit / Revenue credit). Uses the *existing* `Customer` model as
   the bill-to (Daftra's "Client" ≈ H-Nerve's `Customer`, already tenant-scoped).
   See [ENTITY-ENGINE-PATTERN.md](../spec/ENTITY-ENGINE-PATTERN.md) for the sketch.
3. **Payments + Treasury**, applied against Invoice.
4. **Estimate** (near-identical shape to Invoice, `convertToInvoice` action).
5. **Purchase Invoice + payables** — mirror of Invoice against the *existing*
   `Supplier`/`PurchaseOrder`, posts AP.
6. **Financial statement views** (P&L, balance sheet, trial balance) — read off
   the *existing* `JournalLine` data, no new engine.
7. **Inventory**: stocktaking-count + requisition workflow on the *existing*
   `InventoryMovement` ledger; serial/lot/expiry fields; price lists.
8. **Fixed assets + multi-method depreciation** (genuinely greenfield).
9. Optional / vertical-driven: **Manufacturing** (BOM/orders — seed from DairyBatch),
   **Payroll** (posts to journals/cost centers), **POS**, **Client portal + loyalty**,
   **regional e-invoicing** (ZATCA/JO if Hourani needs gov compliance).

> **Pitch note — do NOT copy their AI.** Daftra markets "AI Automation" as reactive
> convenience (auto-fill, suggestions). H-Nerve's Brain (causal graph + council +
> planner + memory) is a reasoning layer a category above. Match Daftra on ERP
> breadth; win on intelligence depth. See
> [daftra-product-suite.md](daftra-product-suite.md) for the full public catalog +
> observable tech stack (CakePHP/Redis/AWS + the v2 entity-engine pattern worth
> mirroring for config-driven CRUD).

Build each in the Heritage Modern design language, tenant-scoped, with our own
Prisma models and server actions — informed by this map, not copied from Daftra.

## Cross-reference
Aligns with `docs/ERP-KNOWLEDGE-BASE.md` (the NetSuite/Bradford/Odoo 13-module
study) and [docs/spec/ENTITY-ENGINE-PATTERN.md](../spec/ENTITY-ENGINE-PATTERN.md)
(the CRUD-scaffold pattern + first concrete Invoice sketch). Daftra is the
*Arabic-market, SMB-scale* reference; NetSuite is the *enterprise framework*
reference. Use both.

Note: an earlier draft referenced `docs/spec/PHASE-27-ERP-MODULES.md` — that
file does not exist in this repo; the pointer above is the real one.
