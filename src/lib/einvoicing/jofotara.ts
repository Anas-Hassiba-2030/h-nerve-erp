// Jordan JoFotara (ISTD) e-invoicing scaffold (hnerve-gap-map.md
// "E-invoicing (gov)" row). UNCERTIFIED — see docs/compliance/JOFOTARA.md.
// Builds the fields public integration guides describe (UUID, UBL-2.1-
// shaped XML, invoiceTypeCode 388/381, TLV pre-clearance QR) but never
// calls the live ISTD API. `submitToJoFotara` below is a deliberate stub
// that refuses to pretend success — there are no ISTD sandbox
// credentials in this environment, so "submission" would be fabricated.

import { randomUUID } from "crypto";
import type { prisma as prismaType } from "@/lib/db/db";

type Tx = typeof prismaType;

// ── TLV pre-clearance QR (pure) ──────────────────────────────────────────
// Tag-Length-Value encoding: the pattern public guides describe for a
// LOCAL pre-clearance QR (the official ISTD QR only exists after live
// clearance). Tags 1-5 = seller name / TIN / timestamp / invoice total /
// VAT total — this mirrors the generic TLV scheme used across the
// region's e-invoicing systems; NOT verified against ISTD's own primary
// spec (that PDF could not be machine-read this session).
export type TlvFields = {
  sellerName: string;
  taxRegistrationNumber: string;
  timestamp: string; // ISO 8601
  invoiceTotal: number;
  vatTotal: number;
};

function tlvField(tag: number, value: string): Buffer {
  const valueBytes = Buffer.from(value, "utf-8");
  if (valueBytes.length > 255) throw new Error(`TLV field ${tag} exceeds 255 bytes`);
  return Buffer.concat([Buffer.from([tag, valueBytes.length]), valueBytes]);
}

export function buildTlvQr(fields: TlvFields): string {
  const parts = [
    tlvField(1, fields.sellerName),
    tlvField(2, fields.taxRegistrationNumber),
    tlvField(3, fields.timestamp),
    tlvField(4, fields.invoiceTotal.toFixed(2)),
    tlvField(5, fields.vatTotal.toFixed(2)),
  ];
  return Buffer.concat(parts).toString("base64");
}

// ── UBL-shaped invoice XML (pure) ────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type InvoiceXmlFields = {
  uuid: string;
  invoiceNumber: string;
  invoiceTypeCode: "388" | "381";
  issueDate: string; // YYYY-MM-DD
  supplier: { name: string; taxRegistrationNumber: string; activityNumber: string; incomeSourceSequence: string };
  customer: { name: string };
  lines: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  taxTotal: number;
  total: number;
};

/**
 * A UBL-2.1-SHAPED invoice document — field names and structure follow
 * what public JoFotara integration guides describe (UUID, ID, IssueDate,
 * InvoiceTypeCode, AccountingSupplierParty/AccountingCustomerParty,
 * LegalMonetaryTotal, TaxTotal). Not validated against ISTD's published
 * XSD/schematron — that requires the primary spec + a real sandbox run.
 */
export function buildInvoiceXml(f: InvoiceXmlFields): string {
  const lines = f.lines
    .map(
      (l, i) => `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity>${l.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount>${l.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${xmlEscape(l.description)}</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount>${l.unitPrice.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UUID>${f.uuid}</cbc:UUID>
  <cbc:ID>${xmlEscape(f.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${f.issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${f.invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:RegistrationName>${xmlEscape(f.supplier.name)}</cbc:RegistrationName>
      <cbc:CompanyID>${xmlEscape(f.supplier.taxRegistrationNumber)}</cbc:CompanyID>
      <cbc:IncomeSourceSequence>${xmlEscape(f.supplier.incomeSourceSequence)}</cbc:IncomeSourceSequence>
      <cbc:ActivityNumber>${xmlEscape(f.supplier.activityNumber)}</cbc:ActivityNumber>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:RegistrationName>${xmlEscape(f.customer.name)}</cbc:RegistrationName>
    </cac:Party>
  </cac:AccountingCustomerParty>
${lines}
  <cac:TaxTotal><cbc:TaxAmount>${f.taxTotal.toFixed(2)}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>${f.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount>${f.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount>${f.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
}

// ── DB: build + store a READY record (no live submission) ──────────────

export async function prepareEInvoice(
  tx: Tx,
  args: { tenantId: string; invoiceId: string },
): Promise<{ uuid: string; status: string }> {
  const { tenantId, invoiceId } = args;
  const uuid = randomUUID();
  const now = new Date();

  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lines: true, customerRef: true },
  });
  if (invoice.tenantId !== tenantId) throw new Error("Cross-tenant invoice");
  if (["DRAFT", "CANCELLED"].includes(invoice.status)) {
    throw new Error(`Invoice ${invoice.invoiceNumber} is ${invoice.status} — issue it before generating an e-invoice`);
  }

  const profile = await tx.eInvoiceSupplierProfile.findUnique({ where: { tenantId } });
  if (!profile) throw new Error("No JoFotara supplier profile configured for this tenant");

  const xmlPayload = buildInvoiceXml({
    uuid,
    invoiceNumber: invoice.invoiceNumber,
    invoiceTypeCode: "388",
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    supplier: {
      name: profile.sellerName,
      taxRegistrationNumber: profile.taxRegistrationNumber,
      activityNumber: profile.activityNumber,
      incomeSourceSequence: profile.incomeSourceSequence,
    },
    customer: { name: invoice.customerRef.name },
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
    })),
    subtotal: Number(invoice.subtotal),
    taxTotal: Number(invoice.taxTotal),
    total: Number(invoice.total),
  });

  const qrPayload = buildTlvQr({
    sellerName: profile.sellerName,
    taxRegistrationNumber: profile.taxRegistrationNumber,
    timestamp: now.toISOString(),
    invoiceTotal: Number(invoice.total),
    vatTotal: Number(invoice.taxTotal),
  });

  await tx.eInvoiceRecord.upsert({
    where: { invoiceId },
    create: { tenantId, invoiceId, uuid, xmlPayload, qrPayload, status: "READY" },
    update: { xmlPayload, qrPayload, status: "READY" },
  });

  return { uuid, status: "READY" };
}

/**
 * Deliberate stub. There are no ISTD sandbox credentials in this
 * environment — actually "submitting" would fabricate a compliance
 * result. Wire this up for real only once ISTD API credentials exist
 * and the primary integration spec has been verified.
 */
export async function submitToJoFotara(): Promise<never> {
  throw new Error(
    "JoFotara live submission is not configured — this is an uncertified v1 scaffold. " +
      "See docs/compliance/JOFOTARA.md for what real ISTD integration requires.",
  );
}
