// Tests for the import rate limiter (security boundary for /api/import/test).
// Fixed-window, in-process: this guards a haywire client, not adversaries.

import { describe, it, expect } from "vitest";
import {
  checkImportRate,
  IMPORT_WINDOW_MS,
  IMPORT_MAX_PER_WINDOW,
} from "./importRateLimit";

describe("import rate limit — fixed window", () => {
  it("first hit on a fresh key is allowed and starts the window", () => {
    const key = "fresh-" + Math.random();
    const r = checkImportRate(key, 1_000_000);
    expect(r.allowed).toBe(true);
    expect(r.retryAfterSec).toBe(0);
    expect(r.remaining).toBe(IMPORT_MAX_PER_WINDOW - 1);
  });

  it("allows up to MAX hits within the window, then rejects", () => {
    const key = "burst-" + Math.random();
    const start = 2_000_000;
    // Fire MAX requests within the window — all should be allowed
    for (let i = 0; i < IMPORT_MAX_PER_WINDOW; i++) {
      const r = checkImportRate(key, start + i); // 1ms apart, all in-window
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(IMPORT_MAX_PER_WINDOW - 1 - i);
    }
    // The (MAX+1)-th must be rejected with a positive retryAfter
    const over = checkImportRate(key, start + IMPORT_MAX_PER_WINDOW);
    expect(over.allowed).toBe(false);
    expect(over.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(over.remaining).toBe(0);
  });

  it("resets the window after IMPORT_WINDOW_MS has elapsed", () => {
    const key = "rollover-" + Math.random();
    const t0 = 3_000_000;
    checkImportRate(key, t0); // window opens here
    // jump just past the window edge
    const r = checkImportRate(key, t0 + IMPORT_WINDOW_MS + 1);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(IMPORT_MAX_PER_WINDOW - 1); // fresh window
  });

  it("retryAfterSec decreases as the window approaches its end", () => {
    const key = "decay-" + Math.random();
    const t0 = 4_000_000;
    // Saturate the window
    for (let i = 0; i < IMPORT_MAX_PER_WINDOW; i++) checkImportRate(key, t0 + i);
    const early = checkImportRate(key, t0 + 1_000);            // ~59s left
    const late = checkImportRate(key, t0 + IMPORT_WINDOW_MS - 500); // ~1s left
    expect(early.retryAfterSec).toBeGreaterThan(late.retryAfterSec);
  });

  it("isolates keys (one key's saturation does not affect another)", () => {
    const a = "iso-A-" + Math.random();
    const b = "iso-B-" + Math.random();
    const t0 = 5_000_000;
    for (let i = 0; i < IMPORT_MAX_PER_WINDOW; i++) checkImportRate(a, t0 + i);
    const overA = checkImportRate(a, t0 + IMPORT_MAX_PER_WINDOW);
    expect(overA.allowed).toBe(false);
    const firstB = checkImportRate(b, t0 + IMPORT_MAX_PER_WINDOW);
    expect(firstB.allowed).toBe(true);
  });
});
