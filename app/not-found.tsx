import Link from "next/link";
import {
  Home,
  Compass,
  ListChecks,
  Building2,
  Hotel,
  Brain,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { getLocale } from "@/lib/i18n/i18n.server";

// Branded 404 — full-page hero with the H-Nerve mark + breadcrumb-style
// suggestions toward common destinations. Renders outside the (app) group's
// auth wall, so unauthenticated users hitting bad URLs land here too.
export default function NotFound() {
  const locale = getLocale();
  const ar = locale === "ar";

  const suggestions = [
    {
      href: "/dashboard",
      icon: Home,
      label: ar ? "اللوحة التنفيذية" : "Executive dashboard",
      hint: ar ? "نظرة شاملة على المجموعة" : "Group-wide overview",
    },
    {
      href: "/companies",
      icon: Building2,
      label: ar ? "شركات المجموعة" : "Group companies",
      hint: ar ? "السجل الكامل للحوراني" : "Hourani registry",
    },
    {
      href: "/hotels",
      icon: Hotel,
      label: ar ? "الفنادق" : "Hotels",
      hint: ar ? "الإشغال والإيرادات" : "Occupancy & revenue",
    },
    {
      href: "/supply-chain",
      icon: Brain,
      label: ar ? "سلسلة التوريد التنبؤية" : "Predictive supply chain",
      hint: ar ? "جسر الذكاء بين الشركات" : "AI bridge between units",
    },
    {
      href: "/insights",
      icon: Sparkles,
      label: ar ? "إشارات H-Nerve" : "AI insights",
      hint: ar ? "تنبيهات وفرص النظام" : "System alerts & opportunities",
    },
    {
      href: "/tasks",
      icon: ListChecks,
      label: ar ? "المهام" : "Tasks",
      hint: ar ? "قائمتك اليومية" : "Your daily list",
    },
  ];

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: "var(--surface)" }}
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Ambient glow blobs */}
      <div
        className="glow-blob"
        style={{
          width: 400,
          height: 400,
          top: "-120px",
          insetInlineStart: "-120px",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 40%, transparent), transparent)",
        }}
      />
      <div
        className="glow-blob"
        style={{
          width: 360,
          height: 360,
          bottom: "-100px",
          insetInlineEnd: "-100px",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent)",
          animationDelay: "-6s",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={120} withSatellites />
        </div>

        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em]"
          style={{
            background: "var(--brand-soft)",
            color: "var(--brand-deep)",
            border: "1px solid color-mix(in srgb, var(--brand) 22%, transparent)",
          }}
        >
          <span className="font-mono text-sm font-black" style={{ color: "var(--accent)" }}>
            404
          </span>
          {ar ? "إشارة فقدت" : "Signal lost"}
        </div>

        <h1
          className="text-3xl font-black md:text-4xl"
          style={{ color: "var(--text)", letterSpacing: "-0.018em", lineHeight: 1.18 }}
        >
          {ar
            ? "نعتذر، لم نجد ما تبحث عنه"
            : "Page not found"}
        </h1>
        <p
          className="mx-auto mt-3 max-w-xl text-sm leading-relaxed md:text-base"
          style={{ color: "var(--text-muted)" }}
        >
          {ar
            ? "الصفحة قد تكون نُقلت أو حُذفت، أو ربما الرابط لم يكن صحيحاً. اختر وجهة من الاقتراحات أدناه أو ارجع إلى اللوحة التنفيذية."
            : "The page may have moved, been removed, or the link wasn't quite right. Pick a destination below or head back to your dashboard."}
        </p>

        {/* Primary CTAs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/dashboard" className="btn-primary">
            <Home className="h-4 w-4" />
            {ar ? "العودة للوحة" : "Back to dashboard"}
          </Link>
          <Link href="/companies" className="btn-secondary">
            <Compass className="h-4 w-4" />
            {ar ? "تصفّح الشركات" : "Browse companies"}
          </Link>
        </div>

        {/* Suggestion grid */}
        <div className="mt-10 grid gap-3 text-start sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-3 rounded-xl p-3 transition-all"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand-deep)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-bold"
                    style={{ color: "var(--text)" }}
                  >
                    {s.label}
                  </div>
                  <div
                    className="truncate text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {s.hint}
                  </div>
                </div>
                <ChevronLeft
                  className="h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100 rtl:rotate-180"
                  style={{ color: "var(--text-muted)" }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
