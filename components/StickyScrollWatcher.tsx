"use client";

import { useEffect } from "react";

// Watches window scroll and toggles `data-scrolled="true"` on the nearest
// <header> sibling. Pure side-effect component — renders nothing.
//
// Used by PageHeader to condense itself (eyebrow + subtitle + breadcrumbs
// fade out) once the user scrolls past a small threshold.
export function StickyScrollWatcher({ threshold = 24 }: { threshold?: number }) {
  useEffect(() => {
    let raf: number | null = null;
    let lastState = false;

    function update() {
      raf = null;
      const scrolled = window.scrollY > threshold;
      if (scrolled === lastState) return;
      lastState = scrolled;
      // Find every PageHeader on the screen and flip the data attribute
      const headers = document.querySelectorAll("header[data-page-header]");
      for (const h of Array.from(headers)) {
        if (scrolled) h.setAttribute("data-scrolled", "true");
        else h.removeAttribute("data-scrolled");
      }
    }

    function onScroll() {
      if (raf != null) return;
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return null;
}
