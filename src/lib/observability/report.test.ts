// Tests for the production error reporter.
//
// The two properties that actually matter in an incident:
//   1. It NEVER throws. An error handler that crashes turns one broken route
//      into a broken server, and hides the original fault.
//   2. It NEVER leaks a credential into the log sink.
// Everything else here guards the shape the log filters read.

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  redactSecrets,
  normalizeError,
  buildErrorEntry,
  fingerprint,
  shouldPush,
  reportError,
  __resetDedupe,
} from "@/lib/observability/report";

afterEach(() => {
  vi.restoreAllMocks();
  __resetDedupe();
  delete process.env.ERROR_WEBHOOK_URL;
});

describe("redactSecrets", () => {
  it("strips Anthropic and OpenRouter keys", () => {
    const out = redactSecrets("auth failed with sk-ant-api03-AbCdEf123456789 and sk-or-v1-ZZZZ99999999");
    expect(out).not.toContain("AbCdEf123456789");
    expect(out).not.toContain("ZZZZ99999999");
    expect(out).toContain("sk-ant-[redacted]");
    expect(out).toContain("sk-or-[redacted]");
  });

  it("strips Google API keys", () => {
    const out = redactSecrets("GEMINI call failed: AIzaSyD-abcdefghijklmnop123");
    expect(out).not.toContain("SyD-abcdefghijklmnop123");
    expect(out).toContain("AIza[redacted]");
  });

  it("strips credentials from a connection string but keeps the shape", () => {
    const out = redactSecrets("connect postgresql://admin:hunter2@db.internal:5432/hnerve failed");
    expect(out).not.toContain("hunter2");
    expect(out).toContain("postgresql://[redacted]@db.internal:5432/hnerve");
  });

  it("strips bearer tokens", () => {
    const out = redactSecrets("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig");
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(out.toLowerCase()).toContain("bearer [redacted]");
  });

  it("strips sensitive key=value pairs", () => {
    expect(redactSecrets("SESSION_PASSWORD=s3cr3tvalue")).toBe("SESSION_PASSWORD=[redacted]");
    expect(redactSecrets("?api_key=abc123&page=2")).toContain("api_key=[redacted]");
  });

  it("leaves ordinary text untouched", () => {
    const msg = "invoice INV-2026-0042 for tenant hourani-hotels failed validation";
    expect(redactSecrets(msg)).toBe(msg);
  });
});

describe("normalizeError", () => {
  it("normalizes a real Error with a trimmed stack", () => {
    const e = normalizeError(new Error("boom"));
    expect(e.name).toBe("Error");
    expect(e.message).toBe("boom");
    expect(e.stack?.split("\n").length).toBeLessThanOrEqual(8);
  });

  it("captures a cause", () => {
    const e = normalizeError(new Error("outer", { cause: new Error("inner") }));
    expect(e.cause).toContain("inner");
  });

  it("redacts secrets found in the message", () => {
    const e = normalizeError(new Error("call failed: sk-ant-api03-LEAKEDKEY123456"));
    expect(e.message).not.toContain("LEAKEDKEY123456");
  });

  it("handles a thrown string", () => {
    const e = normalizeError("plain failure");
    expect(e.name).toBe("NonError");
    expect(e.message).toBe("plain failure");
  });

  it("handles undefined (rejected promise with no reason)", () => {
    expect(normalizeError(undefined).message).toBe("undefined");
  });

  it("handles a circular object without throwing", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => normalizeError(circular)).not.toThrow();
  });

  it("handles a value whose stringification throws", () => {
    const hostile = {
      toString() {
        throw new Error("nope");
      },
      toJSON() {
        throw new Error("also nope");
      },
    };
    expect(() => normalizeError(hostile)).not.toThrow();
  });
});

describe("buildErrorEntry", () => {
  it("carries caller fields through and adds a fingerprint", () => {
    const entry = buildErrorEntry("invoice.create failed", new Error("db down"), {
      tenantId: "hourani-hotels",
      userId: 7,
    });
    expect(entry.msg).toBe("invoice.create failed");
    expect(entry.tenantId).toBe("hourani-hotels");
    expect(entry.userId).toBe(7);
    expect(entry.err.message).toBe("db down");
    expect(entry.fingerprint).toContain("Error|db down");
  });

  it("redacts string fields supplied by the caller", () => {
    const entry = buildErrorEntry("op failed", new Error("x"), {
      url: "https://api.example.com?api_key=SUPERSECRETVALUE",
    });
    expect(String(entry.url)).not.toContain("SUPERSECRETVALUE");
  });
});

describe("fingerprint + shouldPush", () => {
  // The fingerprint includes the first stack frame, which carries line:col.
  // That is deliberate — the SAME throw site recurring is what we want to
  // mute, and two different sites that happen to share a message are
  // different incidents. So "the same failure" means one throw site hit
  // twice, which is what a retry loop or a hammered broken route produces.
  it("gives the same fingerprint to the same throw site hit twice", () => {
    const thrower = () => {
      throw new Error("same");
    };
    const capture = () => {
      try {
        thrower();
      } catch (e) {
        return fingerprint(normalizeError(e));
      }
      return "";
    };
    expect(capture()).toBe(capture());
  });

  it("gives different fingerprints to different failures", () => {
    const a = fingerprint(normalizeError(new Error("one")));
    const b = fingerprint(normalizeError(new Error("two")));
    expect(a).not.toBe(b);
  });

  it("mutes a repeat inside the window and allows it after", () => {
    const fp = "Error|repeat|at x";
    expect(shouldPush(fp, 1_000)).toBe(true);
    expect(shouldPush(fp, 5_000)).toBe(false); // still inside 60s
    expect(shouldPush(fp, 70_000)).toBe(true); // window elapsed
  });

  it("does not mute a different fingerprint", () => {
    expect(shouldPush("Error|a|", 1_000)).toBe(true);
    expect(shouldPush("Error|b|", 1_000)).toBe(true);
  });
});

describe("reportError", () => {
  it("emits one structured line on the error stream", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportError("payment.post failed", new Error("ledger locked"), { tenantId: "maha" });
    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(String(spy.mock.calls[0][0]));
    expect(entry.level).toBe("error");
    expect(entry.msg).toBe("payment.post failed");
    expect(entry.tenantId).toBe("maha");
    expect(entry.err.message).toBe("ledger locked");
    expect(entry.fingerprint).toBeTruthy();
  });

  it("never throws, whatever it is handed", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const hostile = {
      get message() {
        throw new Error("hostile getter");
      },
    };
    expect(() => reportError("a", hostile)).not.toThrow();
    expect(() => reportError("b", undefined)).not.toThrow();
    expect(() => reportError("c", null)).not.toThrow();
    expect(() => reportError("d", 42)).not.toThrow();
  });

  it("does not call the webhook when ERROR_WEBHOOK_URL is unset", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    reportError("no webhook", new Error("x"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("pushes to the webhook once per fingerprint inside the dedupe window", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    process.env.ERROR_WEBHOOK_URL = "https://hooks.example.com/abc";

    // One throw site hit twice — the broken-route case the dedupe exists for.
    const err = new Error("same fault");
    reportError("repeated failure", err);
    reportError("repeated failure", err);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
    expect(body.text).toContain("repeated failure");
  });

  it("survives a webhook host that rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    process.env.ERROR_WEBHOOK_URL = "https://hooks.example.com/dead";
    expect(() => reportError("webhook dead", new Error("x"))).not.toThrow();
    // Give the rejected fire-and-forget promise a tick to settle unhandled.
    await new Promise((r) => setTimeout(r, 0));
  });
});
