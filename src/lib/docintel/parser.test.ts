// lib/docintel/parser.ts — the document-drop "wow moment" (Phase 18). In
// stub mode the value IS the filename routing; a wrong route shows the
// wrong canned extraction live. Pure; synthetic latency driven by fake timers.

import { vi, describe, it, expect, afterEach } from "vitest";
import { parseDocument, isTextEligible, llmParseEnabled } from "./parser";

afterEach(() => vi.useRealTimers());

async function parse(fileName: string, fileSize = 200 * 1024) {
  vi.useFakeTimers();
  const p = parseDocument({ fileName, fileSize });
  await vi.runAllTimersAsync();
  return p;
}

describe("parseDocument — filename routing (priority order)", () => {
  it("contract / عقد → contract, linked to LORAN, with clauses", async () => {
    const en = await parse("supplier_contract.pdf");
    expect(en.kind).toBe("contract");
    expect(en.linkedTo).toBe("LORAN");
    expect(en.clauses.length).toBeGreaterThan(0);
    expect(en.fields.parties).toBeTruthy();

    const ar = await parse("عقد-توريد.pdf");
    expect(ar.kind).toBe("contract");
  });

  it("invoice / فاتورة → invoice, linked to MAHA", async () => {
    const d = await parse("INV-2026.invoice.pdf");
    expect(d.kind).toBe("invoice");
    expect(d.linkedTo).toBe("MAHA");
    expect(d.fields.invoiceNumber).toBeTruthy();
  });

  it("lab / qc → lab_report (passing assay), linked to MAHA", async () => {
    const d = await parse("milk_lab_qc.pdf");
    expect(d.kind).toBe("lab_report");
    expect(d.linkedTo).toBe("MAHA");
    expect(d.fields.pass).toBe(true);
  });

  it("csv / spreadsheet → spreadsheet, linked to ARENA", async () => {
    const d = await parse("bookings.csv");
    expect(d.kind).toBe("spreadsheet");
    expect(d.linkedTo).toBe("ARENA");
  });

  it("unrecognized → generic 'other', no link, title is filename sans extension", async () => {
    const d = await parse("mystery.bin");
    expect(d.kind).toBe("other");
    expect(d.linkedTo).toBeNull();
    expect(d.title).toBe("mystery");
    expect(d.clauses).toEqual([]);
  });
});

describe("LLM parse gate (pure, no API) — gw-front is text-only", () => {
  it("isTextEligible: text-like files only; images + PDF are NOT sent (no vision)", () => {
    expect(isTextEligible("text/csv")).toBe(true);
    expect(isTextEligible("text/plain")).toBe(true);
    expect(isTextEligible("application/json")).toBe(true);
    expect(isTextEligible("image/png")).toBe(false);
    expect(isTextEligible("image/jpeg")).toBe(false);
    expect(isTextEligible("application/pdf")).toBe(false);
    expect(isTextEligible("application/vnd.ms-excel")).toBe(false);
    expect(isTextEligible(undefined)).toBe(false);
  });

  it("llmParseEnabled is OFF unless flag AND GW_API_KEY are both set", () => {
    const flag = process.env.DOCINTEL_USE_LLM;
    const key = process.env.GW_API_KEY;
    try {
      delete process.env.DOCINTEL_USE_LLM;
      delete process.env.GW_API_KEY;
      expect(llmParseEnabled()).toBe(false);
      process.env.DOCINTEL_USE_LLM = "true";
      expect(llmParseEnabled()).toBe(false); // key still missing
      process.env.GW_API_KEY = "test-key";
      expect(llmParseEnabled()).toBe(true); // both set
      process.env.DOCINTEL_USE_LLM = "false";
      expect(llmParseEnabled()).toBe(false); // flag explicitly off
    } finally {
      if (flag === undefined) delete process.env.DOCINTEL_USE_LLM;
      else process.env.DOCINTEL_USE_LLM = flag;
      if (key === undefined) delete process.env.GW_API_KEY;
      else process.env.GW_API_KEY = key;
    }
  });

  it("LLM parse OFF → parseDocument still returns the rich stub (regression)", async () => {
    const d = await parse("supplier_contract.pdf");
    expect(d.kind).toBe("contract");
    expect(d.linkedTo).toBe("LORAN");
    expect(d.clauses.length).toBeGreaterThan(0);
  });
});

describe("parseDocument — output contract", () => {
  it("always returns the full bilingual shape + capped synthetic latency", async () => {
    const d = await parse("supplier_contract.pdf");
    expect(d.title && d.titleEn).toBeTruthy();
    expect(d.summary && d.summaryEn).toBeTruthy();
    expect(d.headline && d.headlineEn).toBeTruthy();
    expect(typeof d.fields).toBe("object");
    expect(d.ms).toBeGreaterThanOrEqual(1800);
    expect(d.ms).toBeLessThanOrEqual(3600);
  });
});
