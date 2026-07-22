import { describe, it, expect } from "vitest";
import { matchLine, autoMatchStatement, type StatementLineInput, type PaymentCandidate } from "./reconciliation";

function line(over: Partial<StatementLineInput>): StatementLineInput {
  return {
    id: "l1",
    date: new Date("2026-07-10T00:00:00Z"),
    description: "TRF CUSTOMER PAYMENT",
    reference: null,
    amount: 500,
    ...over,
  };
}

function candidate(over: Partial<PaymentCandidate>): PaymentCandidate {
  return {
    id: "c1",
    kind: "PAYMENT",
    date: new Date("2026-07-10T00:00:00Z"),
    amount: 500,
    number: "PAY-000042",
    note: null,
    ...over,
  };
}

describe("matchLine", () => {
  it("matches a deposit line against a PAYMENT candidate on exact amount + date", () => {
    const result = matchLine(line({}), [candidate({})]);
    expect(result.candidateId).toBe("c1");
    expect(result.confidence).toBe("HIGH");
  });

  it("matches a withdrawal line only against SUPPLIER_PAYMENT candidates", () => {
    const w = line({ amount: -300 });
    const payment = candidate({ id: "wrong", kind: "PAYMENT", amount: 300 });
    const supplierPayment = candidate({ id: "right", kind: "SUPPLIER_PAYMENT", amount: 300 });
    const result = matchLine(w, [payment, supplierPayment]);
    expect(result.candidateId).toBe("right");
  });

  it("rejects candidates outside the amount epsilon", () => {
    const result = matchLine(line({ amount: 500 }), [candidate({ amount: 500.5 })]);
    expect(result.candidateId).toBeNull();
    expect(result.confidence).toBe("NONE");
  });

  it("rejects candidates outside the date window", () => {
    const result = matchLine(
      line({ date: new Date("2026-07-10T00:00:00Z") }),
      [candidate({ date: new Date("2026-08-01T00:00:00Z") })],
    );
    expect(result.confidence).toBe("NONE");
  });

  it("prefers a reference hit over a closer date", () => {
    const l = line({ reference: "PAY-000099" });
    const closeNoRef = candidate({ id: "close", date: new Date("2026-07-10T00:00:00Z"), number: "PAY-000001" });
    const farWithRef = candidate({ id: "far", date: new Date("2026-07-13T00:00:00Z"), number: "PAY-000099" });
    const result = matchLine(l, [closeNoRef, farWithRef]);
    expect(result.candidateId).toBe("far");
    expect(result.confidence).toBe("HIGH");
  });

  it("flags AMBIGUOUS when two candidates tie on refHit + dayDiff", () => {
    const c1 = candidate({ id: "c1", date: new Date("2026-07-10T00:00:00Z") });
    const c2 = candidate({ id: "c2", date: new Date("2026-07-10T00:00:00Z"), number: "PAY-999999" });
    const result = matchLine(line({}), [c1, c2]);
    expect(result.confidence).toBe("AMBIGUOUS");
    expect(result.candidateId).toBeNull();
    expect(result.alternates.sort()).toEqual(["c1", "c2"]);
  });

  it("gives MED confidence for a same-amount match a few days off with no ref hit", () => {
    const result = matchLine(
      line({ date: new Date("2026-07-10T00:00:00Z") }),
      [candidate({ date: new Date("2026-07-13T00:00:00Z") })],
    );
    expect(result.confidence).toBe("MED");
    expect(result.candidateId).toBe("c1");
  });
});

describe("autoMatchStatement", () => {
  it("does not offer the same candidate to two lines", () => {
    const lines = [line({ id: "l1" }), line({ id: "l2" })];
    const candidates = [candidate({ id: "only" })];
    const results = autoMatchStatement(lines, candidates);
    const matched = results.filter((r) => r.candidateId === "only");
    expect(matched).toHaveLength(1);
    expect(results.find((r) => r.lineId !== matched[0].lineId)!.candidateId).toBeNull();
  });

  it("matches each line to its own best candidate when pool has enough", () => {
    const lines = [line({ id: "l1", amount: 500 }), line({ id: "l2", amount: 300 })];
    const candidates = [candidate({ id: "c500", amount: 500 }), candidate({ id: "c300", amount: 300 })];
    const results = autoMatchStatement(lines, candidates);
    expect(results.find((r) => r.lineId === "l1")!.candidateId).toBe("c500");
    expect(results.find((r) => r.lineId === "l2")!.candidateId).toBe("c300");
  });
});
