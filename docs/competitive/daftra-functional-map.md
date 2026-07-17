# Daftra — Master Functional Map

Functional module tree of a Daftra ERP tenant, grouped by Daftra's own
app-categories. URLs are the observed route scheme (`/owner/<resource>/<action>`
for legacy screens, `/v2/owner/entity/<entity>/list` for the newer entity
engine). Reproduce the *capabilities*, not the routes.

## App-category buckets

Daftra groups its modules into six top-level app buckets:

- **Sales** — quote-to-cash: estimates, invoices, credit notes, refunds, recurring billing, client payments.
- **CRM** — clients and their contacts.
- **HRM** — employees, roles/permissions.
- **Inventory & Purchases** — products/services, warehouses, stocktaking, requisitions, price lists; purchase invoices, refunds, debit notes, suppliers.
- **Accounting** — journal entries, chart of accounts, cost centers, fixed assets; plus Finance (expenses, incomes, treasuries).
- **Global & Settings** — reports, templates, taxes, numbering, payment methods, API, account config.

## Full module tree

### 1. Sales
| Item | Route | Purpose |
|------|-------|---------|
| Manage Invoices | `/owner/invoices/index` | List/search invoices; filter by status All/Overdue/Due/Unpaid/Draft/Overpaid |
| Create Invoice | `/owner/invoices/add` | New sales invoice |
| Manage Estimates | `/owner/invoices/estimates` | Quotations/estimates list |
| Create Estimate | `/owner/invoices/add_estimate` | New quotation |
| Credit Notes | `/owner/invoices/creditnotes` | Client credit notes |
| Refund Receipts | `/owner/invoices/refund` | Refund receipts against invoices |
| Recurring Invoices | `/owner/invoices/subscriptions` | Subscription/recurring billing schedules |
| Client Payments | `/owner/invoice_payments/index` | Receipts against client invoices |
| Sales Settings | `/v2/owner/sales_settings` | Module config |

### 2. Clients (CRM)
| Item | Route | Purpose |
|------|-------|---------|
| Manage Clients | `/v2/owner/entity/client/list` | Client directory (v2 entity engine) |
| Add New Client | `/owner/clients/add` | New client record |
| Contacts List | `/owner/client_contacts/index` | Individual contacts under business clients |
| Client Settings | `/v2/owner/clients/settings` | Module config |

### 3. Inventory
| Item | Route | Purpose |
|------|-------|---------|
| Products & Services | `/owner/products/index` | Catalog of stock products + non-stock services |
| Manage Requisitions | `/owner/requisitions/index` | Stock requisitions / internal movement requests |
| Price List | `/v2/owner/price_lists` | Multiple price lists per client/segment |
| Warehouses | `/owner/stores/index` | Stores/warehouses; per-warehouse stock |
| Manage Stocktakings | `/v2/owner/entity/stocktaking/list` | Physical count / inventory adjustment sessions |
| Inventory & Products Settings | `/v2/owner/inventory/settings` | Module config |

### 4. Purchases
| Item | Route | Purpose |
|------|-------|---------|
| Purchase Invoices | `/v2/owner/entity/purchase_order/list` | Supplier bills / purchase orders |
| Purchase Refunds | `/v2/owner/entity/purchase_refund/list` | Refunds from suppliers |
| Debit Notes | `/v2/owner/entity/purchase_debit_note/list` | Debit notes to suppliers |
| Manage Suppliers | `/v2/owner/entity/supplier/list` | Supplier directory |
| Suppliers Payments | `/owner/purchase_order_payments/index` | Payments made to suppliers |
| Purchase Settings | `/v2/owner/purchase-invoices/settings` | Module config |

### 5. Finance
| Item | Route | Purpose |
|------|-------|---------|
| Expenses | `/owner/expenses/index` | Recorded outgoing expenses |
| Incomes | `/owner/incomes/index` | Recorded non-invoice incomes |
| Treasuries & Bank Accounts | `/v2/owner/banks/treasury` | Cash treasuries + bank accounts; balances |
| Finance Settings | `/v2/owner/finance_settings` | Module config |

### 6. Accounting
| Item | Route | Purpose |
|------|-------|---------|
| Journal Entries | `/owner/journals/index` | Double-entry journal ledger |
| Add Entry | `/owner/journals/add` | Manual journal entry |
| Chart of Accounts | `/v2/owner/chart-of-accounts` | Hierarchical COA |
| Cost Centers | `/v2/owner/cost-centers` | Cost-center tagging/dimension |
| Assets | `/owner/assets/index` | Fixed assets + depreciation |
| Accounting Settings | `/v2/owner/accounting/settings` | Module config |

### 7. Employees (HRM)
| Item | Route | Purpose |
|------|-------|---------|
| Manage Employees | `/v2/owner/entity/staff/list` | Employee/staff directory |
| Manage Employee Roles | `/owner/roles/index` | Role-based permission sets |
| Settings | `/v2/owner/staff/settings` | Module config |

### 8. Reports
| Item | Route | Purpose |
|------|-------|---------|
| Sales Reports | `/owner/reports/list#invoices` | Revenue, invoice aging, per-client/product |
| Purchases Reports | `/owner/reports/list#purchase_orders` | Spend, per-supplier |
| Accounting Reports | `/owner/reports/list#accounting` | P&L, balance sheet, trial balance, ledgers |
| Clients Reports | `/owner/reports/list#clients` | Statements, balances |
| Store Reports | `/owner/reports/list#inventory` | Stock movement, valuation |
| AIC Consumption Report | `/owner/reports/report/aic_consumption` | Consumption report |
| System Activity Log | `/v2/owner/activity_logs` | Audit trail of user actions |

### 9. Templates
| Item | Route | Purpose |
|------|-------|---------|
| Printable Templates | `/owner/printable_templates/index` | Invoice/doc print layouts |
| Prefilled Templates | `/owner/invoices/templates` | Reusable invoice templates |
| Email Templates | `/owner/email_templates/index` | Transactional email bodies |
| Terms & Conditions | `/owner/terms/index` | Reusable T&C blocks |
| Manage Files/Documents | `/owner/documents/index` | Document/file store |
| Auto Reminder Rules | `/owner/auto_reminder_rules/index` | Automated payment/overdue reminders |

### 10. Settings
| Item | Route | Purpose |
|------|-------|---------|
| Account Information | `/owner/owners/account_info` | Company profile |
| Account Settings | `/settings` | Global preferences |
| SMTP Settings | `/smtp_settings` | Outbound email server |
| Payment Methods | `/owner/payment_gateways/index` | Gateways / manual methods |
| Auto Number Settings | `/owner/numbering/settings` | Document numbering schemes |
| Tax Settings | `/owner/taxes/index` | Tax definitions/rates |
| Apps Manager | `/v2/owner/plugin-manager` | Plugin/app marketplace toggles |
| System Logo & Color | `/?colors=1` | White-label branding |
| API | `/owner/api_keys/dashboard` | API keys / developer access |

## Architecture observations (functional)

- **Two UI generations coexist.** Legacy CakePHP-style routes (`/owner/<ctrl>/<action>`)
  and a newer `/v2/` "entity engine" (`/v2/owner/entity/<entity>/list`) that renders
  generic list/detail/form screens from an entity definition. Newer modules
  (suppliers, purchases, stocktaking, staff, clients-list) are on v2; older
  transactional forms (invoice, journal) remain legacy. **Lesson for H-Nerve:**
  a generic entity/list engine pays off — our Prisma models + a shared list/detail
  scaffold could mirror this.
- **White-label built in** (System Logo & Color) — matches H-Nerve's tenant theming.
- **Plugin/Apps Manager** gates optional modules — mirrors our industry-pack idea.
- **Multi-currency + multi-warehouse + price-lists** are first-class — these are
  the ERP-grade features H-Nerve's Phase 27 should target.
- **Double-entry accounting underneath sales/purchases** — invoices, expenses,
  and payments post to journals against a chart of accounts. This is the biggest
  gap vs. H-Nerve's current transaction ledger.
