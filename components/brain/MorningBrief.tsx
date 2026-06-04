"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/i18n";

// Morning Briefing card — ports Claude Design's maybeBriefing() flow from
// docs/design/system/orrery.html lines 1735-1763. Shown once per local day,
// gated by localStorage("hnerve_briefing"). Dismisses on ESC, backdrop click,
// or "ابدأ اليوم". Renders only after first-paint of /orrery, so the rest of
// the chrome (atmosphere, FAB rail) is already up.
//
// Styles: see app/(app)/living.css (.mb-overlay, .mb-card, .mb-greet, …).
type Props = {
  locale: Locale;
  userName: string;
};

const STORAGE_KEY = "hnerve_briefing";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function arabicDate(): string {
  return new Intl.DateTimeFormat("ar-JO-u-nu-arab", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function englishDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function MorningBrief({ locale, userName }: Props) {
  const ar = locale === "ar";
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY);
    } catch {}
    const key = todayKey();
    if (seen === key) return;
    // Defer a beat so the orrery atmosphere mounts first.
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, key);
      } catch {}
      setShow(true);
    }, 220);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShow(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="mb-overlay show"
      role="dialog"
      aria-modal="true"
      aria-label={ar ? "موجز الصباح" : "Morning briefing"}
      onClick={(e) => {
        if (e.target === e.currentTarget) setShow(false);
      }}
    >
      <div className="mb-card" dir={ar ? "rtl" : "ltr"}>
        <div className="mb-eyebrow">
          ◆ {ar ? "موجز الصباح" : "Morning brief"} · {ar ? arabicDate() : englishDate()}
        </div>
        <h2 className="mb-greet">
          {ar ? `صباح الخير، ${userName}` : `Good morning, ${userName}`}
        </h2>
        <p className="mb-narr">
          {ar ? (
            <>
              بينما كنتَ نائماً، واصلت <b>أرينا</b> صعودها — إشغالٌ بلغ <b>٧١٪</b> ورفع
              الإيراد إلى <b>٨٨٬٢١٠</b> دينار. نمت <b>المها</b> بنسبة <b>+٤٤٪</b>،
              لكنّ أربع دفعات ألبان (<b>١٤٬٥٠٨ لتر</b>) تقترب من الانتهاء وتستدعي
              قراراً اليوم. وحده إيراد <b>جامعة عمّان</b> تراجع <b>٦٤٪</b> — إشارةٌ
              حرجة تنتظر مراجعتك.
            </>
          ) : (
            <>
              While you slept, <b>Arena</b> climbed again — occupancy hit <b>71%</b>{" "}
              and lifted revenue to <b>JOD 88,210</b>. <b>Maha</b> grew <b>+44%</b>,
              but four dairy batches (<b>14,508 L</b>) are nearing expiry and need a
              decision today. Only <b>Amman University</b> revenue dropped{" "}
              <b>64%</b> — a critical signal awaiting your review.
            </>
          )}
        </p>
        <div className="mb-chips">
          <span className="mb-chip up">▲ {ar ? "إيراد المجموعة +١٢٪" : "Group revenue +12%"}</span>
          <span className="mb-chip up">▲ {ar ? "إشغال أرينا +٤٪" : "Arena occupancy +4%"}</span>
          <span className="mb-chip down">▼ {ar ? "إيراد الأهلية −٦٤٪" : "Ahliyya revenue −64%"}</span>
        </div>
        <div className="mb-actions">
          <a className="mb-btn ghost" href="/digest">
            {ar ? "اعرض الموجز الكامل" : "View full digest"}
          </a>
          <button type="button" className="mb-btn primary" onClick={() => setShow(false)}>
            {ar ? "ابدأ اليوم ←" : "Begin the day →"}
          </button>
        </div>
      </div>
    </div>
  );
}
