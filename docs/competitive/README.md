# Competitive Functional Study — Daftra ERP

**Purpose.** A functional blueprint of what a mature Arabic-first accounting/ERP
platform (Daftra) covers, so H-Nerve can decide *what to build* without
reinventing the wheel. This is a **functional map** — module trees, entities,
fields, workflows, and states, written in our own words.

**What this is NOT.** No Daftra HTML/CSS, design assets, code, or copyrighted
UI expression is copied here. Ideas and functional facts (module lists, that an
invoice has line items + tax) are free to study and reimplement; creative
expression is not, and none is reproduced. Build H-Nerve's own implementation
in the Heritage Modern design language — this only informs *scope*.

**Method.** Two sources, both functional-facts-only. (1) Screens of a live Daftra
account were walked and read for functional structure (module names, field labels,
workflow states) — field lists marked **(observed)** were read from the create
forms. (2) Daftra's **public marketing site** (`daftra.com`) was read via Playwright
for the full product catalog + feature bullets → [daftra-product-suite.md](daftra-product-suite.md).
Lists marked **(standard)** are the conventional shape of that entity in any
accounting ERP and should be verified before building. Observable tech signals
(CakePHP/Redis/AWS) were read from public response cookies only — no probing.

## Files

| File | Sector / area |
|------|---------------|
| [daftra-functional-map.md](daftra-functional-map.md) | Master module tree + app-category grouping + every submenu and its purpose (from the authenticated app) |
| [daftra-product-suite.md](daftra-product-suite.md) | **Full public catalog** — every module + companion app + sector solution + observable tech stack (from daftra.com) |
| [modules/manufacturing.md](modules/manufacturing.md) | Manufacturing — BOM, routing, manufacturing orders, cost rollup |
| [modules/sales.md](modules/sales.md) | Sales — invoices, estimates, credit notes, refunds, recurring, payments |
| [modules/clients-crm.md](modules/clients-crm.md) | Clients / CRM — client records, contacts |
| [modules/inventory.md](modules/inventory.md) | Inventory — products & services, warehouses, requisitions, price lists, stocktaking |
| [modules/purchases.md](modules/purchases.md) | Purchases — purchase invoices, refunds, debit notes, suppliers, supplier payments |
| [modules/finance.md](modules/finance.md) | Finance — expenses, incomes, treasuries & bank accounts |
| [modules/accounting.md](modules/accounting.md) | Accounting — journal entries, chart of accounts, cost centers, fixed assets |
| [modules/hrm-employees.md](modules/hrm-employees.md) | HRM — employees, roles/permissions |
| [modules/reports.md](modules/reports.md) | Reports — sales, purchases, accounting, clients, store, activity log |
| [modules/templates-settings.md](modules/templates-settings.md) | Templates + Settings — printables, emails, terms, taxes, numbering, payment methods, API |
| [hnerve-gap-map.md](hnerve-gap-map.md) | Each Daftra area mapped to H-Nerve: have / partial / missing → Phase 27 backlog |

**App-category grouping** (Daftra's own top-level app buckets): Sales · CRM ·
HRM · Inventory & Purchases · Accounting · Global & Settings.
