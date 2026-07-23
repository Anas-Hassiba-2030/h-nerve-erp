export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
          style={{ background: "var(--surface)" }}>
      {/* Animated gradient backdrop */}
      <div
        className="absolute inset-0 anim-grad"
        style={{
          background:
            "linear-gradient(125deg, var(--brand-deep) 0%, var(--brand) 30%, var(--accent) 60%, var(--brand-deep) 100%)",
          opacity: 0.95,
        }}
      />
      {/* Mesh blobs */}
      <div className="glow-blob" style={{ width: 480, height: 480, background: "var(--accent)", top: "-15%", insetInlineEnd: "-10%" }} />
      <div className="glow-blob" style={{ width: 520, height: 520, background: "var(--brand)", bottom: "-20%", insetInlineStart: "-10%", animationDelay: "-5s" }} />
      <div className="glow-blob" style={{ width: 360, height: 360, background: "white", top: "30%", insetInlineStart: "40%", opacity: 0.18, animationDelay: "-9s" }} />

      {/* Constellation dots */}
      {[...Array(28)].map((_, i) => (
        <span
          key={i}
          className="constellation-dot anim-fade-in"
          style={{
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            opacity: 0.35 + ((i * 13) % 50) / 100,
            animationDelay: `${(i * 0.07).toFixed(2)}s`,
          }}
        />
      ))}

      {/* Subtle radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgb(255 255 255 / 0.18) 0%, transparent 70%)",
        }}
      />

      {/* No layout-level theme/locale pills here: the login page (LoginCosmos)
          renders its own designed toggles in the same corner — a second set
          from the layout stacked on top of them (the "two buttons above each
          other" bug). Auth pages own their corner chrome. */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}
