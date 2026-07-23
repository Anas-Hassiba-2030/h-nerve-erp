"use client";

import { useEffect, useState } from "react";
import {
  X, Sparkles, Pin, Activity, FileText, Search, Bell, Plus,
  Layers, Wand2, ArrowRight, ArrowLeft,
} from "lucide-react";

const STORAGE_KEY = "h_nerve_welcome_v1.4_seen";

// First-visit welcome splash — celebrates the latest set of premium features.
// Auto-shows on first authenticated dashboard load, then never again unless
// the user clears localStorage. Has 4 animated slides with a progress dot row.

type Slide = {
  iconBg: string;
  iconFg: string;
  Icon: any;
  emoji: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  bullets_ar: string[];
  bullets_en: string[];
};

const SLIDES: Slide[] = [
  {
    iconBg: "from-emerald-500 to-emerald-700",
    iconFg: "white",
    Icon: Sparkles,
    emoji: "✨",
    title_ar: "أهلاً في H-Nerve المُحدّث",
    title_en: "Welcome to the upgraded H-Nerve",
    body_ar:
      "النظام العصبي للحوراني صار أذكى وأسرع وأكثر أناقة. خلّينا نوريك أهم 4 ميزات جديدة.",
    body_en:
      "Your central nervous system just got sharper, faster, and more elegant. Let us walk you through the four headline upgrades.",
    bullets_ar: ["تجربة احترافية بمعايير عالمية", "نقلة في السرعة والاستجابة", "أنيميشن مدروس في كل ركن"],
    bullets_en: ["World-class executive UX", "Snappier and more responsive", "Thoughtful animation everywhere"],
  },
  {
    iconBg: "from-violet-500 to-violet-700",
    iconFg: "white",
    Icon: FileText,
    emoji: "📊",
    title_ar: "تقارير تنفيذية احترافية",
    title_en: "Investor-grade reports",
    body_ar:
      "كل تصدير صار يحمل KPIs، رسوم اتجاه، وتعليق محلل تلقائي — جاهز للقيادة بضغطة زر.",
    body_en:
      "Every export now ships with KPI cards, trend chart, distribution breakdown, and an auto-analyst note — leadership-ready in one click.",
    bullets_ar: [
      "تقرير شامل للمجموعة من الداشبورد",
      "PDF عبر الطباعة + CSV لـ Excel",
      "ختم رسمي لمجموعة الحوراني",
    ],
    bullets_en: [
      "Whole-group combined report from the dashboard",
      "Print-to-PDF + Excel CSV per module",
      "Official Hourani Group watermark",
    ],
  },
  {
    iconBg: "from-amber-500 to-amber-700",
    iconFg: "white",
    Icon: Pin,
    emoji: "📌",
    title_ar: "مفضلة، بحث شامل، وسجل نشاط",
    title_en: "Pins, search, audit log",
    body_ar:
      "ثبّت أي شركة، فندق، أو مشروع للوصول السريع. ابحث في 14 جدول دفعة واحدة. تتبع كل عملية في النظام.",
    body_en:
      "Pin any company, hotel, or project for instant access. Search across 14 tables at once. Track every action in the audit log.",
    bullets_ar: ["البحث الشامل بـ ⌘K", "السجل الزمني الكامل في /activity", "صفحة /pinned للوصول السريع"],
    bullets_en: ["Global search via ⌘K", "Full audit trail at /activity", "/pinned page for quick access"],
  },
  {
    iconBg: "from-blue-500 to-blue-700",
    iconFg: "white",
    Icon: Wand2,
    emoji: "⚡",
    title_ar: "إنشاء سريع + إشعارات ذكية",
    title_en: "Quick-add + smart notifications",
    body_ar:
      "اضغط ⌘N أو الزر الأخضر العائم لإنشاء أي شيء فوراً. الجرس العلوي صار 3 تابات: إشارات، نشاط، مهام.",
    body_en:
      "Press ⌘N or the floating green button to create anything in seconds. The bell now has 3 tabs: insights, activity, tasks due.",
    bullets_ar: ["10 اختصارات إنشاء سريعة", "بادج أحمر للمهام المتأخرة", "تنبيه فوري عبر تيار النشاط"],
    bullets_en: ["10 quick-create shortcuts", "Red badge for overdue tasks", "Live updates via activity stream"],
  },
];

export function WelcomeSplash({ locale }: { locale: "ar" | "en" }) {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const ar = locale === "ar";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NEXT_PUBLIC_DISABLE_INTRO === "1") return; // pitch/demo machine
    const seen = window.localStorage.getItem(STORAGE_KEY);
    // Defer to OnboardingTour for true first-time users — only show this
    // splash to returning users who haven't yet seen the v1.4 update.
    const hasOnboarded = window.localStorage.getItem("h_nerve_onboarded_v1");
    if (!seen && hasOnboarded) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function close() {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }

  // ESC always closes — a blocking modal with no keyboard escape is a trap.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function next() {
    if (slide < SLIDES.length - 1) {
      setSlide(slide + 1);
    } else {
      close();
    }
  }

  function prev() {
    if (slide > 0) setSlide(slide - 1);
  }

  if (!open) return null;

  const s = SLIDES[slide];
  const Icon = s.Icon;
  const isLast = slide === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={ar ? "أهلاً بك" : "Welcome"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 hn-anim-fade"
        style={{ background: "rgba(8, 24, 21, 0.65)", backdropFilter: "blur(8px)" }}
        onClick={close}
      />

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl shadow-glow hn-anim-zoom-bounce"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Hero */}
        <div
          className={`relative h-44 overflow-hidden bg-gradient-to-br ${s.iconBg}`}
        >
          {/* Aurora orbs */}
          {[
            { x: "10%", y: "20%", size: 180, delay: "0s" },
            { x: "75%", y: "60%", size: 220, delay: "-5s" },
            { x: "50%", y: "10%", size: 140, delay: "-2s" },
          ].map((o, i) => (
            <span
              key={i}
              className="absolute hn-anim-aurora pointer-events-none"
              style={{
                top: o.y,
                left: o.x,
                width: o.size,
                height: o.size,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 65%)",
                animationDelay: o.delay,
              }}
              aria-hidden
            />
          ))}

          {/* Sparkles */}
          {[
            { top: "18%", left: "18%", size: 6 },
            { top: "60%", left: "70%", size: 4 },
            { top: "30%", left: "60%", size: 7 },
            { top: "75%", left: "32%", size: 5 },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute hn-anim-sparkle pointer-events-none"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                background: "white",
                boxShadow: `0 0 ${p.size * 2}px rgba(255,255,255,0.95)`,
                animationDelay: `${i * 0.4}s`,
              }}
              aria-hidden
            />
          ))}

          {/* Centered icon */}
          <div className="relative z-10 flex h-full items-center justify-center">
            <div className="relative">
              <span
                className="absolute -inset-3 rounded-3xl hn-anim-pulse-ring"
                aria-hidden
              />
              <div
                className="hn-anim-zoom-bounce flex h-20 w-20 items-center justify-center rounded-3xl text-5xl ring-2 hn-theme-chip"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  borderColor: "rgba(255,255,255,0.45)",
                  boxShadow: "0 12px 28px -8px rgba(0,0,0,0.35)",
                }}
              >
                <span className="hn-anim-bob">{s.emoji}</span>
              </div>
            </div>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 hover:bg-white/20"
            style={{ color: "white" }}
            aria-label={ar ? "إغلاق" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Slide pill */}
          <div
            className="absolute start-4 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[0.2em]"
            style={{
              background: "rgba(0,0,0,0.32)",
              color: "white",
              backdropFilter: "blur(4px)",
            }}
          >
            <Icon className="h-3 w-3" />
            {slide + 1} / {SLIDES.length}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-6">
          <h2
            key={`t-${slide}`}
            className="text-xl font-black leading-tight hn-anim-rise"
            style={{ color: "var(--text)" }}
          >
            {ar ? s.title_ar : s.title_en}
          </h2>
          <p
            key={`b-${slide}`}
            className="text-[13px] font-bold leading-relaxed hn-anim-rise"
            style={{ color: "var(--text-muted)", animationDelay: "0.06s" }}
          >
            {ar ? s.body_ar : s.body_en}
          </p>

          {/* Bullets */}
          <ul className="hn-stagger space-y-1.5 pt-1">
            {(ar ? s.bullets_ar : s.bullets_en).map((b, i) => (
              <li
                key={`${slide}-${i}`}
                className="flex items-center gap-2 text-[12.5px] font-bold hn-anim-slide-r"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
                  }}
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 px-6 py-3"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--brand-soft)",
          }}
        >
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === slide ? 24 : 6,
                  background:
                    i === slide
                      ? "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)"
                      : "var(--border)",
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {slide > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="btn-ghost btn-sm"
              >
                {ar ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
                {ar ? "السابق" : "Back"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="btn-primary btn-sm hn-hover-shine"
            >
              {isLast
                ? ar
                  ? "ابدأ الاستكشاف"
                  : "Start exploring"
                : ar
                ? "التالي"
                : "Next"}
              {!isLast ? (
                ar ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Skip link */}
        <div className="px-6 pb-3 text-center">
          <button
            type="button"
            onClick={close}
            className="text-[12px] font-bold underline-offset-2 hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            {ar ? "تخطّي الجولة" : "Skip the tour"}
          </button>
        </div>
      </div>
    </div>
  );
}
