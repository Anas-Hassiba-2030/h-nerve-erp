// Tests for the structured logger (Phase 24 / D13). Verifies the scoped()
// child logger stamps scope + base fields (e.g. tenantId) onto every entry
// and that levels route to the right stream — the contract Railway log
// filtering depends on.

import { describe, it, expect, vi, afterEach } from "vitest";
import { log, scoped } from "./logger";

function captureOut() {
  return vi.spyOn(process.stdout, "write").mockImplementation(() => true);
}
function captureErr() {
  return vi.spyOn(process.stderr, "write").mockImplementation(() => true);
}

afterEach(() => vi.restoreAllMocks());

function lastEntry(spy: ReturnType<typeof captureOut>) {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(String(call?.[0]));
}

describe("logger — base log", () => {
  it("emits a JSON line with ts/level/msg", () => {
    const out = captureOut();
    log.info("hello", { a: 1 });
    const e = lastEntry(out);
    expect(e.level).toBe("info");
    expect(e.msg).toBe("hello");
    expect(e.a).toBe(1);
    expect(typeof e.ts).toBe("string");
  });

  it("routes warn/error to stderr, info to stdout", () => {
    const out = captureOut();
    const err = captureErr();
    log.info("on stdout");
    log.error("on stderr");
    expect(out).toHaveBeenCalledTimes(1);
    expect(err).toHaveBeenCalledTimes(1);
    expect(lastEntry(out).msg).toBe("on stdout");
    expect(lastEntry(err).msg).toBe("on stderr");
  });
});

describe("logger — scoped()", () => {
  it("stamps scope onto every entry", () => {
    const out = captureOut();
    const slog = scoped("import");
    slog.info("batch");
    expect(lastEntry(out).scope).toBe("import");
  });

  it("binds base fields like tenantId", () => {
    const err = captureErr();
    const slog = scoped("import", { tenantId: "maha" });
    slog.error("rejected", { count: 3 });
    const e = lastEntry(err);
    expect(e.scope).toBe("import");
    expect(e.tenantId).toBe("maha");
    expect(e.count).toBe(3);
    expect(e.level).toBe("error");
  });

  it("per-call fields override bound base fields", () => {
    const out = captureOut();
    const slog = scoped("seed", { tenantId: "a" });
    slog.info("override", { tenantId: "b" });
    expect(lastEntry(out).tenantId).toBe("b");
  });
});
