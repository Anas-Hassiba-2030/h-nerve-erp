import { describe, expect, it } from "vitest";
import { guardLlmAction, llmGuardLabel } from "./actionGuard";

describe("guardLlmAction", () => {
  it("allows under the per-user window and blocks past it", async () => {
    const uid = `u-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < 3; i++) {
      expect((await guardLlmAction("test-surface", uid, { max: 3 })).allowed).toBe(true);
    }
    const blocked = await guardLlmAction("test-surface", uid, { max: 3 });
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.reason).toBe("rate");
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("scopes the window per user and per surface", async () => {
    const a = `u-${Math.random().toString(36).slice(2)}`;
    const b = `u-${Math.random().toString(36).slice(2)}`;
    expect((await guardLlmAction("surface-1", a, { max: 1 })).allowed).toBe(true);
    expect((await guardLlmAction("surface-1", a, { max: 1 })).allowed).toBe(false);
    // Different user, same surface — own bucket.
    expect((await guardLlmAction("surface-1", b, { max: 1 })).allowed).toBe(true);
    // Same user, different surface — own bucket.
    expect((await guardLlmAction("surface-2", a, { max: 1 })).allowed).toBe(true);
  });
});

describe("llmGuardLabel", () => {
  it("renders the rate message with the retry window, both locales", () => {
    const r = { reason: "rate" as const, retryAfterSec: 42 };
    expect(llmGuardLabel(r, false)).toContain("42s");
    expect(llmGuardLabel(r, true)).toContain("42");
  });

  it("floors retryAfterSec at 1", () => {
    expect(llmGuardLabel({ reason: "rate", retryAfterSec: 0 }, false)).toContain("1s");
  });

  it("renders the budget message, both locales", () => {
    const r = { reason: "budget" as const, retryAfterSec: 0 };
    expect(llmGuardLabel(r, false)).toContain("AI budget");
    expect(llmGuardLabel(r, true)).toContain("حصة");
  });
});
