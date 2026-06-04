// Regression tests for PR #174 — the cross-tenant WRITE-leak fixes.
//
// resolveAdminTenantId() is pure and unit-tested in adminActionScope.test.ts.
// The gap #174 left open was the ACTION WIRING: do createCustomer /
// createWarehouse / createLedgerAccount / createSalesOrder actually route the
// submitted tenantId through that resolver, so that a workspace-PINNED
// MANAGER/EXECUTIVE who POSTs a FOREIGN tenantId has the row land in THEIR
// tenant (overridden), never the foreign one — while a cross-tenant ADMIN can
// still target the submitted tenant?
//
// We assert exactly what tenantId reaches the Prisma `create` call (and, for
// sales orders, the lib/finance/orders helpers). Kept pure-unit per
// vitest.config (no DB, no Next runtime): Prisma, the session, i18n, toast,
// next/cache and the orders helper are all mocked. Lives under lib/ because
// vitest `include` is lib/**/*.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Neutralize server-only (throws when imported outside an RSC bundle) in case
// any action module transitively pulls it in.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/i18n.server", () => ({ getLocale: () => "en" }));
vi.mock("@/lib/utils/toast", () => ({ flashToast: vi.fn() }));

// getCurrentUser is swapped per test (the caller's session identity).
const getCurrentUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));

// Capture the Prisma create calls without a database.
const create = {
  customer: vi.fn(),
  warehouse: vi.fn(),
  ledgerAccount: vi.fn(),
};
vi.mock("@/lib/db/db", () => ({
  prisma: {
    customer: { create: (...a: unknown[]) => create.customer(...a) },
    warehouse: { create: (...a: unknown[]) => create.warehouse(...a) },
    ledgerAccount: { create: (...a: unknown[]) => create.ledgerAccount(...a) },
  },
}));

// createSalesOrder delegates the tenant-keyed write to lib/finance/orders.
const createSO = vi.fn();
const findOrCreateCustomer = vi.fn();
vi.mock("@/lib/finance/orders", () => ({
  createSO: (...a: unknown[]) => createSO(...a),
  findOrCreateCustomer: (...a: unknown[]) => findOrCreateCustomer(...a),
  confirmSO: vi.fn(),
  fulfillSO: vi.fn(),
  cancelSO: vi.fn(),
}));

// Imported AFTER the mocks (vitest hoists vi.mock above imports).
import { createCustomer } from "@/app/(app)/admin/customers/actions";
import { createWarehouse } from "@/app/(app)/admin/warehouses/actions";
import { createLedgerAccount } from "@/app/(app)/admin/accounts/actions";
import { createSalesOrder } from "@/app/(app)/admin/sales-orders/actions";

// Workspace-pinned MANAGER (tenantSlug set) — must be forced to "arena".
const PINNED = { id: "u1", email: "m@x", name: "M", role: "MANAGER", tenantSlug: "arena", companyId: "c1" };
// Cross-tenant superadmin (no tenantSlug) — the submitted id stands.
const CROSS_ADMIN = { id: "u2", email: "a@x", name: "A", role: "ADMIN", tenantSlug: null, companyId: null };
// Passes the ADMIN/EXEC/MANAGER gate but has NO pin and is not an ADMIN —
// resolveAdminTenantId returns null, so the action must refuse (no write).
// (A STAFF caller is rejected earlier, at the role gate — a separate guarantee.)
const NAKED = { id: "u3", email: "s@x", name: "S", role: "MANAGER", tenantSlug: null, companyId: null };

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const k of Object.keys(obj)) f.set(k, obj[k]);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  createSO.mockResolvedValue({ soNumber: "SO-1" });
  findOrCreateCustomer.mockResolvedValue({ id: "cust-resolved" });
});

describe("createCustomer — tenant scope wiring (#174)", () => {
  it("PINNED manager: a FOREIGN tenantId is overridden to their own", async () => {
    getCurrentUser.mockResolvedValue(PINNED);
    await createCustomer(fd({ tenantId: "maha", name: "Acme" }));
    expect(create.customer).toHaveBeenCalledTimes(1);
    expect(create.customer.mock.calls[0][0].data.tenantId).toBe("arena");
    expect(create.customer.mock.calls[0][0].data.tenantId).not.toBe("maha");
  });

  it("PINNED manager: empty tenantId is filled from their session", async () => {
    getCurrentUser.mockResolvedValue(PINNED);
    await createCustomer(fd({ tenantId: "", name: "Acme" }));
    expect(create.customer.mock.calls[0][0].data.tenantId).toBe("arena");
  });

  it("CROSS-TENANT admin: the submitted tenantId stands", async () => {
    getCurrentUser.mockResolvedValue(CROSS_ADMIN);
    await createCustomer(fd({ tenantId: "maha", name: "Acme" }));
    expect(create.customer.mock.calls[0][0].data.tenantId).toBe("maha");
  });

  it("NON-admin with no pin: refuses (no write)", async () => {
    getCurrentUser.mockResolvedValue(NAKED);
    await createCustomer(fd({ tenantId: "maha", name: "Acme" }));
    expect(create.customer).not.toHaveBeenCalled();
  });
});

describe("createWarehouse — tenant scope wiring (#174)", () => {
  const base = { code: "WH1", name: "Main", type: "MAIN", active: "true" };
  it("PINNED manager: FOREIGN tenantId overridden to own", async () => {
    getCurrentUser.mockResolvedValue(PINNED);
    await createWarehouse(fd({ tenantId: "maha", ...base }));
    expect(create.warehouse).toHaveBeenCalledTimes(1);
    expect(create.warehouse.mock.calls[0][0].data.tenantId).toBe("arena");
  });
  it("CROSS-TENANT admin: submitted tenantId stands", async () => {
    getCurrentUser.mockResolvedValue(CROSS_ADMIN);
    await createWarehouse(fd({ tenantId: "maha", ...base }));
    expect(create.warehouse.mock.calls[0][0].data.tenantId).toBe("maha");
  });
  it("NON-admin with no pin: refuses (no write)", async () => {
    getCurrentUser.mockResolvedValue(NAKED);
    await createWarehouse(fd({ tenantId: "maha", ...base }));
    expect(create.warehouse).not.toHaveBeenCalled();
  });
});

describe("createLedgerAccount — tenant scope wiring (#174)", () => {
  const base = { code: "1000", name: "Cash", type: "ASSET" };
  it("PINNED manager: FOREIGN tenantId overridden to own", async () => {
    getCurrentUser.mockResolvedValue(PINNED);
    await createLedgerAccount(fd({ tenantId: "maha", ...base }));
    expect(create.ledgerAccount).toHaveBeenCalledTimes(1);
    expect(create.ledgerAccount.mock.calls[0][0].data.tenantId).toBe("arena");
  });
  it("CROSS-TENANT admin: submitted tenantId stands", async () => {
    getCurrentUser.mockResolvedValue(CROSS_ADMIN);
    await createLedgerAccount(fd({ tenantId: "maha", ...base }));
    expect(create.ledgerAccount.mock.calls[0][0].data.tenantId).toBe("maha");
  });
  it("NON-admin with no pin: refuses (no write)", async () => {
    getCurrentUser.mockResolvedValue(NAKED);
    await createLedgerAccount(fd({ tenantId: "maha", ...base }));
    expect(create.ledgerAccount).not.toHaveBeenCalled();
  });
});

describe("createSalesOrder — tenant scope wiring (#174)", () => {
  const lines = JSON.stringify([{ productId: "p1", quantity: 2, unitPrice: 10 }]);

  it("PINNED manager: createSO receives THEIR tenant, not the foreign one", async () => {
    getCurrentUser.mockResolvedValue(PINNED);
    await createSalesOrder(fd({ tenantId: "maha", customerId: "c-1", linesJson: lines }));
    expect(createSO).toHaveBeenCalledTimes(1);
    expect(createSO.mock.calls[0][0].tenantId).toBe("arena");
    expect(createSO.mock.calls[0][0].tenantId).not.toBe("maha");
  });

  it("PINNED manager: find-or-create customer also runs under their tenant", async () => {
    getCurrentUser.mockResolvedValue(PINNED);
    // no customerId → free-text name path → findOrCreateCustomer(prisma, tenantId, name)
    await createSalesOrder(fd({ tenantId: "maha", customer: "Walk-in", linesJson: lines }));
    expect(findOrCreateCustomer).toHaveBeenCalledTimes(1);
    expect(findOrCreateCustomer.mock.calls[0][1]).toBe("arena");
  });

  it("CROSS-TENANT admin: createSO receives the submitted tenant", async () => {
    getCurrentUser.mockResolvedValue(CROSS_ADMIN);
    await createSalesOrder(fd({ tenantId: "maha", customerId: "c-1", linesJson: lines }));
    expect(createSO.mock.calls[0][0].tenantId).toBe("maha");
  });

  it("NON-admin with no pin: refuses (no SO created)", async () => {
    getCurrentUser.mockResolvedValue(NAKED);
    await createSalesOrder(fd({ tenantId: "maha", customerId: "c-1", linesJson: lines }));
    expect(createSO).not.toHaveBeenCalled();
  });
});
