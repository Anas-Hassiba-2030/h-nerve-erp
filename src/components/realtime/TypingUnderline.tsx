// components/realtime/TypingUnderline.tsx
//
// Hairline underline in the peer's color, drawn under whatever element
// has data-rt-anchor matching the peer's typing.near. The line draws
// in over 220ms and erases when the peer stops typing.
//
// Phase 17 of docs/governance/PHASES-INTELLIGENCE.md.

"use client";

import { useEffect, useState } from "react";

export function TypingUnderline({
  anchor,
  color,
}: {
  anchor: string;
  color: string;
}) {
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );

  useEffect(() => {
    function recalc() {
      const el = document.querySelector<HTMLElement>(
        `[data-rt-anchor="${cssEscape(anchor)}"]`,
      );
      if (!el) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setBox({ left: r.left, top: r.bottom, width: r.width });
    }
    recalc();
    const id = window.setInterval(recalc, 600);
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [anchor]);

  if (!box) return null;
  return (
    <span
      className="rt-typing"
      aria-hidden
      style={{
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        background: color,
      }}
    />
  );
}

function cssEscape(s: string): string {
  return s.replace(/(["'\\])/g, "\\$1");
}
