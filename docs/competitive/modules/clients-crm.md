# Clients / CRM Module

Client directory and their contacts. Newer screens run on the v2 entity engine
(`/v2/owner/entity/client/list`); the create form is legacy.

## Entity: Client (observed)
Read directly from the Add Client form:
- **Client Type** — Individual / Business (radio).
- **Full Name / Business Name** (single field, swaps by type).
- **First Name**, **Last Name** (individuals).
- **Telephone**, **Mobile**.
- **Address**: Street Address 1, Street Address 2, City, State, Postal Code, Country (ISO dropdown).

Standard additional fields typical of this form (standard — verify): email,
currency, tax/VAT number, client category/group, price list, assigned staff,
opening balance, credit limit, payment terms, notes, follow-up.

## Entity: Contact (Contacts List)
Individual people attached to a business client — name, role/title, email, phone.
One client (business) → many contacts.

## Workflows
- Client created → used as the "bill-to" on invoices/estimates.
- Statement of account = all invoices/payments/credit notes for a client → running balance.
- Follow-ups / reminders tie into Auto Reminder Rules.

## H-Nerve mapping
H-Nerve has Companies/tenants but **no dedicated client CRM entity** with
individual/business typing, contacts, statements, or credit limits. This is a
clean Phase 27 CRM candidate (already drafted in PR #280 — Lead/Opportunity;
this adds the *account/contact* side). See [hnerve-gap-map](../hnerve-gap-map.md).
