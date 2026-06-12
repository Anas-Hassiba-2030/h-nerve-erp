// Server-only helpers — never import this file from a client component.

import { cookies } from "next/headers";
import { THEME_COOKIE, themeById, type ThemeDef } from "@/lib/theme/theme";

export async function getTheme(): Promise<ThemeDef> {
  const id = (await cookies()).get(THEME_COOKIE)?.value;
  return themeById(id);
}

export { themeCssVars } from "@/lib/theme/theme";
