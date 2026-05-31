"use client";

// Plays the arrival animation on each (app) page. If we just fell in from the
// Orrery (OrreryFrame sets sessionStorage "hn-dived" before router.push), play the
// dramatic planet-dive landing; otherwise a light settle. Styles in living.css.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function DiveReveal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dived = false;
    try {
      dived = sessionStorage.getItem("hn-dived") === "1";
      if (dived) sessionStorage.removeItem("hn-dived");
    } catch {
      /* sessionStorage unavailable — fall back to the light settle */
    }
    el.classList.remove("hn-dive", "hn-pagein");
    void el.offsetWidth; // reflow so the animation restarts on every navigation
    el.classList.add(dived ? "hn-dive" : "hn-pagein");
  }, [pathname]);

  return (
    <div ref={ref} className="hn-reveal-root">
      {children}
    </div>
  );
}
