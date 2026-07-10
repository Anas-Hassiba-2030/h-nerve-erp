// components/realtime/Cursor.tsx
//
// A peer's cursor, hairline arrow style. Position is set inline via
// pixel coords already eased by the parent's RAF loop — we don't apply
// CSS transitions here, since the parent owns the interpolation.
//
// Phase 17 of docs/governance/PHASES-INTELLIGENCE.md.

"use client";

export function Cursor({
  x,
  y,
  color,
  label,
  monogram,
  phantom,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  monogram: string;
  phantom?: boolean;
}) {
  return (
    <div
      className={`rt-cursor ${phantom ? "is-phantom" : ""}`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        ["--rt-color" as any]: color,
      } as React.CSSProperties}
      aria-hidden
    >
      {/* Hairline arrow — 14×16, two stroke triangles */}
      <svg
        className="rt-cursor-arrow"
        width="16"
        height="18"
        viewBox="0 0 16 18"
        fill="none"
      >
        <path
          d="M2 1 L2 14 L6.5 11 L9 17 L11 16 L8.5 10 L14 10 Z"
          fill={color}
          stroke="#fff"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </svg>
      <span className="rt-cursor-label">
        <span className="rt-cursor-mono" aria-hidden>
          {monogram}
        </span>
        <span>{label}</span>
      </span>
    </div>
  );
}
