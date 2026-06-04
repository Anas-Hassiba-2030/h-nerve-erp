"use client";

import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { THEME_LIST, type ThemeId, type ThemeDef } from "@/lib/theme/theme";
import { setTheme } from "@/app/actions/preferences";
import type { Locale } from "@/lib/i18n/i18n";

export function ThemeSwitch({
  current,
  locale,
}: {
  current: ThemeId;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const ar = locale === "ar";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost btn-sm gap-1.5"
        aria-haspopup="true"
        aria-expanded={open}
        title={ar ? "تغيير السمة" : "Change theme"}
      >
        <Palette className="h-3.5 w-3.5" />
        <span className="font-bold">{ar ? "السمة" : "Theme"}</span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute end-0 z-50 mt-2 w-72 anim-fade-up rounded-2xl border bg-[var(--surface-elevated)] p-2 shadow-glow"
               style={{ borderColor: "var(--border)" }}>
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                 style={{ color: "var(--text-muted)" }}>
              {ar ? "اختر السمة" : "Choose theme"}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {THEME_LIST.map((t) => (
                <ThemeOption
                  key={t.id}
                  theme={t}
                  active={t.id === current}
                  ar={ar}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ThemeOption({
  theme,
  active,
  ar,
}: {
  theme: ThemeDef;
  active: boolean;
  ar: boolean;
}) {
  return (
    <form action={setTheme}>
      <input type="hidden" name="theme" value={theme.id} />
      <button
        type="submit"
        className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition ${
          active ? "ring-2" : "hover:bg-[var(--brand-soft)]"
        }`}
        style={active ? { borderColor: "var(--brand)" } : undefined}
      >
        {/* swatch */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1"
          style={{
            background: `linear-gradient(135deg, ${theme.brandDeep} 0%, ${theme.brand} 60%, ${theme.accent} 110%)`,
            ["--tw-ring-color" as any]: theme.border,
          }}
        >
          {active ? <Check className="h-4 w-4 text-white" /> : null}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
            {ar ? theme.name : theme.nameEn}
          </div>
          <div className="line-clamp-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {ar ? theme.description : theme.descriptionEn}
          </div>
        </div>
      </button>
    </form>
  );
}
