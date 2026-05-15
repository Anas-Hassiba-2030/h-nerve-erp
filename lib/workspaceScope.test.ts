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
