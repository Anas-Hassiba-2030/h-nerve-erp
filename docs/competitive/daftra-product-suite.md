# Daftra Product Suite — Public Catalog

Source: Daftra's **public** marketing site (`daftra.com/en`), read 2026-07-17 via
Playwright. This is public product/feature information (module names, feature
bullets, sector solutions, observable tech signals) — **functional facts only**,
no proprietary code/design copied. Pairs with
[daftra-functional-map.md](daftra-functional-map.md) (the in-app module tree read
from the authenticated account) and [hnerve-gap-map.md](hnerve-gap-map.md).

## Full module list (marketed as one Cloud ERP)

| Module | Public page | Core capability |
|--------|-------------|-----------------|
| Billing & Invoicing | `/en/invoicing/` | Invoices, estimates, recurring, taxes, price lists |
| POS | `/en/pos/` | In-store sales, cash sessions, offline desktop app |
| E-Invoice (per country) | `/en/electronic-invoice-{ksa,jo,egy,uae}/` | ZATCA/gov compliance, QR, auto-VAT |
| General Accounting | `/en/finance-accounting/` | **Double-entry**: COA, GL, auto-journals, cost centers, statements |
| Asset Management | `/en/asset-management/` | Fixed assets + depreciation (4 methods) |
| Inventory | `/en/inventory/` | Multi-warehouse, serial/lot/expiry, stocktaking, requisitions |
| Product Management | `/en/product-management/` | Catalog, price lists, barcode |
| Manufacturing | `/en/manufacturing-software/` | **BOM, routing, manufacturing orders, cost rollup** (new — see [manufacturing.md](modules/manufacturing.md)) |
| HRM | `/en/hrm/` | Employee records, org structure, attendance, contracts, requests |
| Payroll | `/en/payroll/` | Salary structures, pay runs, loans, journals→cost centers |
| CRM | `/en/crm/` | Client mgmt, client portal, bookings, loyalty, memberships |
| Client Follow-Up | `/en/client-follow-up/` | Appointments, contracts, attendance, reminders |
| Project Management | feature cat. 26 | Projects + tasks |

## Companion mobile / desktop apps

Daftra Business App · POS App · **POS Desktop (offline)** · Expense Scanner App ·
**ESS App** (employee self-service) · E-Invoice QR Reader App · Stocktaking App.

Takeaway: they ship a *thin-vertical app per persona* (cashier, employee,
stock-counter, expense-submitter) on top of one backend — not one monolith UI.

## Apps Marketplace + developer platform

- **Apps Marketplace** (`apps.daftra.com`) — installable add-ons/plugins.
- **Developers Portal** — public API + integration surface.
- H-Nerve analog: industry packs + integrations hub + Living Protocol (parity).

## Sector solutions (one config per vertical)

50+ industries marketed; named landing pages: Computer Store · Retail Stores ·
Shipping & Logistics · Autoparts Store & Warehousing · Jewelry Store · Mobile
Store · Accounting Firms · Optical Shop. Each is the same engine pre-configured
(fields, price lists, workflows) — the model H-Nerve already uses via industry
packs under `lib/brain/agents/`.

## "AI Automation" surface

Every major module page markets **"Work Faster with AI Automation"** — Daftra has
bolted an AI-assist layer onto invoicing/accounting/POS/inventory. This is
*reactive convenience AI*, not a reasoning layer. **H-Nerve's Brain (causal graph
+ council + planner + memory) is a category above this** — the clearest
differentiation line for the pitch.

## Observable tech stack (reverse-engineered, non-invasive)

Read from public response cookies/headers only — no probing:

| Signal | Reading |
|--------|---------|
| `CakeCookie[portal_language]` | Marketing site on **CakePHP** (PHP) |
| `useRedis` cookie | Redis caching layer |
| `AWSALBTG` / `AWSALBTGCORS` | AWS **Application Load Balancer** (AWS-hosted) |
| Two in-app URL generations | Legacy `/owner/<ctrl>/<action>` (CakePHP MVC) + v2 `/v2/owner/entity/<x>/list` (generic **entity engine**) |
| Trackers | Google Analytics, MS Clarity, TikTok, Bing UET |

**Architectural lesson worth mirroring:** the **v2 entity engine** — generic
list/detail/form rendered from entity definitions. One config-driven CRUD surface
instead of hand-built pages per resource. H-Nerve could adopt this pattern for the
Phase 27 ERP modules to avoid 13 bespoke CRUD screens. Stack itself (PHP/CakePHP)
is *not* worth copying — H-Nerve's Next.js/Prisma/Postgres is more modern.
