import { toggleShell } from "@/app/actions/shell";
import { otherShell, shellLabel, type ShellMode } from "@/lib/theme/shell";
import type { Locale } from "@/lib/i18n/i18n";

/**
 * The shell switch — Orbit ⇄ Console.
 *
 * A plain <form> posting a server action, NOT a client component: this is one
 * cookie write and a re-render, and shipping a JS bundle for that would be
 * three files to do what the platform already does. It therefore also works
 * before hydration, which matters because it sits in the layout.
 *
 * Labelled with the shell you are switching TO, not the one you are in — a
 * toggle whose label names the current state reads as a status, and people
 * click it expecting nothing to happen.
 */
export function ShellSwitch({ mode, locale }: { mode: ShellMode; locale: Locale }) {
  const ar = locale === "ar";
  const target = otherShell(mode);
  const label = shellLabel(target);
  const text = ar ? label.ar : label.en;
  const title = ar ? `التبديل إلى ${label.ar}` : `Switch to ${label.en}`;

  return (
    <form action={toggleShell} className="hn-shell-switch">
      <button type="submit" className="hn-shell-btn" title={title} aria-label={title}>
        <span aria-hidden className="hn-shell-glyph">
          {target === "orbit" ? "◎" : "▦"}
        </span>
        <span className="hn-shell-lbl">{text}</span>
      </button>
    </form>
  );
}
