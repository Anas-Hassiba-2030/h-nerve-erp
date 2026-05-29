// lib/protocol/load.test.ts — Phase 20 Living Protocol read path.
//
// getProtocolClauses() reads through the scoped `prisma` client and falls
// back to the seed constitution when the table is empty OR the DB isn't
// migrated yet (the P2021 catch). We mock @/lib/db so the test asserts that
// read/fallback LOGIC with no DB or network. The DEFAULT_PROTOCOL_CLAUSES
// seed stays real (pure data) so a fallback test also pins the seed shape.

import { vi, describe, it, expect, beforeEach } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { protocolClause: { findMany: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import { getProtocolClauses } from "./load";
import { DEFAULT_PROTOCOL_CLAUSES } from "./clauses";

/** A persisted row as Prisma would return it. */
function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ckp1",
    key: "procurement",
    title: "سياسة المشتريات",
    titleEn: "Procurement policy",
    body: "نص محدّث",
    bodyEn: "Updated body",
    orderIndex: 0,
    version: 3,
    updatedAt: new Date(Date.UTC(2026, 4, 1, 9, 30)),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProtocolClauses — persisted rows win", () => {
  it("maps DB rows to DTOs, preserving version and ISO updatedAt", async () => {
    prisma.protocolClause.findMany.mockResolvedValue([row()]);
    const { clauses, fallback } = await getProtocolClauses();

    expect(fallback).toBe(false);
    expect(clauses).toHaveLength(1);
    const c = clauses[0];
    expect(c.id).toBe("ckp1");
    expect(c.key).toBe("procurement");
    expect(c.version).toBe(3); // versioning surfaced verbatim
    expect(c.updatedAt).toBe("2026-05-01T09:30:00.000Z"); // Date → ISO string
    expect(c).not.toHaveProperty("seedOnly"); // persisted rows aren't flagged
  });

  it("orders the query by orderIndex ascending", async () => {
    prisma.protocolClause.findMany.mockResolvedValue([row()]);
    await getProtocolClauses();
    expect(prisma.protocolClause.findMany).toHaveBeenCalledWith({
      orderBy: { orderIndex: "asc" },
    });
  });

  it("passes through null English mirrors without inventing data", async () => {
    prisma.protocolClause.findMany.mockResolvedValue([
      row({ titleEn: null, bodyEn: null }),
    ]);
    const { clauses } = await getProtocolClauses();
    expect(clauses[0].titleEn).toBeNull();
    expect(clauses[0].bodyEn).toBeNull();
  });

  it("returns every persisted row in DB order", async () => {
    prisma.protocolClause.findMany.mockResolvedValue([
      row({ id: "a", key: "procurement", orderIndex: 0 }),
      row({ id: "b", key: "crisis", orderIndex: 1 }),
    ]);
    const { clauses } = await getProtocolClauses();
    expect(clauses.map((c) => c.key)).toEqual(["procurement", "crisis"]);
  });
});

describe("getProtocolClauses — seed fallback", () => {
  it("falls back to the full seed constitution when the table is empty", async () => {
    prisma.protocolClause.findMany.mockResolvedValue([]);
    const { clauses, fallback } = await getProtocolClauses();

    expect(fallback).toBe(true);
    expect(clauses).toHaveLength(DEFAULT_PROTOCOL_CLAUSES.length);
    for (const c of clauses) {
      expect(c.seedOnly).toBe(true);
      expect(c.id).toBe(`seed:${c.key}`); // un-persisted placeholder id
      expect(c.version).toBe(1); // seed is v1
      expect(c.updatedAt).toBeNull(); // never persisted → no timestamp
    }
    // The fallback mirrors the seed keys/order exactly.
    expect(clauses.map((c) => c.key)).toEqual(
      DEFAULT_PROTOCOL_CLAUSES.map((c) => c.key),
    );
  });

  it("falls back when the DB throws (e.g. not-yet-migrated P2021)", async () => {
    prisma.protocolClause.findMany.mockRejectedValue(
      Object.assign(new Error("table does not exist"), { code: "P2021" }),
    );
    const { clauses, fallback } = await getProtocolClauses();
    expect(fallback).toBe(true);
    expect(clauses).toHaveLength(DEFAULT_PROTOCOL_CLAUSES.length);
    expect(clauses.every((c) => c.seedOnly)).toBe(true);
  });

  it("fallback clauses carry the real bilingual seed content", async () => {
    prisma.protocolClause.findMany.mockResolvedValue([]);
    const { clauses } = await getProtocolClauses();
    const proc = clauses.find((c) => c.key === "procurement")!;
    const seed = DEFAULT_PROTOCOL_CLAUSES.find((c) => c.key === "procurement")!;
    expect(proc.title).toBe(seed.title);
    expect(proc.titleEn).toBe(seed.titleEn);
    expect(proc.body).toBe(seed.body);
    expect(proc.bodyEn).toBe(seed.bodyEn);
    expect(proc.orderIndex).toBe(seed.orderIndex);
  });
});
