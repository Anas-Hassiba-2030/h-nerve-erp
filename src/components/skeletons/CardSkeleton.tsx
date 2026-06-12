// Card-shaped placeholder. Mirrors the .card primitive so loading.tsx pages
// don't shift layout when real content arrives.
export function CardSkeleton({
  lines = 3,
  showHeader = true,
  height,
  className = "",
}: {
  lines?: number;
  showHeader?: boolean;
  // If set, the body collapses into a single block of this height (px) — handy
  // for chart-shaped placeholders inside cards.
  height?: number;
  className?: string;
}) {
  return (
    <div className={`card card-pad space-y-3 ${className}`}>
      {showHeader ? (
        <div className="flex items-center justify-between">
          <div className="skel skel-text" style={{ width: "32%" }} />
          <div className="skel skel-pill" style={{ width: 56 }} />
        </div>
      ) : null}
      {height ? (
        <div className="skel" style={{ height }} />
      ) : (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="skel skel-line"
              style={{ width: `${100 - i * 10}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
