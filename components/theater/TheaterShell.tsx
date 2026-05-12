"use client";

// TheaterShell — the fullscreen frame around the 5-act spread.
//
// Top rail shows act counter + topic + close button. ESC also closes.
// On scroll, the active act counter updates via IntersectionObserver.
//
// Phase 9 of docs/PHASES-INTELLIGENCE.md.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const ROMAN = ["I", "II", "III", "IV", "V"];

export function TheaterShell({
  topic,
  ar,
  exitHref,
  actTitles,
  children,
}: {
  topic: string;
  ar: boolean;
  exitHref: string;
  actTitles: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeAct, setActiveAct] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ESC to exit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push(exitHref);
      } else if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        const target = document.querySelector(`[data-act="${Math.min(4, activeAct + 1)}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        const target = document.querySelector(`[data-act="${Math.max(0, activeAct - 1)}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, exitHref, activeAct]);

  // Track which act is in view
  useEffect(() => {
    const acts = document.querySelectorAll("[data-act]");
    if (acts.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.4) {
            const idx = Number((e.target as HTMLElement).dataset.act);
            if (Number.isFinite(idx)) setActiveAct(idx);
          }
        }
      },
      { threshold: [0.4, 0.6, 0.8] }
    );
    acts.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="theater-root">
      {/* Top fixed rail */}
      <header className="theater-rail">
        <div className="theater-rail-inner">
          <div className="theater-act-meta">
            <span className="theater-roman">{ROMAN[activeAct] ?? "I"}.</span>
            <span className="theater-act-name">{actTitles[activeAct] ?? actTitles[0]}</span>
            <span className="theater-act-progress">
              {activeAct + 1} / {actTitles.length}
            </span>
          </div>
          <div className="theater-topic" title={topic}>
            {topic}
          </div>
          <Link href={exitHref} className="theater-close" aria-label="Close theater (ESC)">
            <span className="theater-close-label">{ar ? "خروج" : "EXIT"}</span>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="theater-close-key">ESC</span>
          </Link>
        </div>
        <div className="theater-rail-progress">
          <span
            className="theater-rail-progress-fill"
            style={{
              width: `${((activeAct + 1) / actTitles.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <main className="theater-stage">{children}</main>
    </div>
  );
}
