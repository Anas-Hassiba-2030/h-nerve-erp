import { beforeEach, describe, expect, it } from "vitest";
import {
  checkTenantLlmBudget,
  consumeTenantLlmBudget,
  __resetTenantLlmBudgets,
} from "./llmBudget";

const DAY1 = new Date("2026-07-10T08:00:00Z");
const DAY1_LATER = new Date("2026-07-10T23:59:00Z");
const DAY2 = new Date("2026-07-11T00:01:00Z");

describe("checkTenantLlmBudget", () => {
  beforeEach(() => __resetTenantLlmBudgets());

  it("allows a fresh tenant with zero usage", () => {
    const r = checkTenantLlmBudget("hourani-hotels", DAY1, 5);
    expect(r).toEqual({ allowed: true, used: 0, cap: 5 });
  });

  it("counts consumption within the same UTC day", () => {
    consumeTenantLlmBudget("hourani-hotels", DAY1);
    consumeTenantLlmBudget("hourani-hotels", DAY1_LATER);
    const r = checkTenantLlmBudget("hourani-hotels", DAY1_LATER, 5);
    expect(r.used).toBe(2);
    expect(r.allowed).toBe(true);
  });

  it("blocks once the cap is reached", () => {
    for (let i = 0; i < 3; i++) consumeTenantLlmBudget("maha-dairy", DAY1);
    const r = checkTenantLlmBudget("maha-dairy", DAY1, 3);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(3);
  });

  it("resets at the UTC day boundary", () => {
    for (let i = 0; i < 3; i++) consumeTenantLlmBudget("maha-dairy", DAY1);
    expect(checkTenantLlmBudget("maha-dairy", DAY1, 3).allowed).toBe(false);
    expect(checkTenantLlmBudget("maha-dairy", DAY2, 3)).toEqual({
      allowed: true,
      used: 0,
      cap: 3,
    });
    consumeTenantLlmBudget("maha-dairy", DAY2);
    expect(checkTenantLlmBudget("maha-dairy", DAY2, 3).used).toBe(1);
  });

  it("isolates tenants from each other", () => {
    for (let i = 0; i < 3; i++) consumeTenantLlmBudget("maha-dairy", DAY1);
    expect(checkTenantLlmBudget("maha-dairy", DAY1, 3).allowed).toBe(false);
    expect(checkTenantLlmBudget("loran-farms", DAY1, 3).allowed).toBe(true);
  });

  it("cap <= 0 disables the guard", () => {
    for (let i = 0; i < 100; i++) consumeTenantLlmBudget("maha-dairy", DAY1);
    expect(checkTenantLlmBudget("maha-dairy", DAY1, 0).allowed).toBe(true);
    expect(checkTenantLlmBudget("maha-dairy", DAY1, -1).allowed).toBe(true);
  });
});
