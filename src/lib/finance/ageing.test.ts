import { describe, it, expect } from "vitest";
import { daysOverdue, bucketFor, buildAgeingReport, type AgeingDocInput } from "./ageing";

const asOf = new Date("2026-07-22T00:00:00Z");

function doc(over: Partial<AgeingDocInput>): AgeingDocInput {
  return {
    id: "d1",
    number: "INV-000001",
    partyId: "p1",
    partyName: "Acme",
    status: "UNPAID",
    issueDate: new Date("2026-06-01T00:00:00Z"),
    dueDate: new Date("2026-06-15T00:00:00Z"),
    total: 100,
    paid: 0,
    currency: "JOD",
    ...over,
  };
}

describe("daysOverdue", () => {
  it("uses dueDate when present", () => {
    expect(daysOverdue(new Date("2026-07-01T00:00:00Z"), new Date("2026-06-01T00:00:00Z"), asOf)).toBe(21);
  });
  it("falls back to issueDate when dueDate is null", () => {
    expect(daysOverdue(null, new Date("2026-07-01T00:00:00Z"), asOf)).toBe(21);
  });
  it("is negative (not-yet-due) before the due date", () => {
    expect(daysOverdue(new Date("2026-08-01T00:00:00Z"), new Date("2026-07-01T00:00:00Z"), asOf)).toBe(-10);
  });
});

describe("bucketFor", () => {
  it("buckets not-yet-due and due-today as current", () => {
    expect(bucketFor(-5)).toBe("current");
    expect(bucketFor(0)).toBe("current");
  });
  it("buckets the 1-30 boundary inclusively", () => {
    expect(bucketFor(1)).toBe("d1_30");
    expect(bucketFor(30)).toBe("d1_30");
    expect(bucketFor(31)).toBe("d31_60");
  });
  it("buckets 61-90 and 90+", () => {
    expect(bucketFor(60)).toBe("d31_60");
    expect(bucketFor(61)).toBe("d61_90");
    expect(bucketFor(90)).toBe("d61_90");
    expect(bucketFor(91)).toBe("d90_plus");
  });
});

describe("buildAgeingReport", () => {
  it("excludes DRAFT and CANCELLED documents", () => {
    const report = buildAgeingReport(
      [doc({ status: "DRAFT" }), doc({ status: "CANCELLED" }), doc({ status: "UNPAID" })],
      asOf,
    );
    expect(report.rows).toHaveLength(1);
  });

  it("excludes fully-paid documents (outstanding <= epsilon)", () => {
    const report = buildAgeingReport([doc({ total: 100, paid: 100 }), doc({ total: 100, paid: 99.999 })], asOf);
    expect(report.rows).toHaveLength(0);
  });

  it("computes outstanding as total minus paid", () => {
    const report = buildAgeingReport([doc({ total: 100, paid: 40 })], asOf);
    expect(report.rows[0].outstanding).toBe(60);
  });

  it("groups by party and sums bucket + grand totals", () => {
    const report = buildAgeingReport(
      [
        doc({ id: "d1", partyId: "p1", partyName: "Acme", dueDate: new Date("2026-06-15T00:00:00Z"), total: 100 }), // 37d -> d31_60
        doc({ id: "d2", partyId: "p1", partyName: "Acme", dueDate: new Date("2026-07-20T00:00:00Z"), total: 50 }), // 2d -> d1_30
        doc({ id: "d3", partyId: "p2", partyName: "Beta", dueDate: new Date("2026-01-01T00:00:00Z"), total: 200 }), // 90+ -> d90_plus
      ],
      asOf,
    );

    expect(report.grandTotal).toBe(350);
    expect(report.byParty).toHaveLength(2);
    const acme = report.byParty.find((p) => p.partyId === "p1")!;
    expect(acme.total).toBe(150);
    expect(acme.buckets.d31_60).toBe(100);
    expect(acme.buckets.d1_30).toBe(50);
    expect(report.bucketTotals.d90_plus).toBe(200);
  });

  it("sorts rows most-overdue first", () => {
    const report = buildAgeingReport(
      [
        doc({ id: "d1", dueDate: new Date("2026-07-20T00:00:00Z") }), // 2d
        doc({ id: "d2", dueDate: new Date("2026-01-01T00:00:00Z") }), // ~200d
      ],
      asOf,
    );
    expect(report.rows[0].id).toBe("d2");
    expect(report.rows[1].id).toBe("d1");
  });

  it("never produces a negative outstanding bucket for overpaid docs", () => {
    const report = buildAgeingReport([doc({ total: 100, paid: 150 })], asOf);
    expect(report.rows).toHaveLength(0);
  });
});
