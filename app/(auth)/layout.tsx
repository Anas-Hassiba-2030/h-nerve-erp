import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getTheme } from "@/lib/theme/theme.server";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const theme = getTheme();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
          style={{ background: "var(--surface)" }}>
      {/* Animated gradient backdrop */}
      <div
        className="absolute inset-0 anim-grad"
        style={{
          background:
            "linear-gradient(125deg, var(--brand-deep) 0%, var(--brand) 30%, var(--accent) 60%, var(--brand-deep) 100%)",
          opacity: 0.95,
        }}
      />
      {/* Mesh blobs */}
      <div className="glow-blob" style={{ width: 480, height: 480, background: "var(--accent)", top: "-15%", insetInlineEnd: "-10%" }} />
      <div className="glow-blob" style={{ width: 520, height: 520, background: "var(--brand)", bottom: "-20%", insetInlineStart: "-10%", animationDelay: "-5s" }} />
      <div className="glow-blob" style={{ width: 360, height: 360, background: "white", top: "30%", insetInlineStart: "40%", opacity: 0.18, animationDelay: "-9s" }} />

      {/* Constellation dots */}
      {[...Array(28)].map((_, i) => (
        <span
          key={i}
          className="constellation-dot anim-fade-in"
          style={{
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            opacity: 0.35 + ((i * 13) % 50) / 100,
            animationDelay: `${(i * 0.07).toFixed(2)}s`,
          }}
        />
      ))}

      {/* Subtle radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgb(255 255 255 / 0.18) 0%, transparent 70%)",
        }}
      />

      {/* Top-right controls (theme/locale) */}
      <div className="absolute end-4 top-4 z-20 flex items-center gap-2">
        <LocaleSwitch current={locale} />
        <ThemeSwitch current={theme.id} locale={locale} />
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}
