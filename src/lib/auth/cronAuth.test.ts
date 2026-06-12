import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  cronSecretConfigured,
  isCronAuthorized,
  timingSafeStringEqual,
} from "./cronAuth";

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe("cronSecretConfigured", () => {
  it("false when unset", () => {
    delete process.env.CRON_SECRET;
    expect(cronSecretConfigured()).toBe(false);
  });

  it("false when blank/whitespace", () => {
    process.env.CRON_SECRET = "   ";
    expect(cronSecretConfigured()).toBe(false);
  });

  it("true when set", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(cronSecretConfigured()).toBe(true);
  });
});

describe("timingSafeStringEqual", () => {
  it("true for identical strings", () => {
    expect(timingSafeStringEqual("abc", "abc")).toBe(true);
  });

  it("false for same-length mismatch", () => {
    expect(timingSafeStringEqual("abd", "abc")).toBe(false);
  });

  it("false for different lengths", () => {
    expect(timingSafeStringEqual("ab", "abc")).toBe(false);
  });

  it("fails closed on non-string input", () => {
    expect(timingSafeStringEqual(undefined, "abc")).toBe(false);
    expect(timingSafeStringEqual(null, "abc")).toBe(false);
    expect(timingSafeStringEqual(123, "abc")).toBe(false);
    expect(timingSafeStringEqual({ toString: () => "abc" }, "abc")).toBe(false);
  });

  it("fails closed on empty expected", () => {
    expect(timingSafeStringEqual("", "")).toBe(false);
  });

  it("handles multibyte UTF-8 correctly", () => {
    expect(timingSafeStringEqual("سرّي", "سرّي")).toBe(true);
    expect(timingSafeStringEqual("سرّي", "سرّى")).toBe(false);
  });
});

describe("isCronAuthorized", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
  });

  it("accepts the exact bearer token", () => {
    expect(isCronAuthorized("Bearer s3cret")).toBe(true);
  });

  it("trims the configured secret before comparing", () => {
    process.env.CRON_SECRET = "  s3cret  ";
    expect(isCronAuthorized("Bearer s3cret")).toBe(true);
  });

  it("rejects a wrong token of the same length", () => {
    expect(isCronAuthorized("Bearer s3creX")).toBe(false);
  });

  it("rejects a wrong-length token", () => {
    expect(isCronAuthorized("Bearer s3cret-longer")).toBe(false);
  });

  it("rejects the bare secret without the Bearer prefix", () => {
    expect(isCronAuthorized("s3cret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isCronAuthorized(null)).toBe(false);
    expect(isCronAuthorized(undefined)).toBe(false);
    expect(isCronAuthorized("")).toBe(false);
  });

  it("fails closed when the secret is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized("Bearer s3cret")).toBe(false);
  });

  it("fails closed when the secret is blank", () => {
    process.env.CRON_SECRET = "  ";
    expect(isCronAuthorized("Bearer ")).toBe(false);
  });
});
