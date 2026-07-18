import { describe, it, expect } from "vitest";
import { buildTlvQr, buildInvoiceXml } from "./jofotara";

describe("buildTlvQr", () => {
  it("encodes each field as Tag-Length-Value and base64s the result", () => {
    const qr = buildTlvQr({
      sellerName: "Hourani",
      taxRegistrationNumber: "123456789",
      timestamp: "2026-07-18T10:00:00.000Z",
      invoiceTotal: 118,
      vatTotal: 18,
    });
    const decoded = Buffer.from(qr, "base64");
    // Tag 1, length 7 ("Hourani"), then the 7 name bytes.
    expect(decoded[0]).toBe(1);
    expect(decoded[1]).toBe(7);
    expect(decoded.subarray(2, 9).toString("utf-8")).toBe("Hourani");
  });

  it("throws when a field exceeds 255 bytes", () => {
    expect(() =>
      buildTlvQr({
        sellerName: "x".repeat(300),
        taxRegistrationNumber: "1",
        timestamp: "2026-07-18T10:00:00.000Z",
        invoiceTotal: 1,
        vatTotal: 0,
      }),
    ).toThrow(/255 bytes/);
  });
});

describe("buildInvoiceXml", () => {
  it("includes the UUID, invoice number, and type code", () => {
    const xml = buildInvoiceXml({
      uuid: "11111111-1111-1111-1111-111111111111",
      invoiceNumber: "INV-000001",
      invoiceTypeCode: "388",
      issueDate: "2026-07-18",
      supplier: { name: "Hourani", taxRegistrationNumber: "123456789", activityNumber: "AC1", incomeSourceSequence: "IS1" },
      customer: { name: "Acme" },
      lines: [{ description: "Widget", quantity: 2, unitPrice: 50, lineTotal: 100 }],
      subtotal: 100,
      taxTotal: 18,
      total: 118,
    });
    expect(xml).toContain("<cbc:UUID>11111111-1111-1111-1111-111111111111</cbc:UUID>");
    expect(xml).toContain("<cbc:ID>INV-000001</cbc:ID>");
    expect(xml).toContain("<cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>");
    expect(xml).toContain("<cbc:PayableAmount>118.00</cbc:PayableAmount>");
  });

  it("escapes XML-unsafe characters in text fields", () => {
    const xml = buildInvoiceXml({
      uuid: "u",
      invoiceNumber: "INV-1",
      invoiceTypeCode: "388",
      issueDate: "2026-07-18",
      supplier: { name: 'Al & Co. "Traders"', taxRegistrationNumber: "1", activityNumber: "A", incomeSourceSequence: "S" },
      customer: { name: "<Customer>" },
      lines: [],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
    });
    expect(xml).toContain("Al &amp; Co. &quot;Traders&quot;");
    expect(xml).toContain("&lt;Customer&gt;");
  });
});
