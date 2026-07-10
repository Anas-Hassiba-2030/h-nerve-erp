"use client";

// UserMenu — the personal-utilities dropdown (IA split B1, PR #288 approved).
//
// Search / Pinned / Settings / Trash / Help / Profile / Logout moved here OUT
// of the orrery System group, which shrinks to actual system surfaces. Same
// compact anchored-dropdown pattern as NotificationCenter beside it — solid
// backing, never covers page content with a radial (the owner rejected radial
// popups three times; see the #263 mini-orbit decision).

import { useState } from "react";
import Link from "next/link";
import {
  CircleUserRound, Search, Pin, Settings, Trash2, LifeBuoy, LogOut, UserRound,
} from "lucide-react";

const ITEMS: Array<{
  href: string;
  ar: string;
  en: string;
  icon: typeof Search;
}> = [
  { href: "/me",       ar: "ملفي الشخصي", en: "My profile", icon: UserRound },
  { href: "/search",   ar: "البحث",        en: "Search",     icon: Search },
  { href: "/pinned",   ar: "المثبّت",      en: "Pinned",     icon: Pin },
  { href: "/settings", ar: "الإعدادات",    en: "Settings",   icon: Settings },
  { href: "/trash",    ar: "المحذوفات",    en: "Trash",      icon: Trash2 },
  { href: "/help",     ar: "المساعدة",     en: "Help",       icon: LifeBuoy },
];

export function UserMenu({
  locale,
  userName,
}: {
  locale: "ar" | "en";
  userName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ar = locale === "ar";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center rounded-xl p-2 transition hover:scale-110"
        style={{
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
        }}
        aria-label={ar ? "قائمة المستخدم" : "User menu"}
        aria-expanded={open}
      >
        <CircleUserRound className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl shadow-glow anim-fade-up"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            {userName ? (
              <div
                className="px-4 py-2.5 text-xs font-bold"
                style={{
                  color: "var(--text)",
                  borderBottom: "1px solid var(--border)",
                  background:
                    "linear-gradient(135deg, var(--brand-soft) 0%, transparent 100%)",
                }}
              >
                {userName}
              </div>
            ) : null}

            <nav className="py-1">
              {ITEMS.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] transition hover:bg-black/5"
                    style={{ color: "var(--text)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                    <span className="flex-1">{ar ? it.ar : it.en}</span>
                  </Link>
                );
              })}
            </nav>

            <form
              action="/logout"
              method="post"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-semibold transition hover:bg-black/5"
                style={{ color: "var(--danger, #b3402a)" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                {ar ? "تسجيل الخروج" : "Sign out"}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
