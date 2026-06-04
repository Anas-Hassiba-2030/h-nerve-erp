// components/workspace/WorkspaceNav.tsx
//
// The per-company ERP navigation. Renders only inside a workspace
// (mounted by app/(app)/workspace/layout.tsx). This is what makes a
// company feel like its own product: its own sections, its own rail.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  Wallet,
  Users2,
  GitBranch,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";

export function WorkspaceNav({ ar }: { ar: boolean }) {
  const pathname = usePathname();
  const tabs: Array<{
    href: string;
    ar: string;
    en: string;
    icon: any;
    match: RegExp;
  }> = [
    {
      href: "/workspace",
      ar: "القيادة",
      en: "Command",
      icon: LayoutDashboard,
      match: /^\/workspace$/,
    },
    {
      href: "/workspace/operations",
      ar: "العمليات",
      en: "Operations",
      icon: Factory,
      match: /^\/workspace\/operations/,
    },
    {
      href: "/workspace/finance",
      ar: "المالية",
      en: "Finance",
      icon: Wallet,
      match: /^\/workspace\/finance/,
    },
    {
      href: "/workspace/team",
      ar: "الفريق",
      en: "Team",
      icon: Users2,
      match: /^\/workspace\/team/,
    },
    {
      href: "/workspace/pipeline",
      ar: "المشاريع",
      en: "Pipeline",
      icon: GitBranch,
      match: /^\/workspace\/pipeline/,
    },
    {
      href: "/workspace/intelligence",
      ar: "الذكاء",
      en: "Intelligence",
      icon: BrainCircuit,
      match: /^\/workspace\/intelligence/,
    },
  ];

  return (
    <nav className="ws-nav" aria-label={ar ? "أقسام الشركة" : "Company sections"}>
      {tabs.map((t) => {
        const active = t.match.test(pathname);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn("ws-nav-tab", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span>{ar ? t.ar : t.en}</span>
          </Link>
        );
      })}
    </nav>
  );
}
