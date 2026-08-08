"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SHELL_COOKIE, parseShell, otherShell, shellHome, type ShellMode } from "@/lib/theme/shell";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Flip between the Orbit shell and the Console shell.
 *
 * No auth check and no validation beyond the parser, on purpose: this writes a
 * VIEW preference and nothing else. It grants no access — both shells route to
 * exactly the same pages behind exactly the same permission map — so gating it
 * would add a failure mode without removing one.
 *
 * revalidatePath("/", "layout") rather than a targeted path because the shell
 * IS the layout; revalidating only the current page would leave the old
 * navigation rendered around the new content.
 */
export async function toggleShell(): Promise<void> {
  const jar = await cookies();
  const next: ShellMode = otherShell(parseShell(jar.get(SHELL_COOKIE)?.value));
  jar.set(SHELL_COOKIE, next, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/", "layout");
  // Land on the shell you switched INTO, not on the page you happened to be on.
  // Swapping only the chrome around the current page is the change nobody sees:
  // the operator clicks the switch, the middle of the screen is identical, and
  // they conclude the button is broken. Each shell has a home that IS the shell
  // — the Orrery bloom, or the everything-at-once board — so show it.
  redirect(shellHome(next));
}
