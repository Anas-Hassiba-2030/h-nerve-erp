"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Sparkles, Building2, Keyboard,
  Brain, Trophy, Activity,
} from "lucide-react";

const STORAGE_KEY = "h_nerve_onboarded_v1";

type Step = {
  icon: any;
  ar: { title: string; body: string };
  en: { title: string; body: string };
};

const STEPS: Step[] = [
  {
    icon: Activity,
    ar: {
      title: "أهلاً بك في H‑Nerve ERP",
      body: "العقل المركزي الرقمي لمجموعة الحوراني. كل وحدة (الفنادق، الألبان، الزراعة، التعليم) موصولة بالنظام العصبي عبر AI تنبؤي.",
    },
    en: {
      title: "Welcome to H‑Nerve ERP",
      body: "The digital nervous system for Hourani Group — hotels, dairy, agriculture, education, all wired together via predictive AI.",
    },
  },
  {
    icon: Sparkles,
    ar: {
      title: "اللوحة التنفيذية",
      body: "صفحة واحدة تختصر حالة المجموعة كاملة: 5 شركات بشريط واحد، تنبيهات حرجة، تيار النشاط، والنبض المالي.",
    },
    en: {
      title: "Executive Dashboard",
      body: "One screen, the entire group: a 5-company strip, critical alerts, activity stream, and financial pulse.",
    },
  },
  {
    icon: Brain,
    ar: {
      title: "جسر AI لسلسلة التوريد",
      body: "كل حجز فندقي يولّد تنبؤاً لطلب الألبان والخضروات. اضغط «تشغيل المحرك» في صفحة سلسلة التوريد لتجربتها.",
    },
    en: {
      title: "AI Supply Chain Bridge",
      body: "Every hotel booking generates a forecast for dairy and produce demand. Hit 'Run engine' on the Supply Chain page to try it.",
    },
  },
  {
    icon: Keyboard,
    ar: {
      title: "الاختصارات",
      body: "اضغط ⌘K للبحث السريع عبر الوحدات، و«؟» لرؤية كل الاختصارات. الواجهة مبنية للكفاءة.",
    },
    en: {
      title: "Shortcuts",
      body: "Press ⌘K for quick search across modules, and '?' to see all shortcuts. The UI is built for speed.",
    },
  },
  {
    icon: Trophy,
    ar: {
      title: "نظام الرتب",
      body: "كل تسجيل دخول، كل مهمة منجزة، تكسبك XP. ارتقِ من بيدق ♟ إلى ملك ♚ — وكل رتبة تفتح بونصاً أكبر.",
    },
    en: {
      title: "Chess Ranks",
      body: "Every login and completed task earns XP. Rise from Pawn ♟ to King ♚ — each rank unlocks a bigger bonus.",
    },
  },
];

export function OnboardingTour({ locale = "en" }: { locale?: "ar" | "en" }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const ar = locale === "ar";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NEXT_PUBLIC_DISABLE_INTRO === "1") return; // pitch/demo machine
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen) return;
    // Never stack under the Morning Brief: two simultaneous full-screen
    // modals mean the user dismisses one dark overlay only to hit another —
    // in live use that chain read as "the app froze". Wait until the brief's
    // overlay leaves the DOM, then open the tour.
    if (!document.querySelector(".mb-overlay.show")) {
      setOpen(true);
      return;
    }
    const poll = window.setInterval(() => {
      if (!document.querySelector(".mb-overlay.show")) {
        window.clearInterval(poll);
        setOpen(true);
      }
    }, 400);
    return () => window.clearInterval(poll);
  }, []);

  // ESC always skips — a blocking modal with no keyboard escape is a trap.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
      // A user who just finished (or skipped) THIS tour has seen the current
      // product — never chase them with the "what's new in v1.4" splash on the
      // very next navigation. That serial modal ambush (brief → tour → splash)
      // read as "the system froze" in live use. The splash stays reserved for
      // users onboarded BEFORE v1.4 shipped.
      window.localStorage.setItem("h_nerve_welcome_v1.4_seen", "1");
    } catch {}
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  }
  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  if (!open) return null;

  const cur = STEPS[step];
  const Icon = cur.icon;
  const t = ar ? cur.ar : cur.en;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 anim-fade-in"
        style={{ background: "color-mix(in srgb, var(--text) 65%, transparent)", backdropFilter: "blur(8px)" }}
        onClick={close}
      />

      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-glow anim-rise-glow"
        style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
      >
        {/* Hero gradient strip */}
        <div
          className="relative h-32 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 60%, var(--accent) 130%)",
          }}
        >
          <div className="absolute inset-0 opacity-25">
            <svg width="100%" height="100%" viewBox="0 0 600 140" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="ob-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth=".5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ob-grid)" />
              {[...Array(10)].map((_, i) => (
                <circle key={i} cx={(i * 73) % 600} cy={(i * 31) % 140} r="2.5" fill="white" opacity="0.6" />
              ))}
            </svg>
          </div>

          {/* Skip button */}
          <button
            onClick={close}
            className="absolute end-3 top-3 z-10 rounded-md bg-white/15 p-1.5 text-white transition hover:bg-white/25 backdrop-blur"
            aria-label="Skip"
            title={ar ? "تخطي" : "Skip"}
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Centered icon */}
          <div className="absolute bottom-0 start-1/2 -translate-x-1/2 translate-y-1/2 rtl:translate-x-1/2">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-glow ring-4 ring-white/40"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-deep) 0%, var(--accent) 110%)",
              }}
            >
              <Icon className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-12 text-center">
          <h2 className="text-[18px] font-black" style={{ color: "var(--text)" }}>
            {t.title}
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {t.body}
          </p>

          {/* Step indicator */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? 24 : 8,
                  background: i === step ? "var(--brand)" : "color-mix(in srgb, var(--text-muted) 25%, transparent)",
                }}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              onClick={prev}
              disabled={step === 0}
              className="btn-ghost btn-sm disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5 rtl:hidden" />
              <ChevronLeft className="h-3.5 w-3.5 hidden rtl:block" />
              {ar ? "السابق" : "Back"}
            </button>

            <button onClick={close} className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {ar ? "تخطي الجولة" : "Skip tour"}
            </button>

            <button onClick={next} className="btn-primary btn-sm">
              {step < STEPS.length - 1 ? (ar ? "التالي" : "Next") : (ar ? "ابدأ" : "Get started")}
              <ChevronLeft className="h-3.5 w-3.5 rtl:hidden" />
              <ChevronRight className="h-3.5 w-3.5 hidden rtl:block" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
