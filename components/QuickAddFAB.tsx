"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Plus, Hotel, Milk, Sprout, GraduationCap, Brain, Sparkles,
  ListChecks, FlaskConical, Wallet, Building2, X, Command,
} from "lucide-react";

// Floating Quick-Add button — bottom-end on every authenticated page.
// Opens a radial menu of "create new …" shortcuts. Keyboard: Cmd/Ctrl+N
// toggles it; Esc closes; arrow-key navigation through items.

type Item = {
  href: string;
  ar: string;
  en: string;
  hint_ar: string;
  hint_en: string;
  icon: any;
  tone: string;
};

const ITEMS: Item[] = [
  { href: "/hotels/bookings/new",      ar: "حجز فندقي",        en: "New booking",      hint_ar: "أرينا",        hint_en: "Arena",       icon: Hotel,          tone: "amber" },
  { href: "/dairy/new",                ar: "دفعة ألبان",       en: "New batch",        hint_ar: "المها",        hint_en: "Maha",        icon: Milk,           tone: "sky" },
  { href: "/farms/crops/new",          ar: "محصول جديد",        en: "Plant crop",       hint_ar: "لوران",        hint_en: "Loran",       icon: Sprout,         tone: "emerald" },
  { href: "/education/new",            ar: "برنامج Tank",       en: "Tank program",     hint_ar: "حاضنة",        hint_en: "Incubator",   icon: GraduationCap,  tone: "indigo" },
  { href: "/supply-chain/new",         ar: "تنبؤ يدوي",         en: "Forecast",         hint_ar: "AI Bridge",    hint_en: "AI Bridge",   icon: Brain,          tone: "violet" },
  { href: "/insights/new",             ar: "إشارة ذكاء",        en: "Insight",          hint_ar: "تنبيه",        hint_en: "Alert",       icon: Sparkles,       tone: "amber" },
  { href: "/finance/new",              ar: "معاملة مالية",      en: "Transaction",      hint_ar: "إيراد/مصروف",  hint_en: "Rev/Exp",     icon: Wallet,         tone: "emerald" },
  { href: "/tasks/new",                ar: "مهمة جديدة",        en: "Task",             hint_ar: "XP",           hint_en: "XP",          icon: ListChecks,     tone: "blue" },
  { href: "/projects/new",             ar: "مشروع",            en: "Project",          hint_ar: "Pipeline",     hint_en: "Pipeline",    icon: FlaskConical,   tone: "violet" },
  { href: "/companies/new",            ar: "شركة",             en: "Company",          hint_ar: "وحدة عمل",     hint_en: "Business",    icon: Building2,      tone: "emerald" },
];

const TONE: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function QuickAddFAB({ locale }: { locale: "ar" | "en" }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ar = locale === "ar";

  // Cmd/Ctrl+N — toggle. Esc — close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isToggle =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "n";
      if (isToggle) {
        const target = e.target as HTMLElement | null;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        if (target?.isContentEditable) return;
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      } else if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        setActive((a) => {
          const filtered = filterItems(filter);
          if (filtered.length === 0) return 0;
          return (a + dir + filtered.length) % filtered.length;
        });
      } else if (open && e.key === "Enter") {
        const filtered = filterItems(filter);
        const item = filtered[active];
        if (item) {
          window.location.href = item.href;
          setOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filter, active]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Auto-focus input when opening
  useEffect(() => {
    if (open) {
      setFilter("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  function filterItems(q: string): Item[] {
    if (!q.trim()) return ITEMS;
    const lower = q.toLowerCase();
    return ITEMS.filter(
      (it) =>
        it.ar.includes(q) ||
        it.en.toLowerCase().includes(lower) ||
        it.hint_ar.includes(q) ||
        it.hint_en.toLowerCase().includes(lower) ||
        it.href.includes(lower),
    );
  }

  const filtered = filterItems(filter);

  // The app sidebar uses flex-row-reverse — sidebar sits on the RIGHT in LTR
  // and on the LEFT in RTL. So the FAB needs to live on the OPPOSITE side
  // (LEFT in LTR, RIGHT in RTL) to stay clear of it.
  return (
    <div
      ref={ref}
      className="fixed bottom-6 z-40 ltr:left-6 rtl:right-6"
    >
      {/* Panel */}
      {open ? (
        <div
          className="anim-fade-up mb-3 w-[min(96vw,360px)] overflow-hidden rounded-2xl shadow-glow"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{
              borderBottom: "1px solid var(--border)",
              background:
                "linear-gradient(135deg, var(--brand-soft) 0%, transparent 100%)",
            }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
                color: "white",
              }}
            >
              <Plus className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[12.5px] font-extrabold"
                style={{ color: "var(--text)" }}
              >
                {ar ? "إنشاء سريع" : "Quick add"}
              </div>
              <div
                className="text-[9.5px]"
                style={{ color: "var(--text-muted)" }}
              >
                {ar
                  ? "اكتب لتصفية أو ↑↓ للتنقل · Enter لتأكيد"
                  : "Type to filter · ↑↓ navigate · Enter to confirm"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 transition hover:bg-[var(--brand-soft)]"
              aria-label="close"
            >
              <X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Filter input */}
          <div
            className="px-3 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <input
              ref={inputRef}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setActive(0);
              }}
              placeholder={ar ? "ابحث عن ما تريد إنشاؤه…" : "What do you want to create…"}
              className="input w-full text-[12.5px]"
              style={{ height: "34px" }}
            />
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div
                className="py-6 text-center text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {ar ? "لا نتائج" : "No matches"}
              </div>
            ) : (
              filtered.map((it, i) => {
                const Icon = it.icon;
                const isActive = i === active;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className="flex items-center gap-2.5 px-3 py-2 transition"
                    style={{
                      background: isActive ? "var(--brand-soft)" : "transparent",
                    }}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${TONE[it.tone] ?? TONE.emerald}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[12.5px] font-extrabold"
                        style={{ color: "var(--text)" }}
                      >
                        {ar ? it.ar : it.en}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {ar ? it.hint_ar : it.hint_en}
                      </div>
                    </div>
                    {isActive ? (
                      <span
                        className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-extrabold"
                        style={{
                          background: "var(--brand)",
                          color: "white",
                        }}
                      >
                        ↵
                      </span>
                    ) : null}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div
            className="flex items-center justify-between px-3 py-2 text-[9.5px]"
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--brand-soft)",
              color: "var(--text-muted)",
            }}
          >
            <span className="flex items-center gap-1 font-bold">
              <Command className="h-2.5 w-2.5" />
              <kbd
                className="rounded px-1.5 py-0.5 font-mono"
                style={{
                  background: "white",
                  border: "1px solid var(--border)",
                }}
              >
                ⌘N
              </kbd>
              {ar ? "للفتح/الإغلاق" : "to toggle"}
            </span>
            <span className="font-bold">
              {filtered.length}/{ITEMS.length}
            </span>
          </div>
        </div>
      ) : null}

      {/* The button itself */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={ar ? "إنشاء سريع (⌘N)" : "Quick add (⌘N)"}
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow transition hover:scale-105 active:scale-95"
        style={{
          background:
            "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
          color: "white",
        }}
        aria-expanded={open}
      >
        {/* Pulse ring */}
        <span
          className="absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100"
          style={{
            boxShadow: "0 0 0 8px var(--brand-soft)",
            animation: open ? "none" : "fab-pulse 2.5s ease-in-out infinite",
          }}
        />
        <Plus
          className={`relative h-6 w-6 transition-transform ${open ? "rotate-45" : ""}`}
          strokeWidth={2.5}
        />
      </button>

      <style>{`
        @keyframes fab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--brand-soft); opacity: 0.7; }
          50%      { box-shadow: 0 0 0 12px transparent; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
