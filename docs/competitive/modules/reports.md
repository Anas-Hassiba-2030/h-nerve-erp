# Reports Module

Read-only analytics over the transactional data. Grouped by domain; all render
from `/owner/reports/list#<section>`.

## Report families (observed nav)

### Sales Reports (`#invoices`)
Revenue over period, invoice aging (overdue/due), sales by client, sales by
product/service, tax collected, sales-by-staff.

### Purchases Reports (`#purchase_orders`)
Spend over period, purchases by supplier, payables aging, tax paid.

### Accounting Reports (`#accounting`)
Trial balance, P&L (income statement), balance sheet, general ledger, account
statements — all derived from journals + COA.

### Clients Reports (`#clients`)
Client statements of account, client balances, top clients.

### Store / Inventory Reports (`#inventory`)
Stock on hand, stock movement, inventory valuation, low-stock, per-warehouse.

### AIC Consumption Report
A consumption-specific report (`/owner/reports/report/aic_consumption`).

### System Activity Log (`/v2/owner/activity_logs`)
Audit trail: who did what, when — per user/entity.

## H-Nerve mapping
H-Nerve has dashboards + the Brain's narrative/insight surfaces but **no
formal financial statements** (trial balance / P&L / balance sheet) because it
lacks double-entry. Report parity is downstream of the Accounting gap. The
activity log maps to H-Nerve's audit needs. See
[hnerve-gap-map](../hnerve-gap-map.md).
