"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Hotel, Milk, Sprout, GraduationCap,
  Brain, Wallet, Sparkles, TrendingUp, Leaf, ChartLine, FlaskConical,
  ListChecks, Trophy, Users, Settings, LogOut, Activity, ChevronLeft,
  ChevronRight, UserSquare2, ArrowLeftRight, Search, FileText, HelpCircle,
  GitBranch, Map, Pin, MessageSquare, Bell, Workflow, Heart, Network, Zap, Target, Globe2, Plug, ScrollText, Sparkles as SparklesIcon, PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccess } from "@/lib/permissions";
import { Logo, LogoLockup } from "./Logo";
import { rankById, type Rank } from "@/lib/gamification";
import { setSidebarCollapsed } from "@/app/actions/preferences";

type NavItem = { href: string; label: string; icon: any; hint?: string };

export function Sidebar({
  user,
  locale,
  messages,
  collapsed = false,
  variant = "desktop",
  unreadMessages = 0,
  enforcePerms = false,
}: {
  user: { name: string; email: string; role: string; title?: string | null; rank?: string; xp?: number; bonusPercent?: number };
  locale: "ar" | "en";
  messages: Record<string, string>;
  collapsed?: boolean;
  variant?: "desktop" | "drawer";
  unreadMessages?: number;
  enforcePerms?: boolean;
}) {
  // Capped display — three-digit nav badges look ugly. Anything past 99 → "99+".
  const unreadHint =
    unreadMessages > 99 ? "99+" : unreadMessages > 0 ? String(unreadMessages) : undefined;
  const pathname = usePathname();
  const ar = locale === "ar";

  // Drawer is always full-width inside its own off-canvas container; only the
  // desktop variant honors the collapsed flag.
  const c = collapsed && variant === "desktop";

  // Cmd/Ctrl+B toggles the sidebar — VS Code / Cursor convention. We bind only
  // on the desktop variant so the listener doesn't double-fire when the
  // mobile drawer is open.
  useEffect(() => {
    if (variant !== "desktop") return;
    function onKey(e: KeyboardEvent) {
      const isToggle =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "b";
      if (!isToggle) return;
      // Don't hijack typing in form fields.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      e.preventDefault();
      const form = document.querySelector<HTMLFormElement>(
        "form[data-sidebar-toggle]",
      );
      form?.requestSubmit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  const groups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: ar ? "المساحة" : "Workspace",
      items: [
        { href: "/dashboard", label: messages["nav.dashboard"], icon: LayoutDashboard },
        { href: "/showcase", label: ar ? "عرض المنظومة" : "Showcase", icon: PlayCircle, hint: "TOUR" },
        { href: "/search", label: ar ? "البحث الشامل" : "Search", icon: Search, hint: "⌘K" },
        { href: "/pinned", label: ar ? "المثبتة" : "Pinned", icon: Pin },
        { href: "/companies", label: messages["nav.companies"], icon: Building2 },
        { href: "/analytics", label: messages["nav.analytics"], icon: ChartLine },
        { href: "/compare", label: ar ? "مقارنة شركتين" : "Compare", icon: ArrowLeftRight },
      ],
    },
    {
      label: ar ? "العمليات" : "Operations",
      items: [
        { href: "/hotels", label: messages["nav.hotels"], icon: Hotel },
        { href: "/dairy", label: messages["nav.dairy"], icon: Milk },
        { href: "/farms", label: messages["nav.farms"], icon: Sprout },
        { href: "/education", label: messages["nav.education"], icon: GraduationCap },
      ],
    },
    {
      label: ar ? "الذكاء التشغيلي" : "Intelligence",
      items: [
        { href: "/admin/brain", label: ar ? "رؤى العقل" : "Brain insights", icon: Brain, hint: "AI" },
        { href: "/brain/graph", label: ar ? "الرسم السببي" : "Causal graph", icon: Network, hint: "BRAIN" },
        { href: "/brain/scenarios", label: ar ? "ماذا لو…" : "What-if simulator", icon: Zap, hint: "BRAIN" },
        { href: "/brain/council", label: ar ? "المجلس" : "The council", icon: Users, hint: "BRAIN" },
        { href: "/plans", label: ar ? "الخطط" : "Plans", icon: Target, hint: "BRAIN" },
        { href: "/brain/memory", label: ar ? "بحيرة الذاكرة" : "Memory lake", icon: Heart, hint: "BRAIN" },
        { href: "/brain/learning", label: ar ? "ما تعلّمتُه" : "What I've learned", icon: GraduationCap, hint: "BRAIN" },
        { href: "/brain/benchmarks", label: ar ? "معايير النظراء" : "Peer benchmarks", icon: Globe2, hint: "BRAIN" },
        { href: "/brain/iq", label: ar ? "ذكاء الدماغ" : "Brain IQ", icon: Trophy, hint: "META" },
        { href: "/supply-chain", label: messages["nav.supplyChain"], icon: Brain, hint: "AI" },
        { href: "/insights", label: messages["nav.insights"], icon: Sparkles },
        { href: "/alerts", label: ar ? "التنبيهات الذكية" : "Smart alerts", icon: Bell },
        { href: "/workflows", label: ar ? "خرائط الأتمتة" : "Workflows", icon: Workflow },
        { href: "/integrations", label: ar ? "الموصلات" : "Integrations", icon: Plug, hint: "HUB" },
        { href: "/documents", label: ar ? "ذكاء المستندات" : "Documents", icon: ScrollText, hint: "AI" },
      ],
    },
    {
      label: ar ? "النمو والاستثمار" : "Growth & Capital",
      items: [
        { href: "/finance", label: messages["nav.finance"], icon: Wallet },
        { href: "/markets", label: messages["nav.markets"], icon: TrendingUp },
        { href: "/sustainability", label: messages["nav.sustainability"], icon: Leaf },
        { href: "/projects", label: messages["nav.projects"], icon: FlaskConical },
      ],
    },
    {
      label: ar ? "الفريق" : "People",
      items: [
        { href: "/messages", label: ar ? "الرسائل" : "Messages", icon: MessageSquare, hint: unreadHint },
        { href: "/tasks", label: messages["nav.tasks"], icon: ListChecks },
        { href: "/achievements", label: messages["nav.achievements"], icon: Trophy },
        { href: "/employees", label: messages["nav.employees"], icon: UserSquare2 },
        { href: "/users", label: messages["nav.users"], icon: Users },
      ],
    },
    {
      label: ar ? "النظام" : "System",
      items: [
        { href: "/reports", label: ar ? "التقارير الرسمية" : "Reports", icon: FileText },
        { href: "/activity", label: ar ? "سجل النشاط" : "Activity log", icon: Activity },
        { href: "/system", label: ar ? "صحة النظام" : "System health", icon: Heart },
        { href: "/help", label: ar ? "المساعدة" : "Help", icon: HelpCircle },
        { href: "/changelog", label: ar ? "السجل الزمني" : "Changelog", icon: GitBranch },
        { href: "/roadmap", label: ar ? "خارطة الطريق المستقبلية" : "Roadmap", icon: Map },
        { href: "/settings", label: messages["nav.settings"], icon: Settings },
      ],
    },
  ];

  // Superadmin console — hard-gated to ADMIN per CLAUDE.md production
  // rule. Inserted directly after the Intelligence group so it never
  // drifts if groups are reordered.
  if (user.role === "ADMIN") {
    const intelLabel = ar ? "الذكاء التشغيلي" : "Intelligence";
    const adminGroup = {
      label: ar ? "الإدارة العليا" : "Admin",
      items: [
        { href: "/admin/tenants", label: ar ? "المستأجرون" : "Tenants", icon: Building2, hint: "ADMIN" },
        { href: "/admin/empire", label: ar ? "الإمبراطورية" : "Empire", icon: Globe2, hint: "ADMIN" },
        { href: "/admin/system", label: ar ? "النظام" : "System console", icon: Settings, hint: "ADMIN" },
      ],
    };
    const i = groups.findIndex((g) => g.label === intelLabel);
    if (i >= 0) groups.splice(i + 1, 0, adminGroup);
    else groups.push(adminGroup);
  }

  // Phase 5 — UI hiding. Only when enforcement is on (flag-OFF = the
  // sidebar looks exactly as before). Drops links the role can't reach
  // and any group left empty. Server-side middleware is the real gate;
  // this just avoids showing dead links.
  if (enforcePerms) {
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      groups[gi].items = groups[gi].items.filter((it) =>
        canAccess(user.role, it.href),
      );
      if (groups[gi].items.length === 0) groups.splice(gi, 1);
    }
  }

  const rank = rankById((user.rank ?? "PAWN") as Rank);

  const widthClass =
    variant === "drawer" ? "w-[280px]" : c ? "w-[72px]" : "w-72";
  const visibilityClass = variant === "desktop" ? "hidden md:flex" : "flex";

  return (
    <aside
      className={cn(
        "shrink-0 flex-col border-l anim-slide-right transition-[width] duration-200",
        variant === "desktop" ? "sticky top-0 h-screen" : "h-full",
        widthClass,
        visibilityClass,
      )}
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border)",
      }}
      aria-label={ar ? "القائمة الجانبية" : "Sidebar"}
    >
      {/* Brand block */}
      <div
        className={cn(
          "flex items-center gap-3 py-4",
          c ? "justify-center px-2" : "justify-between px-5",
        )}
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {c ? <Logo size={36} withSatellites={false} /> : <LogoLockup size={36} />}
      </div>

      {/* Scrollable nav */}
      <nav
        className={cn(
          "flex-1 space-y-3 overflow-y-auto py-3",
          c ? "px-2" : "px-3",
        )}
      >
        {groups.map((g, gi) => (
          <div key={g.label} className="space-y-0.5" style={{ animationDelay: `${gi * 60}ms` }}>
            {c ? (
              gi > 0 ? (
                <div
                  className="my-2 mx-3 h-px"
                  style={{ background: "var(--border)" }}
                  aria-hidden
                />
              ) : null
            ) : (
              <div
                className="flex items-center gap-2 px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="block h-px flex-1" style={{ background: "var(--border)" }} />
                <span>{g.label}</span>
                <span className="block h-px flex-1" style={{ background: "var(--border)" }} />
              </div>
            )}
            {g.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={c ? item.label : undefined}
                  aria-label={c ? item.label : undefined}
                  className={cn(
                    "sidebar-link group relative flex items-center rounded-xl text-sm font-bold transition-all duration-200",
                    c ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                    active
                      ? "shadow-soft"
                      : "hover:translate-x-[-2px] rtl:hover:translate-x-[2px]",
                  )}
                  style={
                    active
                      ? {
                          background: "var(--brand-soft)",
                          color: "var(--brand-deep)",
                          boxShadow: "0 0 0 1px color-mix(in srgb, var(--brand) 18%, transparent)",
                        }
                      : { color: "var(--text-muted)" }
                  }
                >
                  {/* Active indicator bar */}
                  {active && !c ? (
                    <span
                      className="absolute end-0 top-1/2 -translate-y-1/2"
                      style={{
                        width: "3px",
                        height: "60%",
                        borderRadius: "999px",
                        background: "linear-gradient(180deg, var(--brand) 0%, var(--accent) 100%)",
                      }}
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition",
                      active ? "" : "group-hover:scale-110",
                    )}
                    style={{ color: active ? "var(--brand)" : undefined }}
                  />
                  {!c ? (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[9px] font-black"
                          style={{
                            background: "var(--brand)",
                            color: "white",
                            opacity: 0.85,
                          }}
                        >
                          {item.hint}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="sidebar-tooltip" role="tooltip">
                      {item.label}
                      {item.hint ? (
                        <span className="sidebar-tooltip-hint">{item.hint}</span>
                      ) : null}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System status */}
      <div className={cn("pb-2", c ? "px-2" : "px-3")}>
        <div
          className={cn(
            "flex items-center rounded-xl text-[11px] anim-fade-up",
            c ? "justify-center p-2" : "gap-2 px-3 py-2",
          )}
          style={{
            background: "var(--brand-soft)",
            color: "var(--brand-deep)",
            border: "1px solid color-mix(in srgb, var(--brand) 22%, transparent)",
          }}
          title={c ? (ar ? "النظام العصبي نشط" : "Nerve system live") : undefined}
        >
          <Activity className="h-3.5 w-3.5" />
          {!c ? (
            <>
              <span className="font-bold">{ar ? "النظام العصبي نشط" : "Nerve system live"}</span>
              <span className="ms-auto opacity-70">v1.1</span>
            </>
          ) : null}
        </div>
      </div>

      {/* User card with chess rank */}
      <div className={c ? "p-2" : "p-3"} style={{ borderTop: "1px solid var(--border)" }}>
        {c ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/achievements"
              className="rank-piece anim-pop"
              style={{ color: rank.color }}
              title={`${user.name} · ${ar ? rank.ar : rank.en}`}
            >
              {rank.symbol}
            </Link>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="btn-icon"
                title={messages["common.signOut"]}
                aria-label={messages["common.signOut"]}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <>
            <div
              className="mb-2 flex items-center gap-3 rounded-2xl p-2.5"
              style={{ background: "color-mix(in srgb, var(--brand) 6%, transparent)" }}
            >
              <div
                className="rank-piece anim-pop"
                style={{ color: rank.color }}
                title={rank.ar}
              >
                {rank.symbol}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-extrabold" style={{ color: "var(--text)" }}>
                  {user.name}
                </div>
                <div className="flex items-center gap-1 truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>{ar ? rank.ar : rank.en}</span>
                  <span>·</span>
                  <span className="font-mono">{user.xp ?? 0} XP</span>
                  <span>·</span>
                  <span style={{ color: "var(--accent)" }}>+{user.bonusPercent ?? 0}٪</span>
                </div>
              </div>
              <Link href="/achievements" className="text-[var(--text-muted)] hover:text-[var(--brand)]" title={ar ? "الإنجازات" : "Achievements"}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
            <form action="/logout" method="post">
              <button type="submit" className="btn-ghost w-full justify-start">
                <LogOut className="h-4 w-4" />
                {messages["common.signOut"]}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Collapse / expand toggle — desktop only */}
      {variant === "desktop" ? (
        <SidebarToggle collapsed={collapsed} ar={ar} />
      ) : null}
    </aside>
  );
}

function SidebarToggle({ collapsed, ar }: { collapsed: boolean; ar: boolean }) {
  const expandLabel = ar ? "توسيع القائمة" : "Expand sidebar";
  const collapseLabel = ar ? "تصغير القائمة" : "Collapse sidebar";
  const tip = `${collapsed ? expandLabel : collapseLabel}  ·  ⌘B`;
  return (
    <form
      action={setSidebarCollapsed}
      data-sidebar-toggle
      className="sidebar-toggle-form border-t"
      style={{ borderColor: "var(--border)" }}
    >
      <input type="hidden" name="collapsed" value={collapsed ? "0" : "1"} />
      <button
        type="submit"
        className="sidebar-toggle-btn flex w-full items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors"
        style={{ color: "var(--text-muted)" }}
        title={tip}
        aria-label={tip}
        aria-pressed={collapsed}
      >
        {/* In RTL the sidebar sits on the right; expand chevron points toward
            content (left/start), collapse chevron toward the wall. We flip on
            ar to keep semantics correct. */}
        {collapsed ? (
          ar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        ) : ar ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
        {!collapsed ? (
          <>
            <span>{collapseLabel}</span>
            <kbd className="sidebar-toggle-kbd">⌘B</kbd>
          </>
        ) : null}
      </button>
    </form>
  );
}
