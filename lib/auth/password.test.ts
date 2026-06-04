// Tests for the password strength policy (Phase 12 — security boundary).
// Used by signup, admin create, and admin password reset.

import { describe, it, expect } from "vitest";
import { passwordError, isStrongPassword, MIN_PASSWORD_LEN } from "@/lib/auth/password";

describe("password policy", () => {
  it("constant: minimum length is at least 12", () => {
    expect(MIN_PASSWORD_LEN).toBeGreaterThanOrEqual(12);
  });

  describe("rejects weak passwords", () => {
    const weak: Array<[string, string]> = [
      ["empty string", ""],
      ["too short (11 chars)", "Aa1bcdefghi"],
      ["no upper-case", "alllowercase1234"],
      ["no lower-case", "ALLUPPERCASE1234"],
      ["no digit", "MixedCaseNoDigits"],
      ["lower + digits only", "lowercase1234567"],
      ["upper + digits only", "UPPERCASE1234567"],
    ];
    for (const [name, pw] of weak) {
      it(name, () => {
        expect(isStrongPassword(pw)).toBe(false);
        expect(passwordError(pw, false)).not.toBeNull();
        expect(passwordError(pw, true)).not.toBeNull();
      });
    }
  });

  describe("accepts strong passwords", () => {
    const strong = [
      "GoodPass1234",
      "MahaCheese2026!",
      "أنسTheBest123",          // bilingual chars OK as long as min-length + classes met
      "X".repeat(11) + "x1",    // 13 chars, has classes
    ];
    for (const pw of strong) {
      it(`accepts "${pw.slice(0, 14)}…"`, () => {
        expect(isStrongPassword(pw)).toBe(true);
        expect(passwordError(pw, false)).toBeNull();
        expect(passwordError(pw, true)).toBeNull();
      });
    }
  });

  it("returns localized error strings", () => {
    const short = "short1A";
    const ar = passwordError(short, true);
    const en = passwordError(short, false);
    expect(ar).toMatch(/كلمة المرور/);
    expect(en).toMatch(/Password/);
  });
});
