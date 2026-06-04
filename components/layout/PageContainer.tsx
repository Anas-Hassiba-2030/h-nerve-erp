// Wraps the body content of every page with consistent spacing, max-width,
// and a soft entrance animation. Standardizes the breathing room ERP-wide.
export function PageContainer({
  children,
  width = "default",
}: {
  children: React.ReactNode;
  width?: "default" | "wide" | "narrow";
}) {
  const max =
    width === "wide" ? "max-w-[1600px]" :
    width === "narrow" ? "max-w-3xl" :
    "max-w-[1440px]";
  return (
    <div className={`mx-auto ${max} space-y-6 px-6 py-6 md:py-8 anim-fade-up`}>
      {children}
    </div>
  );
}

// Section wrapper with optional title — used inside PageContainer for grouping.
export function PageSection({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      {title || action ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title ? (
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-muted)" }}>
                <span
                  className="inline-block h-[2px] w-7 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)",
                  }}
                />
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
