"use client";

import { useEffect, useState } from "react";

// One-shot confetti burst — fires on mount.
// Uses pure CSS (no canvas, no deps) — small and respect reduced-motion.
export function Confetti({
  pieces = 60,
  colors = ["#0f7a5a", "#c69345", "#d4a341", "#3d7dff", "#10c879"],
}: {
  pieces?: number;
  colors?: string[];
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {Array.from({ length: pieces }).map((_, i) => {
        const color = colors[i % colors.length];
        const startX = 30 + Math.random() * 40; // 30-70% horizontal
        const drift = (Math.random() - 0.5) * 240;
        const delay = Math.random() * 0.5;
        const dur = 1.8 + Math.random() * 1.0;
        const size = 6 + Math.random() * 6;
        const rot = Math.random() * 360;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              top: "-20px",
              left: `${startX}%`,
              width: `${size}px`,
              height: `${size * 1.6}px`,
              background: color,
              transform: `rotate(${rot}deg)`,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              ["--cdx" as any]: `${drift}px`,
            }}
          />
        );
      })}
    </div>
  );
}
