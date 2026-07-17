# Purchases Module

Supplier-side mirror of Sales. All screens run on the v2 entity engine.

## Entities (standard — verify against forms)

### Supplier
Mirror of Client: name, type (individual/business), contacts, phone/email,
address, currency, tax number, opening balance, payment terms.

### Purchase Invoice (Purchase Order)
- Supplier picker, currency, date, due date, reference/supplier invoice no.
- Line items: product, quantity, unit cost, tax, discount, line total → increases stock.
- Totals + amount paid + balance; status Unpaid/Partial/Paid.
- Optional target warehouse for received stock.

### Purchase Refund
Return to supplier; reduces stock + supplier balance.

### Debit Note
Adjustment raised against a supplier (price/quantity correction).

### Supplier Payment
Payment out to a supplier from a treasury; applied to purchase invoices.

## Workflows
1. Purchase invoice → stock received into warehouse → supplier payable created.
2. Payment to supplier → payable reduced, treasury reduced.
3. Return → purchase refund or debit note → stock/payable adjusted.

## Accounting hooks
Purchase posts inventory/expense + tax + payable; payment moves payable →
treasury out. Feeds COGS and P&L.

## H-Nerve mapping
H-Nerve has a `procurement`/supply seam (see `lib/supply/`) but **no supplier
ledger, purchase invoices, or payables**. See [hnerve-gap-map](../hnerve-gap-map.md).
