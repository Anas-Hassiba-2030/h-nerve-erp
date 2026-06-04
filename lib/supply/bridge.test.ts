// lib/supply/bridge.test.ts — Phase NS-1 cross-tenant PO bridge.
//
// The bridge runs entirely inside prismaUnscoped.$transaction, so we mock
// the DB layer: $transaction immediately invokes its callback with a fake
// `tx` whose model methods are vi.fn()s scripted per test. COMPANY_CODE_TO_
// TENANT_SLUG is mocked to a fixed map (mirrors the real codes) so the
// test asserts bridge LOGIC, not the map's contents. generateNumber stays
// real (pure). No DB, no network — fits the pure-unit suite.

import { vi, describe, it, expect, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// vi.hoisted so the mock factory below can reference `tx` (factories hoist
// above imports).
const { tx } = vi.hoisted(() => ({
  tx: {
    supplyForecast: { findUnique: vi.fn(), update: vi.fn() },
    company: { findUnique: vi.fn() },
    supplier: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    purchaseOrder: { create: vi.fn() },
  },
}));

vi.mock("@/lib/db/db", () => ({
  prismaUnscoped: {
    $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
  },
}));

vi.mock("@/lib/tenancy/tenancy", () => ({
  COMPANY_CODE_TO_TENANT_SLUG: {
    HOTELS: "hourani-hotels",
    MAHA: "maha-dairy",
    LORAN: "loran-agri",
  },
}));

import { approveForecastWithBridge } from "./bridge";

// A DRAFT forecast: Hotels (buyer) → Maha (supplier/target).
const DRAFT = {
  id: "f1",
  status: "DRAFT",
  sourceCompanyId: "cHotels",
  targetCompanyId: "cMaha",
  productLabel: "حليب",
  predictedDemand: 1180,
  unit: "لتر",
  periodEnd: new Date("2026-06-01"),
};

/** Script tx.company.findUnique to return a code/name keyed by company id. */
function companyMap(map: Record<string, { code: string; name?: string }>) {
  tx.company.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(map[where.id] ?? null)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("approveForecastWithBridge", () => {
  it("returns {approved:false} when the forecast is missing", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(null);
    const r = await approveForecastWithBridge("nope");
    expect(r).toEqual({ approved: false });
    expect(tx.supplyForecast.update).not.toHaveBeenCalled();
  });

  it("returns {approved:false} when the forecast is no longer DRAFT", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue({ ...DRAFT, status: "APPROVED" });
    const r = await approveForecastWithBridge("f1");
    expect(r).toEqual({ approved: false });
    expect(tx.supplyForecast.update).not.toHaveBeenCalled();
  });

  it("flips to APPROVED with no PO when the buyer maps to no in-system tenant", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(DRAFT);
    companyMap({
      cHotels: { code: "EXTERNAL" }, // not in the map
      cMaha: { code: "MAHA", name: "Maha Dairy" },
    });
    const r = await approveForecastWithBridge("f1");
    expect(r).toEqual({ approved: true, po: null });
    expect(tx.supplyForecast.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { status: "APPROVED" },
    });
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it("flips to APPROVED with no PO for a self-referential forecast (same tenant)", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(DRAFT);
    companyMap({
      cHotels: { code: "HOTELS" },
      cMaha: { code: "HOTELS", name: "Hourani Hotels" }, // same slug both sides
    });
    const r = await approveForecastWithBridge("f1");
    expect(r).toEqual({ approved: true, po: null });
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it("drafts a cross-tenant PO on the buyer's tenant and back-links the forecast", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(DRAFT);
    companyMap({
      cHotels: { code: "HOTELS" },
      cMaha: { code: "MAHA", name: "Maha Dairy" },
    });
    // No supplier linked yet, and no name collision — bridge creates one.
    tx.supplier.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    tx.supplier.create.mockResolvedValue({ id: "sup1", name: "Maha Dairy" });
    tx.purchaseOrder.create.mockResolvedValue({ id: "po1" });

    const r = await approveForecastWithBridge("f1");

    expect(r.approved).toBe(true);
    expect(r).toMatchObject({ approved: true, po: { supplierName: "Maha Dairy" } });
    expect(r.approved === true && r.po?.poNumber).toMatch(/^PO-/);

    // Supplier auto-created on the BUYER's tenant, linked to the target.
    expect(tx.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "hourani-hotels",
          linkedTenantId: "maha-dairy",
          name: "Maha Dairy",
        }),
      })
    );
    // PO drafted on the buyer's tenant, sourced from the forecast.
    expect(tx.purchaseOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "hourani-hotels",
          supplierId: "sup1",
          status: "DRAFT",
          sourceForecastId: "f1",
        }),
      })
    );
    // Forecast flipped + back-linked to the new PO id.
    expect(tx.supplyForecast.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { status: "APPROVED", linkedPurchaseOrderId: "po1" },
    });
  });

  it("reuses an unlinked existing supplier rather than creating a duplicate", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(DRAFT);
    companyMap({
      cHotels: { code: "HOTELS" },
      cMaha: { code: "MAHA", name: "Maha Dairy" },
    });
    tx.supplier.findFirst
      .mockResolvedValueOnce(null) // no linked supplier
      .mockResolvedValueOnce({ id: "sExisting", name: "Maha Dairy", linkedTenantId: null });
    tx.supplier.update.mockResolvedValue({ id: "sExisting", name: "Maha Dairy" });
    tx.purchaseOrder.create.mockResolvedValue({ id: "po2" });

    const r = await approveForecastWithBridge("f1");

    expect(r.approved).toBe(true);
    expect(tx.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sExisting" },
        data: { linkedTenantId: "maha-dairy" },
      })
    );
    expect(tx.supplier.create).not.toHaveBeenCalled();
  });

  it("does NOT hijack a supplier already linked to a different tenant — approves without a PO", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(DRAFT);
    companyMap({
      cHotels: { code: "HOTELS" },
      cMaha: { code: "MAHA", name: "Maha Dairy" },
    });
    tx.supplier.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "sOther", name: "Maha Dairy", linkedTenantId: "someone-else" });

    const r = await approveForecastWithBridge("f1");

    expect(r).toEqual({ approved: true, po: null });
    expect(tx.supplyForecast.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { status: "APPROVED" },
    });
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it("treats a racing P2002 unique violation as an idempotent no-op", async () => {
    tx.supplyForecast.findUnique.mockResolvedValue(DRAFT);
    companyMap({
      cHotels: { code: "HOTELS" },
      cMaha: { code: "MAHA", name: "Maha Dairy" },
    });
    tx.supplier.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    tx.supplier.create.mockResolvedValue({ id: "sup1", name: "Maha Dairy" });
    // A concurrent approval already inserted the PO → unique constraint trips.
    tx.purchaseOrder.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      })
    );

    const r = await approveForecastWithBridge("f1");
    expect(r).toEqual({ approved: false });
  });
});
