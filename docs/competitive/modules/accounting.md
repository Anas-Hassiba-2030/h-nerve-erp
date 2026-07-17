# Accounting Module

The double-entry engine under everything. This is the deepest ERP capability and
the biggest gap for H-Nerve.

## Entities (standard — verify against forms)

### Chart of Accounts (COA)
- Hierarchical tree of accounts: Assets, Liabilities, Equity, Revenue, Expenses.
- Each account: code, name, type/nature (debit/credit), parent, active flag.
- Sub-accounts roll up to parents for reporting.

### Journal Entry
- Header: date, entry no., description, cost center (optional), attachment.
- Lines: account, debit, credit, line note. Must balance (Σ debit = Σ credit).
- Source: manual, or auto-generated from invoice/purchase/expense/payment.
- Status: draft / posted.

### Cost Center
- A tagging dimension on journal lines (department/project/branch) for segmented P&L.

### Fixed Asset
- Name, category, purchase date, cost, depreciation method + rate, useful life, salvage value.
- Generates periodic depreciation journal entries; tracks net book value.

## Workflows
1. Every financial event (sale, purchase, expense, payment, depreciation) → a balanced journal entry against the COA.
2. Journals + COA → trial balance → P&L + balance sheet.
3. Cost centers slice reports by dimension.

## H-Nerve mapping
H-Nerve has **no COA, no journal entries, no double-entry, no cost centers, no
fixed-asset depreciation**. Its `Transaction` model is single-entry. This is the
single largest ERP gap and the highest-value (and hardest) Phase 27 build. See
[hnerve-gap-map](../hnerve-gap-map.md).
