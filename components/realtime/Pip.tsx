// components/realtime/Pip.tsx
//
// 24px monogrammed avatar circle for the live-presence stack.
// Heritage Modern: cream chip, hairline ring in the user's color.

"use client";

export function Pip({
  monogram,
  name,
  role,
  color,
  phantom,
}: {
  monogram: string;
  name: string;
  role?: string;
  color: string;
  phantom?: boolean;
}) {
  const title = role ? `${name} · ${role}` : name;
  return (
    <div
      className={`rt-pip ${phantom ? "is-phantom" : ""}`}
      style={{ ["--rt-color" as any]: color } as React.CSSProperties}
      title={title}
      aria-label={title}
    >
      <span className="rt-pip-mono">{monogram}</span>
      <span aria-hidden className="rt-pip-pulse" />
    </div>
  );
}
