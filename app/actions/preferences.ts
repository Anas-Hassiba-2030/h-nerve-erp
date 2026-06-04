"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/i18n";
import { THEME_COOKIE, THEMES, type ThemeId } from "@/lib/theme/theme";
import { SIDEBAR_COOKIE } from "@/lib/utils/sidebarPref";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocale(formData: FormData) {
  const v = String(formData.get("locale") ?? "ar") as Locale;
  cookies().set(LOCALE_COOKIE, v === "en" ? "en" : "ar", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  revalidatePath("/", "layout");
}

export async function setTheme(formData: FormData) {
  const v = String(formData.get("theme") ?? "harmony") as ThemeId;
  const valid = THEMES[v] ? v : "harmony";
  cookies().set(THEME_COOKIE, valid, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  revalidatePath("/", "layout");
}

export async function setSidebarCollapsed(formData: FormData) {
  const v = String(formData.get("collapsed") ?? "");
  const next = v === "1" || v === "true" || v === "collapsed" ? "collapsed" : "expanded";
  cookies().set(SIDEBAR_COOKIE, next, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  revalidatePath("/", "layout");
}
