import type { ZodSchema } from "zod";

// Returned from every form-bound server action. Plays nicely with React 18's
// `useFormState`, which expects (prev, formData) -> next.
export type FormState = {
  ok: boolean;
  // Field-level error messages keyed by field name. The Field component reads
  // these to render inline error UI + aria-invalid.
  errors?: Record<string, string>;
  // Form-wide error not tied to a specific field (DB constraint, server fault).
  formError?: string;
  // Optional success message (reserved — server actions usually redirect on
  // success rather than return a message).
  message?: string;
};

export const initialFormState: FormState = { ok: false };

// Runs zod safeParse and folds the issues into a FormState. First error per
// field wins, which matches how the UI surfaces a single message per input.
export function parseFormState<T>(
  schema: ZodSchema<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; state: FormState } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, state: { ok: false, errors } };
}

// Wraps a Prisma error (or any thrown error) into a FormState. Recognizes the
// common P2002 unique-constraint case so the message is surfaced on the right
// field instead of the global banner.
export function formStateFromError(
  err: unknown,
  fallbackAr = "حدث خطأ غير متوقع. حاول مرة أخرى.",
): FormState {
  const e = err as { code?: string; meta?: { target?: string[] }; message?: string };
  if (e?.code === "P2002") {
    const target = e.meta?.target?.[0];
    if (target) {
      return {
        ok: false,
        errors: { [target]: "هذه القيمة مستخدمة بالفعل." },
      };
    }
    return { ok: false, formError: "هذه القيمة مستخدمة بالفعل." };
  }
  return {
    ok: false,
    formError: e?.message && e.message.length < 200 ? e.message : fallbackAr,
  };
}
