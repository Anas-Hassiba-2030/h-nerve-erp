"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, Hotel, Milk, Sprout, GraduationCap, Brain, Wallet,
  Sparkles, TrendingUp, Leaf, ChartLine, FlaskConical, ListChecks, Trophy, Users,
  Settings, Search, ChevronRight, Command, MessageCircle,
  Package, Truck, Receipt, Warehouse as WarehouseIcon, BookOpen,
} from "lucide-react";

type SearchHit = { id: string; kind: string; label: string; sub: string; href: string };

const HIT_ICON: Record<string, any> = {
  product: Package, customer: Users, supplier: Truck, invoice: Receipt,
  warehouse: WarehouseIcon, journal: BookOpen, brain: Brain,
};

type Item = {
  href: string;
  label: string;
  hint: string;
  icon: any;
  group: string;
  keys: string[];
};

const ENTRIES_AR: Item[] = [
  // Pseudo-href — handled specially in go() to open the Conversational overlay
  // instead of routing. Phase 15 of docs/PHASES-INTELLIGENCE.md.
  { href: "__ask_brain__",   label: "تحدّث مع الدماغ",        hint: "⌘J",          icon: MessageCircle,    group: "المساحة", keys: ["brain","ask","talk","تحدث","سؤال","دماغ"] },
  { href: "/dashboard",      label: "اللوحة التنفيذية",     hint: "نظرة عامة",    icon: LayoutDashboard, group: "المساحة", keys: ["dashboard","لوحة","executive"] },
  { href: "/companies",      label: "شركات المجموعة",       hint: "السجل القابض", icon: Building2,        group: "المساحة", keys: ["companies","شركات","group"] },
  { href: "/analytics",      label: "التحليلات المتقدمة",   hint: "تحليل عميق",   icon: ChartLine,        group: "المساحة", keys: ["analytics","تحليلات"] },
  { href: "/hotels",         label: "الفنادق والضيافة",     hint: "أرينا سبيس",   icon: Hotel,            group: "العمليات", keys: ["hotels","arena","فنادق","حجوزات"] },
  { href: "/dairy",          label: "المها للألبان",         hint: "خطوط الإنتاج", icon: Milk,             group: "العمليات", keys: ["dairy","maha","ألبان"] },
  { href: "/farms",          label: "لوران الزراعية",        hint: "دفيئات وحقول", icon: Sprout,           group: "العمليات", keys: ["farms","loran","مزارع","زراعة"] },
  { href: "/education",      label: "حاضنة The Tank",       hint: "AAU",         icon: GraduationCap,    group: "العمليات", keys: ["education","tank","aau","حاضنة"] },
  { href: "/supply-chain",   label: "سلسلة التوريد التنبؤية", hint: "AI Bridge",   icon: Brain,            group: "الذكاء", keys: ["supply","ai","brain","تنبؤ"] },
  { href: "/insights",       label: "إشارات الذكاء",         hint: "تنبيهات",      icon: Sparkles,         group: "الذكاء", keys: ["insights","إشارات"] },
  { href: "/voac",           label: "مجلس التشغيل الافتراضي", hint: "مقترحات",      icon: Users,            group: "الذكاء", keys: ["voac","agents","proposals","مقترحات","وكلاء","مجلس"] },
  { href: "/finance",        label: "المركز المالي",         hint: "إيرادات/مصاريف", icon: Wallet,         group: "النمو", keys: ["finance","مالية","money"] },
  { href: "/markets",        label: "الأسواق العالمية",      hint: "أسهم",         icon: TrendingUp,       group: "النمو", keys: ["markets","stocks","أسواق"] },
  { href: "/sustainability", label: "الاستدامة و ESG",       hint: "بيئة + حوكمة",  icon: Leaf,             group: "النمو", keys: ["sustainability","esg","استدامة"] },
  { href: "/projects",       label: "المشاريع المستقبلية",   hint: "Pipeline",      icon: FlaskConical,     group: "النمو", keys: ["projects","مشاريع","pipeline"] },
  { href: "/tasks",          label: "المهام والتلعيب",       hint: "XP",           icon: ListChecks,       group: "الفريق", keys: ["tasks","مهام","xp"] },
  { href: "/achievements",   label: "الإنجازات والرتب",      hint: "♚ ♛ ♞",        icon: Trophy,           group: "الفريق", keys: ["achievements","ranks","رتب","إنجازات"] },
  { href: "/users",          label: "الفريق",                hint: "Team",         icon: Users,            group: "الفريق", keys: ["users","team","فريق"] },
  { href: "/settings",       label: "الإعدادات",             hint: "Theme/Lang",   icon: Settings,         group: "النظام", keys: ["settings","إعدادات","theme","lang"] },
];

const RECENT_KEY = "h_nerve_recent_paths_v1";
const MAX_RECENT = 5;

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(href: string) {
  if (typeof window === "undefined") return;
  try {
    const current = readRecents();
    const next = [href, ...current.filter((p) => p !== href)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function CommandPalette({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const ar = locale === "ar";

  // Debounced live entity search (Phase 10). Aborts stale requests.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((d) => setHits(Array.isArray(d.hits) ? d.hits : []))
        .catch(() => { /* aborted / failed → keep nav-only */ });
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus on open + load recents
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ("");
      setActiveIdx(0);
      setRecents(readRecents());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ENTRIES_AR;
    const nav = ENTRIES_AR.filter((it) =>
      it.label.includes(term) ||
      it.hint.toLowerCase().includes(term) ||
      it.group.includes(term) ||
      it.keys.some((k) => k.toLowerCase().includes(term))
    );
    // Live entity hits appended as navigable items under one group so
    // the existing grouping + keyboard nav handle them unchanged.
    const hitItems: Item[] = hits.map((h) => ({
      href: h.href,
      label: h.label,
      hint: h.sub,
      icon: HIT_ICON[h.kind] ?? Search,
      group: ar ? "نتائج" : "Results",
      keys: [],
    }));
    return [...nav, ...hitItems];
  }, [q, hits, ar]);

  function go(href: string) {
    if (href === "__ask_brain__") {
      // Hand off to the Conversational overlay (mounted in (app)/layout).
      setOpen(false);
      window.dispatchEvent(new CustomEvent("h-nerve:converse:open"));
      return;
    }
    pushRecent(href);
    setOpen(false);
    router.push(href);
  }

  // Recent items resolved against the entries dict
  const recentEntries = recents
    .map((href) => ENTRIES_AR.find((e) => e.href === href))
    .filter((e): e is typeof ENTRIES_AR[number] => Boolean(e));

  return (
    <>
      {/* Trigger pill (used in Topbar) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition hover:scale-[1.02] md:flex"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>{locale === "ar" ? "بحث سريع" : "Quick search"}</span>
        <kbd
          className="rounded px-1 font-mono text-[12px]"
          style={{ background: "color-mix(in srgb, var(--text-muted) 16%, transparent)" }}
        >
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 anim-fade-in"
            style={{ background: "color-mix(in srgb, var(--text) 50%, transparent)", backdropFilter: "blur(6px)" }}
            onClick={() => setOpen(false)}
          />
          {/* Modal */}
          <div
            className="relative z-10 w-[92%] max-w-xl overflow-hidden rounded-2xl shadow-glow anim-rise-glow"
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <Command className="h-4 w-4" style={{ color: "var(--brand)" }} />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter") { e.preventDefault(); const it = filtered[activeIdx]; if (it) go(it.href); }
                }}
                placeholder={locale === "ar" ? "اكتب للبحث في كل الوحدات…" : "Search across all modules…"}
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
              />
              <kbd
                className="rounded px-1.5 py-0.5 font-mono text-[12px]"
                style={{ background: "color-mix(in srgb, var(--text-muted) 18%, transparent)", color: "var(--text-muted)" }}
              >
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {/* Recents section — shown only when no query */}
              {!q && recentEntries.length > 0 ? (
                <div className="mb-2">
                  <div className="px-3 pb-1 pt-2 text-[12px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {locale === "ar" ? "تصفّحت مؤخراً" : "Recent"}
                  </div>
                  {recentEntries.map((it) => {
                    const Icon = it.icon;
                    return (
                      <button
                        key={`recent-${it.href}`}
                        type="button"
                        onClick={() => go(it.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition hover:bg-[var(--brand-soft)]"
                        style={{ color: "var(--text)" }}
                      >
                        <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                        <span className="flex-1 truncate text-sm font-bold">{it.label}</span>
                        <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                          {locale === "ar" ? "أخير" : "Recent"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {locale === "ar" ? "لا نتائج." : "No results."}
                </div>
              ) : (
                groupBy(filtered, "group").map(([group, items]) => (
                  <div key={group} className="mb-2">
                    <div className="px-3 pb-1 pt-2 text-[12px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {group}
                    </div>
                    {items.map((it) => {
                      const Icon = it.icon;
                      const idx = filtered.indexOf(it);
                      const active = idx === activeIdx;
                      return (
                        <button
                          key={it.href}
                          type="button"
                          onClick={() => go(it.href)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition"
                          style={{
                            background: active ? "var(--brand-soft)" : "transparent",
                            color: active ? "var(--brand-deep)" : "var(--text)",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "var(--brand)" : "var(--text-muted)" }} />
                          <span className="flex-1 truncate text-sm font-bold">{it.label}</span>
                          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{it.hint}</span>
                          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" style={{ color: "var(--text-muted)" }} />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-2 text-[12px]"
                 style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <span>↑↓ {locale === "ar" ? "للتنقل" : "navigate"}</span>
              <span>↵ {locale === "ar" ? "للفتح" : "open"}</span>
              <span>⌘K {locale === "ar" ? "للإغلاق" : "toggle"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function groupBy<T extends { group: string }>(arr: T[], key: "group"): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    if (!map.has(item[key])) map.set(item[key], []);
    map.get(item[key])!.push(item);
  }
  return [...map.entries()];
}
