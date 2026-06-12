// Chart-shaped placeholder. Default 220px tall to match the most common
// dashboard chart rhythm. Renders a faint baseline + gradient fill so the
// shape reads as "chart" even before data lands.
export function ChartSkeleton({
  height = 220,
  title = true,
  legend = true,
}: {
  height?: number;
  title?: boolean;
  legend?: boolean;
}) {
  return (
    <div className="card card-pad space-y-3" aria-busy="true" aria-label="Loading chart">
      {title ? (
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="skel skel-text" style={{ width: 180 }} />
            <div className="skel skel-line-sm" style={{ width: 120 }} />
          </div>
          {legend ? (
            <div className="flex items-center gap-2">
              <div className="skel skel-pill" style={{ width: 60 }} />
              <div className="skel skel-pill" style={{ width: 60 }} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="relative" style={{ height }}>
        {/* Baseline grid */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background:
              "repeating-linear-gradient(to top, color-mix(in srgb, var(--border) 50%, transparent) 0 1px, transparent 1px 25%)",
          }}
        />
        {/* Soft gradient fill suggesting an area chart */}
        <div
          className="skel absolute inset-x-0 bottom-0 rounded-lg"
          style={{
            height: "62%",
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
