// lib/password.ts — Phase 12 password strength policy. Single source
// used by every write path (signup, admin create, admin reset).
// Min 12 chars, must mix lower + upper + digit. Bilingual error.

export const MIN_PASSWORD_LEN = 12;

/** Returns a localized error string if `pw` is too weak, else null. */
export function passwordError(pw: string, ar: boolean): string | null {
  if (pw.length < MIN_PASSWORD_LEN)
    return ar
      ? `كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LEN} حرفاً`
      : `Password must be at least ${MIN_PASSWORD_LEN} characters`;
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
    return ar
      ? "كلمة المرور يجب أن تحوي أحرفاً صغيرة وكبيرة وأرقاماً"
      : "Password must include lower-case, upper-case and a digit";
  return null;
}

export function isStrongPassword(pw: string): boolean {
  return passwordError(pw, false) === null;
}
