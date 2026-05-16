// lib/formState.ts — every form-bound server action funnels validation and
// DB errors through this. A wrong fold means an investor sees a raw stack
// trace or a silent save. Pure (zod only), no IO.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  initialFormState,
  parseFormState,
  formStateFromError,
} from "./formState";

describe("initialFormState", () => {
  it("starts not-ok with no errors (useFormState seed)", () => {
    expect(initialFormState).toEqual({ ok: false });
  });
});

describe("parseFormState", () => {
  const schema = z.object({ name: z.string().min(2), age: z.coerce.number().int() });

  it("valid input returns parsed, typed data", () => {
    const r = parseFormState(schema, { name: "Anas", age: "30" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ name: "Anas", age: 30 });
  });

  it("invalid input returns ok:false with per-field messages", () => {
    const r = parseFormState(schema, { name: "", age: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.state.ok).toBe(false);
      expect(r.state.errors).toHaveProperty("name");
      expect(r.state.errors).toHaveProperty("age");
    }
  });

  it("first error per field wins (single message per input)", () => {
    // two ordered failures on the same path → only the FIRST surfaces
    const s = z.object({ x: z.string().min(5, "min5").regex(/^\d+$/, "digits") });
    const r = parseFormState(s, { x: "ab" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.state.errors!.x).toBe("min5");
  });
});

describe("formStateFromError — Prisma-aware folding", () => {
  it("P2002 with a target field → inline error on that field", () => {
    const fs = formStateFromError({ code: "P2002", meta: { target: ["email"] } });
    expect(fs).toEqual({ ok: false, errors: { email: "هذه القيمة مستخدمة بالفعل." } });
  });

  it("P2002 without a target → form-wide duplicate message", () => {
    const fs = formStateFromError({ code: "P2002" });
    expect(fs.errors).toBeUndefined();
    expect(fs.formError).toBe("هذه القيمة مستخدمة بالفعل.");
  });

  it("a short generic message is surfaced verbatim", () => {
    const fs = formStateFromError(new Error("Database unreachable"));
    expect(fs.formError).toBe("Database unreachable");
  });

  it("an over-long (≥200 char) message is hidden behind the AR fallback", () => {
    const fs = formStateFromError(new Error("x".repeat(250)));
    expect(fs.formError).toBe("حدث خطأ غير متوقع. حاول مرة أخرى.");
  });

  it("undefined / no-message error → AR fallback, never throws", () => {
    expect(formStateFromError(undefined).formError).toBe("حدث خطأ غير متوقع. حاول مرة أخرى.");
    expect(formStateFromError({}, "بديل").formError).toBe("بديل");
  });
});
