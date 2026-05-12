import { PageContainer } from "@/components/PageContainer";

// Page-level skeleton that mirrors the real PageHeader / Topbar chrome — so
// loading.tsx pages don't shift layout when the actual page mounts.
export function PageSkeleton({
  children,
  width = "default",
  withActions = true,
  withMetrics = false,
}: {
  children: React.ReactNode;
  width?: "default" | "wide" | "narrow";
  // Render two action-shaped placeholders on the right of the header.
  withActions?: boolean;
  // Render a row of metric chips under the title.
  withMetrics?: boolean;
}) {
  return (
    <>
      <header className="skel-header" aria-busy="true" aria-label="Loading">
        <div className="skel-header-stripe" />
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skel skel-eyebrow" />
              <div className="skel skel-title" style={{ width: "min(420px, 60%)" }} />
              <div className="skel skel-line" style={{ width: "min(560px, 80%)" }} />
              {withMetrics ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="skel skel-pill" style={{ width: 96 }} />
                  <div className="skel skel-pill" style={{ width: 80 }} />
                  <div className="skel skel-pill" style={{ width: 110 }} />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div
                className="skel skel-circle"
                style={{ width: 36, height: 36 }}
              />
              <div
                className="skel skel-circle"
                style={{ width: 36, height: 36 }}
              />
              <div
                className="skel skel-circle"
                style={{ width: 36, height: 36 }}
              />
            </div>
          </div>
        </div>
        {withActions ? (
          <div
            className="flex flex-wrap items-center gap-2 px-6 py-2.5"
            style={{
              borderTop: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
              background: "color-mix(in srgb, var(--brand-soft) 35%, transparent)",
            }}
          >
            <div className="skel" style={{ width: 110, height: 30, borderRadius: 8 }} />
            <div className="skel" style={{ width: 130, height: 30, borderRadius: 8 }} />
          </div>
        ) : null}
      </header>
      <PageContainer width={width}>
        <div className="skel-stagger space-y-6">{children}</div>
      </PageContainer>
    </>
  );
}
