// app/dev/Manifesto.tsx
//
// The 1-line typed manifesto. Per spec: 60wpm typing speed (~80ms/char,
// ~85 chars in 6.8 seconds). After the line completes, a single ochre
// dot punctuates and the reveal stops — no further animation.
//
// Phase 20 of docs/PHASES-INTELLIGENCE.md.

"use client";

import { useEffect, useRef, useState } from "react";

export function Manifesto({ line }: { line: string }) {
  const [shown, setShown] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced.current) {
      setShown(line.length);
      return;
    }
    let i = 0;
    function tick() {
      i++;
      setShown(i);
      if (i < line.length) {
        // 60wpm = ~80ms per character. We add a small jitter so it
        // doesn't feel mechanical; longer pause after a period for
        // sentence rhythm.
        const c = line[i - 1];
        const base = 70;
        const jitter = Math.random() * 30;
        const punct = c === "." ? 240 : c === "," ? 120 : 0;
        window.setTimeout(tick, base + jitter + punct);
      }
    }
    const id = window.setTimeout(tick, 320);
    return () => window.clearTimeout(id);
  }, [line]);

  const visible = line.slice(0, shown);
  const done = shown >= line.length;
  return (
    <h1 className="dev-manifesto" aria-label={line}>
      <span className="dev-manifesto-text">{visible}</span>
      <span className={`dev-manifesto-caret ${done ? "is-done" : ""}`} aria-hidden />
    </h1>
  );
}
