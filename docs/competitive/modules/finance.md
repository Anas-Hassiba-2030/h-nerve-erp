# Finance Module

Cash-side operations: standalone expenses/incomes and the treasury/bank ledger.
Sits above Accounting; simpler entry points that post to journals.

## Entities (standard — verify against forms)

### Expense
- Date, amount, currency, category (expense account), treasury paid-from.
- Supplier/payee (optional), reference, tax, notes, attachment.
- Recurring option.

### Income
- Non-invoice income: date, amount, category (income account), treasury paid-to, notes.

### Treasury / Bank Account
- Name, type (cash treasury vs. bank account), currency, opening balance.
- Running balance = sum of all inflows/outflows (payments, expenses, incomes, transfers).
- Transfers between treasuries.

## Workflows
1. Expense/income recorded → posts to its account + treasury → journal entry created.
2. Client/supplier payments move money in/out of treasuries.
3. Treasury balance reconciles against bank statements.

## H-Nerve mapping
H-Nerve has a `Transaction` ledger + group P&L (`lib/finance/`, FinanceBrain) but
**no treasury/bank-account entity, no expense/income categories tied to a COA**.
The Transaction model is the closest analog and could be split into
expense/income/treasury. See [hnerve-gap-map](../hnerve-gap-map.md).
