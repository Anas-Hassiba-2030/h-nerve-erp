# Jordan JoFotara e-invoicing — status: UNCERTIFIED v1 scaffold

Built 2026-07-18 (Phase 27, `feat/phase27-einvoicing-jo`). This document is the
honest boundary between what's shipped and what real government compliance
requires. Read it before telling a tenant they're "JoFotara compliant."

## What's built

- `prisma/schema/einvoicing.prisma` — `EInvoiceSupplierProfile` (per-tenant tax
  config: TIN, activity number, income-source sequence, seller name) +
  `EInvoiceRecord` (per-`Invoice`: UUID, UBL-shaped XML, TLV pre-clearance QR,
  status).
- `src/lib/einvoicing/jofotara.ts` — pure `buildTlvQr` + `buildInvoiceXml`
  (unit-tested), and `prepareEInvoice` which builds and stores a `READY`
  record for an issued (non-draft, non-cancelled) invoice.
- `/e-invoicing` UI — supplier-profile form + a list of issued invoices with
  a "Generate" action, a persistent on-page warning banner, and a visible
  `Not generated` / `READY` status badge (never `CLEARED` — see below).
- **Does not touch the general ledger.** This is a compliance document
  overlay on top of `Invoice`, which already posts AR/Revenue at issue —
  e-invoicing never re-posts or duplicates that.

## What is deliberately NOT built

- **No live ISTD API call.** `submitToJoFotara()` in `jofotara.ts` is a stub
  that throws — it refuses to fabricate a "submitted" or "cleared" result.
  There are no ISTD sandbox credentials in this environment.
- **No primary-spec verification.** The field names, XML shape, and TLV tag
  scheme here come from secondary public sources (vendor integration guides,
  Odoo's Jordan localization docs, VATupdate briefings) gathered via web
  search this session — **not** a machine-read of ISTD's own published
  spec (`portal.jofotara.gov.jo/85e41d44095082ee4c9c.pdf` — a PDF that
  couldn't be parsed in this session's sandboxed fetch tooling). Treat every
  field name and the TLV tag order as *plausible, not certified*.
- **No official QR.** The real ISTD QR only exists after live clearance.
  What this scaffold generates is a **local pre-clearance TLV QR** built
  from the same fields, for internal reference only.
- **No credential storage/signing.** A real integration needs a per-tenant
  client ID + secret key issued by ISTD, and (per most integration guides)
  digital signing of the outbound payload. None of that exists here.

## What real certification requires (for whoever picks this up next)

1. Register with ISTD (Income & Sales Tax Department) / JoFotara and obtain
   sandbox API credentials.
2. Get the primary integration spec + UBL 2.1 XSD/schematron from ISTD
   directly (or an accredited service provider) and validate `buildInvoiceXml`
   against it field-by-field — this scaffold's XML is a plausible shape, not
   a validated one.
3. Confirm the TLV tag order/encoding against ISTD's own pre-clearance QR
   spec, not the generic regional pattern used here.
4. Implement the actual submission call (`submitToJoFotara`), including auth,
   retry/error handling, and the `SUBMITTED → CLEARED/REJECTED` status
   transitions that `EInvoiceRecord.status` already has fields for.
5. Decide on integration path: direct API, the JoFotara web portal, or an
   accredited service provider (all three are legitimate per public docs).
6. Mandatory since 2025-04-01 (Phase 2) for B2B/B2C/B2G, no sector exemption,
   per the public sources below — confirm current requirements before
   flipping any tenant into "live" mode, since deadlines/penalties evolve.

## Sources consulted (secondary, public — not Daftra, not scraped)

- https://mozon-tech.com/en/blog/the-ultimate-guide-to-jofotara/
- https://tax2gov.com/jordan-jofotara-e-invoicing-api/
- https://www.odoo.com/documentation/19.0/applications/finance/fiscal_localizations/jordan.html
- https://jo.invoiceq.com/en/e-invoicing/connecting-to-jofotara/
- https://www.vatupdate.com/2026/03/20/briefing-document-podcast-e-invoicing-e-reporting-in-jordan/
- https://edicomgroup.com/blog/jordan-prepares-to-launch-the-electronic-invoice
- https://docs.flick.network/global-einvoicing/jordan-einvoicing
- https://vatit.com/e-invoicing-guide/jordan/

KSA ZATCA is explicitly out of scope for this pass — Hourani Group operates
in Jordan; ZATCA only becomes relevant on a real KSA expansion.
