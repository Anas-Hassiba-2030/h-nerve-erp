// HeroPanel — large branded hero block with gradient background, nerve-grid
// pattern, and three drifting nerve orbs. Stars at the top of major pages.

import React from "react";

export function HeroPanel({
  gradient,
  accent,
  children,
  className = "",
  withGrid = true,
  withOrbs = true,
  height = "auto",
}: {
  gradient: string;
  accent: string;
  children: React.ReactNode;
  className?: string;
  withGrid?: boolean;
  withOrbs?: boolean;
  height?: number | string;
}) {
  const orbs = [
    { top: "-25%", left: "-5%", size: 360, delay: "0s", colour: "rgba(255,255,255,0.55)" },
    { top: "30%", right: "-15%", size: 420, delay: "-7s", colour: `${accent}88` },
    { top: "65%", left: "30%", size: 280, delay: "-3s", colour: "rgba(255,255,255,0.4)" },
  ];
  return (
    <section
      className={`hero-panel relative overflow-hidden rounded-[24px] text-white ${className}`}
      style={{
        background: gradient,
        minHeight: typeof height === "number" ? `${height}px` : height,
        boxShadow:
          "0 22px 50px -16px color-mix(in srgb, " + accent + " 35%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.18)",
      }}
    >
      {withGrid ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(0deg, transparent 23px, rgba(255,255,255,0.08) 24px, transparent 25px), linear-gradient(90deg, transparent 23px, rgba(255,255,255,0.08) 24px, transparent 25px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse 70% 90% at 50% 50%, black 0%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 90% at 50% 50%, black 0%, transparent 80%)",
            opacity: 0.6,
          }}
          aria-hidden
        />
      ) : null}

      {withOrbs
        ? orbs.map((o, i) => (
            <span
              key={i}
              className="hn-anim-aurora pointer-events-none absolute"
              style={{
                top: o.top,
                left: o.left,
                right: o.right,
                width: o.size,
                height: o.size,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${o.colour} 0%, transparent 65%)`,
                animationDelay: o.delay,
                filter: "blur(8px)",
              }}
              aria-hidden
            />
          ))
        : null}

      {/* Subtle scanlines */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.022) 2px, rgba(255,255,255,0.022) 3px)",
        }}
        aria-hidden
      />

      <div className="relative z-10 p-6 md:p-8">{children}</div>
    </section>
  );
}
