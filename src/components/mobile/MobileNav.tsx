// components/mobile/MobileNav.tsx
//
// Bottom tab bar. 4 destinations. Big touch targets, almost no chrome.
// The active tab gets a 3px hairline above it in ochre — same hairline
// vocabulary as the pull-to-refresh stroke.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Activity, ShieldCheck, User2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export function MobileNav({ ar }: { ar: boolean }) {
  const pathname = usePathname();
  const tabs: Array<{
    href: string;
    icon: any;
    ar: string;
    en: string;
    match: RegExp;
  }> = [
    { href: "/m", icon: Sun, ar: "اليوم", en: "Today", match: /^\/m$/ },
    {
      href: "/m/activity",
      icon: Activity,
      ar: "نشاط",
      en: "Activity",
      match: /^\/m\/activity/,
    },
    {
      href: "/m/approvals",
      icon: ShieldCheck,
      ar: "إقرارات",
      en: "Approvals",
      match: /^\/m\/approvals/,
    },
    {
      href: "/m/me",
      icon: User2,
      ar: "حسابي",
      en: "Me",
      match: /^\/m\/me/,
    },
  ];

  return (
    <nav className="m-nav" aria-label={ar ? "التنقل السفلي" : "Bottom navigation"}>
      {tabs.map((t) => {
        const active = t.match.test(pathname);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn("m-nav-tab", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="m-nav-label">{ar ? t.ar : t.en}</span>
          </Link>
        );
      })}
    </nav>
  );
}
