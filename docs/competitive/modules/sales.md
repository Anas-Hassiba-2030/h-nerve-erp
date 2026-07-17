# Sales Module

Quote-to-cash. Estimates → invoices → payments, plus credit notes, refunds, and
recurring billing.

## Entities

### Invoice (observed)
Header fields read from the create form:
- **Invoice Layout** — selectable print layout (Default Invoice, Timesheet, …).
- **Delivery Method** — Send via Email / Print (Offline).
- **Client** — searchable picker (name / phone / ID); inline "Add New Client".
- **Currency** — per-invoice currency override (full ISO currency list; tenant default applied).

Standard body/footer (standard — verify):
- **Line items**: product/service, description, quantity, unit price, discount (%/amount), tax, line total.
- **Header meta**: invoice no. (auto-numbered), issue date, due date, payment terms.
- **Totals**: subtotal, total discount, tax total, grand total, amount paid, balance due.
- **Notes**, **Terms & Conditions** block, attachments.
- **Payment status**: Draft, Unpaid, Due, Overdue, Paid, Overpaid (observed as list filters).

### Estimate / Quotation
Same shape as invoice; converts to an invoice. Own numbering. States: draft → sent → accepted/expired → converted.

### Credit Note
Reduces a client's balance (returns/adjustments). Links to an originating invoice.

### Refund Receipt
Cash/bank refund to a client; posts against a treasury.

### Recurring Invoice (Subscription)
A template invoice + schedule (interval, next-run, end condition) that auto-generates invoices.

### Client Payment
Receipt applied to one or more invoices; method (cash/bank/gateway), treasury, date, amount, reference.

## Workflows
1. Estimate created → sent → accepted → **converted to invoice**.
2. Invoice issued → (partial) payments recorded → status auto-updates → overdue reminders fire.
3. Return → credit note or refund receipt → client balance/treasury adjusted.
4. Recurring schedule → periodic invoice generation.

## Accounting hooks (functional)
Invoice posts revenue + tax + receivable; payment moves receivable → treasury;
credit note/refund reverse. All flow to journal entries against the COA.

## H-Nerve mapping
H-Nerve has invoice-like transactions but **no estimate→invoice conversion, no
credit notes, no recurring billing, no per-line tax/discount engine**. See
[hnerve-gap-map](../hnerve-gap-map.md).
