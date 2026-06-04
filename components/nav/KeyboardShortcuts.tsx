"use client";

import { useEffect, useState } from "react";
import { Keyboard, X, Search, Bell, Settings, Globe, Palette, LogOut, ListChecks } from "lucide-react";

type Shortcut = {
  keys: string[];
  ar: string;
  en: string;
  icon?: any;
  group: "ar:نظام,en:System" | "ar:تنقّل,en:Navigation" | "ar:إجراءات,en:Actions";
};

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘/Ctrl", "K"], ar: "البحث السريع", en: "Quick search", icon: Search, group: "ar:نظام,en:System" },
  { keys: ["?"], ar: "عرض الاختصارات", en: "Show shortcuts", icon: Keyboard, group: "ar:نظام,en:System" },
  { keys: ["Esc"], ar: "إغلاق النوافذ", en: "Close dialogs", icon: X, group: "ar:نظام,en:System" },
  { keys: ["G", "D"], ar: "اللوحة التنفيذية", en: "Dashboard", group: "ar:تنقّل,en:Navigation" },
  { keys: ["G", "C"], ar: "الشركات", en: "Companies", group: "ar:تنقّل,en:Navigation" },
  { keys: ["G", "H"], ar: "الفنادق", en: "Hotels", group: "ar:تنقّل,en:Navigation" },
  { keys: ["G", "M"], ar: "الأسواق", en: "Markets", group: "ar:تنقّل,en:Navigation" },
  { keys: ["G", "I"], ar: "الإشارات", en: "Insights", group: "ar:تنقّل,en:Navigation" },
  { keys: ["G", "T"], ar: "المهام", en: "Tasks", group: "ar:تنقّل,en:Navigation" },
  { keys: ["G", "S"], ar: "الإعدادات", en: "Settings", icon: Settings, group: "ar:تنقّل,en:Navigation" },
  { keys: ["⌘/Ctrl", "N"], ar: "إنشاء جديد", en: "Create new", icon: ListChecks, group: "ar:إجراءات,en:Actions" },
  { keys: ["⌘/Ctrl", "B"], ar: "طي الشريط الجانبي", en: "Toggle sidebar", group: "ar:إجراءات,en:Actions" },
  { keys: ["⌘/Ctrl", "L"], ar: "تبديل اللغة", en: "Toggle language", icon: Globe, group: "ar:إجراءات,en:Actions" },
  { keys: ["⌘/Ctrl", "."], ar: "تبديل السمة", en: "Toggle theme", icon: Palette, group: "ar:إجراءات,en:Actions" },
];

export function KeyboardShortcuts({ locale = "en" }: { locale?: "ar" | "en" }) {
  const [open, setOpen] = useState(false);
  const ar = locale === "ar";

  // Open on "?" press
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in inputs/textareas
      const target = e.target as HTMLElement;
      const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (e.key === "?" && !inField && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Group shortcuts
  const grouped = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    const lbl = ar ? s.group.split(",")[0].slice(3) : s.group.split(",")[1].slice(3);
    if (!acc[lbl]) acc[lbl] = [];
    acc[lbl].push(s);
    return acc;
  }, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold transition hover:bg-[var(--brand-soft)] md:inline-flex"
        style={{ color: "var(--text-muted)" }}
        title={ar ? "اختصارات لوحة المفاتيح (?)" : "Keyboard shortcuts (?)"}
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="h-3.5 w-3.5" />
        <kbd className="rounded px-1 font-mono"
             style={{ background: "color-mix(in srgb, var(--text-muted) 16%, transparent)" }}>
          ?
        </kbd>
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 anim-fade-in"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="absolute inset-0"
          style={{ background: "color-mix(in srgb, var(--text) 50%, transparent)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        />
        <div
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl shadow-glow anim-rise-glow"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-3.5"
               style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                <Keyboard className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[14px] font-extrabold" style={{ color: "var(--text)" }}>
                  {ar ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts"}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {ar ? "تنقّل أسرع، إنجاز أكثر" : "Navigate faster, do more"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 transition hover:bg-[var(--brand-soft)]"
              aria-label="close"
            >
              <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
            {Object.entries(grouped).map(([groupName, shortcuts]) => (
              <div key={groupName}>
                <div
                  className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {groupName}
                </div>
                <ul className="space-y-1">
                  {shortcuts.map((s, i) => (
                    <li
                      key={`${groupName}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--brand-soft)]"
                    >
                      <span className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--text)" }}>
                        {s.icon ? <s.icon className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} /> : null}
                        {ar ? s.ar : s.en}
                      </span>
                      <span className="flex items-center gap-1">
                        {s.keys.map((k, ki) => (
                          <span key={ki} className="flex items-center gap-1">
                            <kbd
                              className="rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                              style={{
                                background: "var(--surface)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                                boxShadow: "0 1px 0 var(--border)",
                              }}
                            >
                              {k}
                            </kbd>
                            {ki < s.keys.length - 1 ? (
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+</span>
                            ) : null}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="flex items-center justify-between gap-3 px-5 py-3 text-[11px]"
            style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span>
              {ar ? "اضغط " : "Press "}
              <kbd className="rounded bg-[var(--brand-soft)] px-1 font-mono" style={{ color: "var(--brand-deep)" }}>?</kbd>
              {ar ? " في أي وقت لإظهار هذه القائمة" : " anytime to show this list"}
            </span>
            <span>
              <kbd className="rounded bg-[var(--brand-soft)] px-1 font-mono" style={{ color: "var(--brand-deep)" }}>Esc</kbd>
              {ar ? " للإغلاق" : " to close"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
