// lib/softDelete.ts — the Trash/restore safety net. The pure registry
// (path + Arabic toast per entity) and the bulk no-op guards are unit-safe;
// the prisma-touching paths are out of scope. We mock ./db + next/cache so
// the empty-selection guard is proven to short-circuit BEFORE any DB call.

import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/db/db", () => ({ prisma: {}, prismaUnscoped: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  pathFor,
  deletedLabel,
  restoredLabel,
  softRestoreMany,
  hardDeleteMany,
  type SoftEntity,
} from "@/lib/db/softDelete";

const ENTITIES: SoftEntity[] = ["task", "project", "insight", "forecast"];

describe("pathFor — each entity revalidates its own route", () => {
  it("maps every entity to a distinct, leading-slash path", () => {
    expect(pathFor("task")).toBe("/tasks");
    expect(pathFor("project")).toBe("/projects");
    expect(pathFor("insight")).toBe("/insights");
    expect(pathFor("forecast")).toBe("/supply-chain");
    const paths = ENTITIES.map(pathFor);
    expect(new Set(paths).size).toBe(ENTITIES.length); // all distinct
    for (const p of paths) expect(p.startsWith("/")).toBe(true);
  });
});

describe("Arabic toast labels — present, distinct, delete ≠ restore", () => {
  it("every entity has a non-empty deleted + restored Arabic label", () => {
    for (const e of ENTITIES) {
      expect(deletedLabel(e)).toBeTruthy();
      expect(restoredLabel(e)).toBeTruthy();
      expect(deletedLabel(e)).not.toBe(restoredLabel(e));
    }
  });
  it("uses the right verbs (حذف = delete, استرجاع = restore)", () => {
    expect(deletedLabel("task")).toContain("حذف");
    expect(restoredLabel("task")).toContain("استرجاع");
  });
});

describe("bulk guards — empty selection is a no-op (never hits the DB)", () => {
  // prisma is mocked as {}; if these did NOT short-circuit they would throw
  // on prisma.<model>.updateMany — so a clean `0` proves the guard.
  it("softRestoreMany([]) resolves 0 without touching prisma", async () => {
    await expect(softRestoreMany("task", [])).resolves.toBe(0);
  });
  it("hardDeleteMany([]) resolves 0 without touching prisma", async () => {
    await expect(hardDeleteMany("insight", [])).resolves.toBe(0);
  });
});
