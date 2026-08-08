import { describe, it, expect } from "vitest";
import { parseShell, otherShell, shellLabel, DEFAULT_SHELL } from "./shell";

describe("parseShell", () => {
  it("accepts the two real shells", () => {
    expect(parseShell("orbit")).toBe("orbit");
    expect(parseShell("console")).toBe("console");
  });

  // The whole point of the parser. A tampered or stale cookie must not be able
  // to render the app with no navigation at all.
  it("falls back to the default for anything it does not recognise", () => {
    for (const bad of [null, undefined, "", "ORBIT", "sidebar", "orbit ", "{}"]) {
      expect(parseShell(bad)).toBe(DEFAULT_SHELL);
    }
  });
});

describe("otherShell", () => {
  it("is a switch, not a cycle — twice returns you home", () => {
    expect(otherShell("orbit")).toBe("console");
    expect(otherShell("console")).toBe("orbit");
    expect(otherShell(otherShell("orbit"))).toBe("orbit");
  });
});

describe("shellLabel", () => {
  it("labels both shells in both languages", () => {
    for (const m of ["orbit", "console"] as const) {
      const l = shellLabel(m);
      expect(l.ar.length).toBeGreaterThan(0);
      expect(l.en.length).toBeGreaterThan(0);
    }
    expect(shellLabel("orbit").en).not.toBe(shellLabel("console").en);
  });
});
