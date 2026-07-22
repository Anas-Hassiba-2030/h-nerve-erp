# What H-Nerve is still missing for مجموعة الحوراني

Audited 2026-07-22 against the live schema (`prisma/schema/*.prisma`, 27 files,
~110 models) and the shipped consoles. This is the honest list — what a Hourani
finance manager, warehouse supervisor, or GM would ask for on day one and not
find.

Read with `docs/ERP-KNOWLEDGE-BASE.md` (the module taxonomy) and
`docs/competitive/hnerve-gap-map.md` (the Daftra comparison).

---

## 1. What is genuinely built

Not a wish list — every item below has a schema, a console, and tests.

| Area | State |
|---|---|
| Double-entry accounting | Chart of accounts, journal, periods, statements. Posting goes through `createPostedJournalEntry()` (D1-safe DRAFT→flip) |
| Sales cycle | Estimate → Sales order → Invoice → Payment, with Jordanian e-invoicing |
| Purchase cycle | PO → Receipt → Purchase invoice → Supplier payment |
| Treasury | Cash boxes + bank accounts, both directions of payment |
| Inventory | Products, warehouses, append-only movement ledger, transfers |
| Replenishment | Min/max/multiple reorder rules → one-click draft POs |
| MPS | Rolling demand forecast, opening-stock rollforward, single-level BOM explosion |
| Manufacturing | BOMs, work centers, routing operations with a dependency DAG, alternative centers, auto duration from history, byproducts, scrap ledger |
| Lots & expiry | `StockLot`, FEFO issuing, quarantine, value-at-risk *(PR #324)* |
| CRM | Lead → Opportunity pipeline, WON creates the customer account *(PR #280)* |
| POS | Cash sessions, sales, lines |
| Fixed assets | Register + monthly depreciation |
| HR | Employees, leave requests, payroll runs, payslips |
| Intelligence | Causal graph, council, simulator, planner, memory, RAG over tenant documents |

---

## 2. The real gaps, ranked by what Hourani actually operates

### 🔴 Blocking — a controller would call the system incomplete

**1. Bank reconciliation.**
`Treasury` and `Payment` exist, but there is no `BankStatement` / statement line
/ matching. Month-end close today is manual: someone eyeballs the bank PDF
against the ledger. Every real ERP has this, and it is the single most-used
finance screen after invoicing.
→ New: `BankStatement`, `BankStatementLine`, an auto-match engine (amount +
date window + reference fuzzy match), and a reconcile console.

**2. Cost centres / analytic dimensions.**
`JournalLine` carries an account and an amount, and nothing else. The group runs
**four different businesses** — you cannot ask "what did the Amman hotel cost me
this month, separately from the dairy plant" from the ledger itself. Today that
answer comes from `Company`-keyed `Transaction` rows, which is a parallel,
non-reconciling truth.
→ Add an analytic dimension (`costCenterId`, and probably `projectId`) to
`JournalLine`, plus a dimension-filtered P&L.

**3. AR/AP ageing + credit control.**
No ageing buckets, no customer credit limit, no dunning. For a group selling
dairy on credit to supermarkets, "who owes me money and for how long" is the
question the owner asks first.
→ Ageing report from existing invoice/payment data (cheap — no schema change),
then `Customer.creditLimit` + a block/warn on new orders.

**4. Multi-currency with FX revaluation.**
`currency` columns default to `"JOD"` everywhere, but nothing converts, and
nothing revalues an open foreign-currency balance at period end. The moment the
group imports equipment in USD or EUR, the books are wrong.
→ `ExchangeRate` table, rate-at-transaction stamping, a period-end revaluation
journal.

### 🟠 High value — visible in a demo, painful in production without it

**5. Maintenance.**
`FixedAsset` exists, but there is no maintenance order, no preventive schedule,
no downtime log. A dairy plant with pasteurisers and a hotel with chillers runs
on preventive maintenance; the manufacturing module already models work centres,
so the hook is right there.
→ `MaintenanceRequest` / `MaintenanceOrder` linked to both `FixedAsset` and
`WorkCenter`; a work order takes its centre offline.

**6. Quality management (QMS).**
Lots can now be quarantined *(PR #324)*, but there is no inspection point, no
test template, no pass/fail record. Dairy is a regulated food business — QC
results are a legal record, not a nice-to-have.
→ `QualityCheckPoint` (on receipt / on production / on transfer),
`QualityCheck` with measured values, auto-quarantine on fail.

**7. Attendance + shifts.**
Payroll runs off `Employee.baseSalary`. There is no clock-in, no shift roster,
no overtime. Hotels and a farm both run shift labour, and hotel payroll is
mostly *not* flat monthly salary.
→ `Attendance`, `Shift`, `ShiftAssignment`; feed overtime into `PayrollRun`.
Also lets the manufacturing module cost real labour instead of a flat
work-centre rate.

**8. Stock valuation method + landed cost.**
`InventoryMovement.unitCost` drives a weighted-average COGS, but the method is
implicit and there is no FIFO/standard-cost option, and no way to spread freight
/ customs / clearing onto received goods. For a group that **imports**, landed
cost is the difference between a real margin and a fictional one.
→ `Product.costMethod`, `LandedCost` + allocation lines onto a receipt.

**9. Project accounting / timesheets.**
There is a `/projects` surface, but no `Project` model with a budget, no
timesheet, no work-in-progress or project P&L. The education arm (incubator
programmes) and any contracting work both want this.

### ⚪ Lower priority for a B2B-ops group

**10. Budgeting & forecasting against the ledger.** No `Budget` model, so no
budget-vs-actual column on any statement.
**11. Recurring invoices / subscriptions.** Relevant if the incubator charges
programme fees monthly.
**12. Ecommerce & marketing automation.** In the textbook 13 modules, out of
scope for how this group actually sells.

---

## 3. Data realism — the part that isn't code

The system currently runs on **seeded placeholder data**. Product names,
factories, hotel properties, and company entities are illustrative, not the
group's real catalogue. Before any pitch or pilot this needs Anas to supply, per
vertical:

- legal entity names + which company owns which site
- the real hotel properties (name, city, room count)
- the dairy plant(s), their lines, and the actual SKU list with shelf lives
  (now directly usable by `Product.shelfLifeDays` + `StockLot`)
- the farms, their locations, and what is grown on each
- the chart of accounts the group's accountants already use

A demo with the group's own SKUs on the screen persuades; a demo with invented
ones invites the question *"so it doesn't actually know our business."*

---

## 4. Suggested build order

1. AR/AP ageing report — no schema change, immediate owner-visible value
2. Bank reconciliation — the biggest genuine finance hole
3. Cost centres on `JournalLine` — unlocks true per-vertical P&L
4. Quality checks — completes the dairy story that lots started
5. Maintenance — completes the asset + work-centre story
6. Attendance/shifts — makes payroll and labour costing real
7. Multi-currency + landed cost — needed the day the group imports
