// Phase C scoping — proven WITHOUT a server, port, DB, or API key.
// This is the runtime proof the dev-server port collision blocked.

import { describe, it, expect } from "vitest";
import { applyWorkspaceScope } from "@/lib/tenancy/workspaceScope";

// A fake Prisma `next`: records what args it was handed, returns `ret`.
function fakeNext(ret: any = { ok: true }) {
  const calls: any[] = [];
  const next = async (p: any) => {
    calls.push(JSON.parse(JSON.stringify(p)));
    return ret;
  };
  return { next, calls };
}

describe("applyWorkspaceScope — the pitch-safety invariant", () => {
  it("no workspace => params untouched (identical to pre-Phase-C)", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Hotel", action: "findMany", args: { where: { status: "OPEN" } } },
      next,
      null,
    );
    expect(calls[0].args).toEqual({ where: { status: "OPEN" } });
  });

  it("non-scoped model (User) is never filtered, even with a workspace", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "User", action: "findUnique", args: { where: { id: "u1" } } },
      next,
      "ARENA",
    );
    expect(calls[0].args).toEqual({ where: { id: "u1" } });
  });
});

describe("applyWorkspaceScope — reads are constrained to the workspace", () => {
  it("findMany injects companyId and preserves existing filters", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Hotel", action: "findMany", args: { where: { status: "OPEN" } } },
      next,
      "ARENA",
    );
    expect(calls[0].args.where).toEqual({ status: "OPEN", companyId: "ARENA" });
  });

  it("count with no args still gets scoped", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope({ model: "Transaction", action: "count" }, next, "MAHA");
    expect(calls[0].args.where).toEqual({ companyId: "MAHA" });
  });

  it("findUnique hides a row that belongs to another company", async () => {
    const { next } = fakeNext({ id: "h1", companyId: "MAHA" });
    const row = await applyWorkspaceScope(
      { model: "Hotel", action: "findUnique", args: { where: { id: "h1" } } },
      next,
      "ARENA",
    );
    expect(row).toBeNull();
  });

  it("findUnique returns the row when it belongs to the workspace", async () => {
    const { next } = fakeNext({ id: "h1", companyId: "ARENA" });
    const row = await applyWorkspaceScope(
      { model: "Hotel", action: "findUnique", args: { where: { id: "h1" } } },
      next,
      "ARENA",
    );
    expect(row).toEqual({ id: "h1", companyId: "ARENA" });
  });

  it("findUniqueOrThrow throws for a foreign-company row", async () => {
    const { next } = fakeNext({ id: "h1", companyId: "MAHA" });
    await expect(
      applyWorkspaceScope(
        { model: "Hotel", action: "findUniqueOrThrow", args: { where: { id: "h1" } } },
        next,
        "ARENA",
      ),
    ).rejects.toThrow();
  });
});

describe("applyWorkspaceScope — Phase F3 tenant-id scoping", () => {
  it("no tenantSlug => tenant-scoped model passes through", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Product", action: "findMany", args: { where: { deletedAt: null } } },
      next,
      null,
      null,
    );
    expect(calls[0].args).toEqual({ where: { deletedAt: null } });
  });

  it("findMany on a tenant-scoped model stamps tenantId", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Product", action: "findMany", args: { where: { deletedAt: null } } },
      next,
      null,
      "maha-dairy",
    );
    expect(calls[0].args.where).toEqual({ deletedAt: null, tenantId: "maha-dairy" });
  });

  it("findUnique hides a row that belongs to another tenant", async () => {
    const { next } = fakeNext({ id: "p1", tenantId: "loran-agri" });
    const row = await applyWorkspaceScope(
      { model: "Product", action: "findUnique", args: { where: { id: "p1" } } },
      next,
      null,
      "maha-dairy",
    );
    expect(row).toBeNull();
  });

  it("create stamps the tenantSlug when tenantId is absent", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Supplier", action: "create", args: { data: { name: "X" } } },
      next,
      null,
      "maha-dairy",
    );
    expect(calls[0].args.data).toEqual({ name: "X", tenantId: "maha-dairy" });
  });

  it("create is BLOCKED when tenantId points at another tenant", async () => {
    const { next } = fakeNext();
    await expect(
      applyWorkspaceScope(
        { model: "Supplier", action: "create", args: { data: { name: "X", tenantId: "loran-agri" } } },
        next,
        null,
        "maha-dairy",
      ),
    ).rejects.toThrow(/cross-tenant/i);
  });

  it("non-tenant-scoped model (Hotel) ignores tenantSlug", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Hotel", action: "findMany", args: {} },
      next,
      null,
      "maha-dairy",
    );
    expect(calls[0].args ?? {}).toEqual({});
  });
});

describe("applyWorkspaceScope — Phase F6 by-id write guard", () => {
  // Custom fakeNext: returns different rows for findUnique vs the actual write.
  function rowFakeNext(probeRow: any) {
    const calls: any[] = [];
    const next = async (p: any) => {
      calls.push(JSON.parse(JSON.stringify(p)));
      if (p.action === "findUnique") return probeRow;
      return { ok: true };
    };
    return { next, calls };
  }

  it("update by-id BLOCKED when target belongs to another tenant", async () => {
    const { next } = rowFakeNext({ id: "p1", tenantId: "loran-agri" });
    await expect(
      applyWorkspaceScope(
        { model: "Product", action: "update", args: { where: { id: "p1" }, data: { name: "X" } } },
        next,
        null,
        "maha-dairy",
      ),
    ).rejects.toThrow(/cross-tenant write/i);
  });

  it("update by-id ALLOWED when target belongs to active tenant", async () => {
    const { next, calls } = rowFakeNext({ id: "p1", tenantId: "maha-dairy" });
    await applyWorkspaceScope(
      { model: "Product", action: "update", args: { where: { id: "p1" }, data: { name: "X" } } },
      next,
      null,
      "maha-dairy",
    );
    // probe + actual update = 2 calls
    expect(calls.length).toBe(2);
    expect(calls[1].action).toBe("update");
  });

  it("delete by-id BLOCKED across tenants", async () => {
    const { next } = rowFakeNext({ id: "s1", tenantId: "tank-incubator" });
    await expect(
      applyWorkspaceScope(
        { model: "Supplier", action: "delete", args: { where: { id: "s1" } } },
        next,
        null,
        "maha-dairy",
      ),
    ).rejects.toThrow(/cross-tenant write/i);
  });

  it("upsert by-id BLOCKED across tenants", async () => {
    const { next } = rowFakeNext({ id: "c1", tenantId: "loran-agri" });
    await expect(
      applyWorkspaceScope(
        { model: "Customer", action: "upsert", args: { where: { id: "c1" }, update: { name: "X" }, create: { id: "c1", name: "X" } } },
        next,
        null,
        "maha-dairy",
      ),
    ).rejects.toThrow(/cross-tenant write/i);
  });

  it("compound-unique where (not by-id) passes through", async () => {
    const { next, calls } = rowFakeNext(null);
    await applyWorkspaceScope(
      { model: "Product", action: "update", args: { where: { tenantId_sku_warehouseId: { tenantId: "maha-dairy", sku: "X", warehouseId: "w1" } }, data: { name: "X" } } },
      next,
      null,
      "maha-dairy",
    );
    // No probe; goes straight to the underlying update.
    expect(calls.length).toBe(1);
    expect(calls[0].action).toBe("update");
  });
});

describe("applyWorkspaceScope — writes cannot cross workspaces", () => {
  it("create stamps the workspace when companyId is absent", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Hotel", action: "create", args: { data: { name: "X" } } },
      next,
      "ARENA",
    );
    expect(calls[0].args.data).toEqual({ name: "X", companyId: "ARENA" });
  });

  it("create is BLOCKED when companyId points at another company", async () => {
    const { next } = fakeNext();
    await expect(
      applyWorkspaceScope(
        { model: "Hotel", action: "create", args: { data: { name: "X", companyId: "MAHA" } } },
        next,
        "ARENA",
      ),
    ).rejects.toThrow(/cross-workspace/i);
  });

  it("updateMany / deleteMany are constrained to the workspace", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "Farm", action: "deleteMany", args: { where: { status: "OLD" } } },
      next,
      "LORAN",
    );
    expect(calls[0].args.where).toEqual({ status: "OLD", companyId: "LORAN" });
  });
});

describe("applyWorkspaceScope — Phase F6 companyId by-id write guard (ISOLATION-FIX)", () => {
  // Mirrors the tenant-side by-id guard for the companyId plane: a pinned
  // operator must not update/delete another company's SCOPED_MODELS row by id.
  function rowFakeNext(probeRow: any) {
    const calls: any[] = [];
    const next = async (p: any) => {
      calls.push(JSON.parse(JSON.stringify(p)));
      if (p.action === "findUnique") return probeRow;
      return { ok: true };
    };
    return { next, calls };
  }

  it("update by-id BLOCKED when target belongs to another company", async () => {
    const { next } = rowFakeNext({ id: "h1", companyId: "MAHA" });
    await expect(
      applyWorkspaceScope(
        { model: "Hotel", action: "update", args: { where: { id: "h1" }, data: { name: "X" } } },
        next,
        "ARENA",
      ),
    ).rejects.toThrow(/cross-workspace write/i);
  });

  it("update by-id ALLOWED when target belongs to active workspace", async () => {
    const { next, calls } = rowFakeNext({ id: "h1", companyId: "ARENA" });
    await applyWorkspaceScope(
      { model: "Hotel", action: "update", args: { where: { id: "h1" }, data: { name: "X" } } },
      next,
      "ARENA",
    );
    expect(calls.length).toBe(2); // probe + actual update
    expect(calls[1].action).toBe("update");
  });

  it("delete by-id BLOCKED across companies (DairyBatch / Farm / Transaction class)", async () => {
    const { next } = rowFakeNext({ id: "b1", companyId: "LORAN" });
    await expect(
      applyWorkspaceScope(
        { model: "DairyBatch", action: "delete", args: { where: { id: "b1" } } },
        next,
        "MAHA",
      ),
    ).rejects.toThrow(/cross-workspace write/i);
  });

  it("by-id guard does not fire when there is no workspace cookie (ADMIN pass-through)", async () => {
    const { next, calls } = rowFakeNext({ id: "h1", companyId: "MAHA" });
    await applyWorkspaceScope(
      { model: "Hotel", action: "delete", args: { where: { id: "h1" } } },
      next,
      null,
    );
    expect(calls.length).toBe(1); // straight through, no probe
    expect(calls[0].action).toBe("delete");
  });

  it("compound-unique where (not a plain id) passes through", async () => {
    const { next, calls } = rowFakeNext(null);
    await applyWorkspaceScope(
      { model: "FutureProject", action: "update", args: { where: { someCompound: { a: 1 } }, data: { stage: "X" } } },
      next,
      "ARENA",
    );
    expect(calls.length).toBe(1);
    expect(calls[0].action).toBe("update");
  });
});

describe("applyWorkspaceScope — ImportLog is tenant-scoped (ISOLATION-FIX / TASK C)", () => {
  it("findMany stamps tenantId for a pinned operator", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "ImportLog", action: "findMany", args: { where: {} } },
      next,
      null,
      "maha-dairy",
    );
    expect(calls[0].args.where).toEqual({ tenantId: "maha-dairy" });
  });

  it("create is BLOCKED when tenantId points at another tenant", async () => {
    const { next } = fakeNext();
    await expect(
      applyWorkspaceScope(
        { model: "ImportLog", action: "create", args: { data: { endpoint: "x", tenantId: "loran-agri" } } },
        next,
        null,
        "maha-dairy",
      ),
    ).rejects.toThrow(/cross-tenant/i);
  });

  it("no tenant cookie => ImportLog passes through (ADMIN / bearer-token import API / cron)", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "ImportLog", action: "findMany", args: { where: { endpoint: "test" } } },
      next,
      null,
      null,
    );
    expect(calls[0].args).toEqual({ where: { endpoint: "test" } });
  });
});

describe("applyWorkspaceScope — Phase ISO-2 dual-company-FK scoping (SupplyForecast)", () => {
  function rowFakeNext(probeRow: any) {
    const calls: any[] = [];
    const next = async (p: any) => {
      calls.push(JSON.parse(JSON.stringify(p)));
      if (p.action === "findUnique") return probeRow;
      return { ok: true };
    };
    return { next, calls };
  }

  it("no workspace => passes through unchanged", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "SupplyForecast", action: "findMany", args: { where: { status: "DRAFT" } } },
      next,
      null,
    );
    expect(calls[0].args).toEqual({ where: { status: "DRAFT" } });
  });

  it("findMany ANDs an OR-of-both-endpoints with existing filters", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "SupplyForecast", action: "findMany", args: { where: { status: "DRAFT" } } },
      next,
      "ARENA",
    );
    expect(calls[0].args.where).toEqual({
      AND: [
        { status: "DRAFT" },
        { OR: [{ sourceCompanyId: "ARENA" }, { targetCompanyId: "ARENA" }] },
      ],
    });
  });

  it("findUnique returns the row when the workspace is the SOURCE", async () => {
    const { next } = rowFakeNext({ id: "f1", sourceCompanyId: "ARENA", targetCompanyId: "MAHA" });
    const row = await applyWorkspaceScope(
      { model: "SupplyForecast", action: "findUnique", args: { where: { id: "f1" } } },
      next,
      "ARENA",
    );
    expect(row).not.toBeNull();
  });

  it("findUnique returns the row when the workspace is the TARGET", async () => {
    const { next } = rowFakeNext({ id: "f1", sourceCompanyId: "HOTELS", targetCompanyId: "MAHA" });
    const row = await applyWorkspaceScope(
      { model: "SupplyForecast", action: "findUnique", args: { where: { id: "f1" } } },
      next,
      "MAHA",
    );
    expect(row).not.toBeNull();
  });

  it("findUnique hides a forecast where the workspace is NEITHER endpoint", async () => {
    const { next } = rowFakeNext({ id: "f1", sourceCompanyId: "HOTELS", targetCompanyId: "MAHA" });
    const row = await applyWorkspaceScope(
      { model: "SupplyForecast", action: "findUnique", args: { where: { id: "f1" } } },
      next,
      "LORAN",
    );
    expect(row).toBeNull();
  });

  it("create BLOCKED when the workspace is neither endpoint", async () => {
    const { next } = fakeNext();
    await expect(
      applyWorkspaceScope(
        { model: "SupplyForecast", action: "create", args: { data: { sourceCompanyId: "HOTELS", targetCompanyId: "MAHA" } } },
        next,
        "LORAN",
      ),
    ).rejects.toThrow(/cross-workspace create/i);
  });

  it("create ALLOWED when the workspace is the source (e.g. auto-generate)", async () => {
    const { next, calls } = fakeNext();
    await applyWorkspaceScope(
      { model: "SupplyForecast", action: "create", args: { data: { sourceCompanyId: "HOTELS", targetCompanyId: "MAHA" } } },
      next,
      "HOTELS",
    );
    expect(calls.length).toBe(1);
  });

  it("update by-id BLOCKED when neither endpoint is the workspace", async () => {
    const { next } = rowFakeNext({ id: "f1", sourceCompanyId: "HOTELS", targetCompanyId: "MAHA" });
    await expect(
      applyWorkspaceScope(
        { model: "SupplyForecast", action: "update", args: { where: { id: "f1" }, data: { status: "APPROVED" } } },
        next,
        "LORAN",
      ),
    ).rejects.toThrow(/cross-workspace write/i);
  });

  it("update by-id ALLOWED when the workspace is the target", async () => {
    const { next, calls } = rowFakeNext({ id: "f1", sourceCompanyId: "HOTELS", targetCompanyId: "MAHA" });
    await applyWorkspaceScope(
      { model: "SupplyForecast", action: "update", args: { where: { id: "f1" }, data: { status: "APPROVED" } } },
      next,
      "MAHA",
    );
    expect(calls.length).toBe(2); // probe + update
    expect(calls[1].action).toBe("update");
  });
});
