// Phase C scoping — proven WITHOUT a server, port, DB, or API key.
// This is the runtime proof the dev-server port collision blocked.

import { describe, it, expect } from "vitest";
import { applyWorkspaceScope } from "./workspaceScope";

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
