// Table-shaped placeholder using the same `.table-wrap` chrome as real tables
// so columns line up when data swaps in.
export function TableSkeleton({
  rows = 6,
  cols = 5,
  caption,
}: {
  rows?: number;
  cols?: number;
  // Optional shimmering caption row above the header — useful when the
  // surrounding card has its own title.
  caption?: boolean;
}) {
  // Vary widths slightly so the rows don't look mechanical
  const widths = ["72%", "44%", "60%", "38%", "82%", "50%", "66%"];

  return (
    <div
      className="table-wrap"
      aria-busy="true"
      aria-label="Loading table"
    >
      {caption ? (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="skel skel-text" style={{ width: 180 }} />
          <div className="skel skel-pill" style={{ width: 80 }} />
        </div>
      ) : null}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, c) => (
                <th key={c}>
                  <div className="skel" style={{ height: 10, width: 60 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}>
                    <div
                      className="skel skel-line"
                      style={{ width: widths[(r + c) % widths.length] }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
