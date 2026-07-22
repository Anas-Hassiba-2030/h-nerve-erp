import { describe, it, expect } from "vitest";
import {
  allocateFefo,
  applyAllocation,
  bucketByExpiry,
  daysUntilExpiry,
  defaultExpiry,
  expiryState,
  isAllocatable,
  sortFefo,
  valueAtRisk,
  type LotRow,
} from "./lots";

const NOW = new Date("2026-07-22T14:00:00.000Z");
const d = (iso: string) => new Date(iso);

function lot(over: Partial<LotRow> & { id: string }): LotRow {
  return {
    lotNumber: over.id,
    expiryDate: null,
    quantity: 100,
    status: "ACTIVE",
    ...over,
  };
}

describe("isAllocatable", () => {
  it("accepts an ACTIVE lot with stock", () => {
    expect(isAllocatable(lot({ id: "a" }))).toBe(true);
  });
  it("rejects QUARANTINE even when it has stock", () => {
    expect(isAllocatable(lot({ id: "a", status: "QUARANTINE" }))).toBe(false);
  });
  it("rejects an empty lot", () => {
    expect(isAllocatable(lot({ id: "a", quantity: 0 }))).toBe(false);
  });
});

describe("sortFefo", () => {
  it("puts the soonest expiry first", () => {
    const out = sortFefo([
      lot({ id: "late", expiryDate: d("2026-09-01") }),
      lot({ id: "soon", expiryDate: d("2026-07-25") }),
    ]);
    expect(out.map((l) => l.id)).toEqual(["soon", "late"]);
  });

  it("sorts non-perishable lots LAST, not first", () => {
    const out = sortFefo([
      lot({ id: "forever", expiryDate: null }),
      lot({ id: "soon", expiryDate: d("2026-07-25") }),
    ]);
    expect(out.map((l) => l.id)).toEqual(["soon", "forever"]);
  });

  it("breaks ties deterministically on lotNumber", () => {
    const same = d("2026-08-01");
    const out = sortFefo([
      lot({ id: "B", lotNumber: "B", expiryDate: same }),
      lot({ id: "A", lotNumber: "A", expiryDate: same }),
    ]);
    expect(out.map((l) => l.id)).toEqual(["A", "B"]);
  });

  it("does not mutate the input array", () => {
    const input = [lot({ id: "b", expiryDate: d("2026-09-01") }), lot({ id: "a", expiryDate: d("2026-07-25") })];
    sortFefo(input);
    expect(input.map((l) => l.id)).toEqual(["b", "a"]);
  });
});

describe("allocateFefo", () => {
  const stock = [
    lot({ id: "old", expiryDate: d("2026-07-25"), quantity: 30 }),
    lot({ id: "mid", expiryDate: d("2026-08-10"), quantity: 50 }),
    lot({ id: "new", expiryDate: d("2026-09-30"), quantity: 200 }),
  ];

  it("drains the soonest-expiring lot first", () => {
    const r = allocateFefo(stock, 20);
    expect(r.lines).toEqual([
      { lotId: "old", lotNumber: "old", qty: 20, expiryDate: d("2026-07-25") },
    ]);
    expect(r.shortfall).toBe(0);
  });

  it("spills into the next lot when the first is exhausted", () => {
    const r = allocateFefo(stock, 60);
    expect(r.lines.map((l) => [l.lotId, l.qty])).toEqual([
      ["old", 30],
      ["mid", 30],
    ]);
    expect(r.shortfall).toBe(0);
  });

  it("reports a shortfall instead of over-allocating", () => {
    const r = allocateFefo(stock, 1000);
    expect(r.lines.reduce((t, l) => t + l.qty, 0)).toBe(280);
    expect(r.shortfall).toBe(720);
  });

  it("skips QUARANTINE stock entirely, even when it expires soonest", () => {
    const r = allocateFefo(
      [lot({ id: "held", expiryDate: d("2026-07-23"), quantity: 500, status: "QUARANTINE" }), ...stock],
      10,
    );
    expect(r.lines[0].lotId).toBe("old");
  });

  it("returns an empty allocation for zero or negative demand", () => {
    expect(allocateFefo(stock, 0)).toEqual({ lines: [], shortfall: 0 });
    expect(allocateFefo(stock, -5)).toEqual({ lines: [], shortfall: 0 });
  });

  it("floors fractional demand rather than creating a fractional pick", () => {
    const r = allocateFefo(stock, 20.9);
    expect(r.lines[0].qty).toBe(20);
  });
});

describe("daysUntilExpiry / expiryState", () => {
  it("counts calendar days, so expiring today reads as 0 not -1", () => {
    expect(daysUntilExpiry({ expiryDate: d("2026-07-22T00:00:00Z") }, NOW)).toBe(0);
    expect(expiryState({ expiryDate: d("2026-07-22T00:00:00Z") }, NOW)).toBe("EXPIRING");
  });

  it("marks yesterday as EXPIRED", () => {
    expect(daysUntilExpiry({ expiryDate: d("2026-07-21T00:00:00Z") }, NOW)).toBe(-1);
    expect(expiryState({ expiryDate: d("2026-07-21T00:00:00Z") }, NOW)).toBe("EXPIRED");
  });

  it("warns inside the window and stays OK outside it", () => {
    expect(expiryState({ expiryDate: d("2026-08-04") }, NOW, 14)).toBe("EXPIRING");
    expect(expiryState({ expiryDate: d("2026-08-06") }, NOW, 14)).toBe("OK");
  });

  it("treats a null expiry as NO_EXPIRY, never as expired", () => {
    expect(expiryState({ expiryDate: null }, NOW)).toBe("NO_EXPIRY");
    expect(daysUntilExpiry({ expiryDate: null }, NOW)).toBeNull();
  });
});

describe("defaultExpiry", () => {
  it("adds the shelf life to the production date", () => {
    expect(defaultExpiry(d("2026-07-22T00:00:00Z"), 7)).toEqual(d("2026-07-29T00:00:00Z"));
  });
  it("returns null rather than inventing a date when shelf life is unknown", () => {
    expect(defaultExpiry(NOW, null)).toBeNull();
    expect(defaultExpiry(NOW, 0)).toBeNull();
    expect(defaultExpiry(NOW, -3)).toBeNull();
  });
});

describe("bucketByExpiry", () => {
  const lots = [
    lot({ id: "gone", expiryDate: d("2026-07-01"), quantity: 5 }),
    lot({ id: "soon", expiryDate: d("2026-07-28"), quantity: 10 }),
    lot({ id: "fine", expiryDate: d("2026-12-01"), quantity: 20 }),
    lot({ id: "empty", expiryDate: d("2026-07-01"), quantity: 0 }),
    lot({ id: "done", expiryDate: d("2026-07-01"), quantity: 9, status: "CONSUMED" }),
  ];

  it("splits into expired / expiring / ok", () => {
    const b = bucketByExpiry(lots, NOW);
    expect(b.expired.map((l) => l.id)).toEqual(["gone"]);
    expect(b.expiring.map((l) => l.id)).toEqual(["soon"]);
    expect(b.ok.map((l) => l.id)).toEqual(["fine"]);
  });

  it("ignores empty and CONSUMED lots — they cannot cause a loss", () => {
    const b = bucketByExpiry(lots, NOW);
    const seen = [...b.expired, ...b.expiring, ...b.ok].map((l) => l.id);
    expect(seen).not.toContain("empty");
    expect(seen).not.toContain("done");
  });
});

describe("valueAtRisk", () => {
  it("prices the expired and expiring buckets separately", () => {
    const lots = [
      lot({ id: "gone", expiryDate: d("2026-07-01"), quantity: 5 }),
      lot({ id: "soon", expiryDate: d("2026-07-28"), quantity: 10 }),
      lot({ id: "fine", expiryDate: d("2026-12-01"), quantity: 20 }),
    ];
    expect(valueAtRisk(lots, 2.5, NOW)).toEqual({ expiredValue: 12.5, expiringValue: 25 });
  });

  it("never returns negative money for a negative cost", () => {
    const lots = [lot({ id: "gone", expiryDate: d("2026-07-01"), quantity: 5 })];
    expect(valueAtRisk(lots, -3, NOW).expiredValue).toBe(0);
  });
});

describe("applyAllocation", () => {
  const stock = [
    lot({ id: "old", expiryDate: d("2026-07-25"), quantity: 30 }),
    lot({ id: "mid", expiryDate: d("2026-08-10"), quantity: 50 }),
  ];

  it("flips a fully drained lot to CONSUMED", () => {
    const out = applyAllocation(stock, allocateFefo(stock, 30));
    expect(out).toEqual([{ id: "old", quantity: 0, status: "CONSUMED" }]);
  });

  it("leaves a partially drained lot ACTIVE", () => {
    const out = applyAllocation(stock, allocateFefo(stock, 40));
    expect(out).toEqual([
      { id: "old", quantity: 0, status: "CONSUMED" },
      { id: "mid", quantity: 40, status: "ACTIVE" },
    ]);
  });

  it("touches only the lots the allocation named", () => {
    const out = applyAllocation(stock, allocateFefo(stock, 5));
    expect(out.map((l) => l.id)).toEqual(["old"]);
  });
});
