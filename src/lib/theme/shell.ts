// lib/theme/shell.ts — which navigation shell the operator is wearing.
//
// TWO shells, one app. Same routes, same data, same background — only the way
// you MOVE through the system changes:
//
//   "orbit"   — the signature surface. Navigation is the Orrery: the constellation
//               rail plus the orbit return pill. Cinematic, and what the system
//               is pitched on.
//   "console" — a conventional ERP shell: one dense top bar, every group and
//               every section reachable in two clicks, nothing hidden behind a
//               metaphor. What you want at 9am on a Tuesday.
//
// This is a VIEW preference, not identity — so it lives in a cookie, exactly
// like the locale, the theme, and the time-machine cursor. Deliberately NOT in
// the session: switching shells must not require a re-login, and two people on
// one account may reasonably want different ones.
//
// The ambient background (LivingAtmosphere) is OUTSIDE this switch on purpose.
// It is the system's signature and renders identically in both shells.
//
// Pure module: no cookies() import, so client components can read the type and
// the parser without pulling server-only code into the bundle.

export const SHELL_COOKIE = "h_nerve_shell";

export type ShellMode = "orbit" | "console";

/** The shell a first-time visitor gets. Orbit is the signature surface. */
export const DEFAULT_SHELL: ShellMode = "orbit";

/**
 * Parse a raw cookie value into a shell.
 *
 * Anything unrecognised (absent, empty, tampered, a stale value from an older
 * build) falls back to the default rather than throwing: a bad cookie must
 * never be able to render the app navigation-less.
 */
export function parseShell(raw: string | null | undefined): ShellMode {
  return raw === "console" || raw === "orbit" ? raw : DEFAULT_SHELL;
}

/** The other one. Used by the toggle, which is a switch and not a menu. */
export function otherShell(mode: ShellMode): ShellMode {
  return mode === "orbit" ? "console" : "orbit";
}

/** Bilingual label for a shell, for the toggle button and its tooltip. */
export function shellLabel(mode: ShellMode): { ar: string; en: string } {
  return mode === "orbit"
    ? { ar: "المدار", en: "Orbit" }
    : { ar: "لوحة التحكم", en: "Console" };
}
