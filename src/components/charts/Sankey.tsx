// Sankey-style flow diagram — pure SVG, no external libs.
// Used to visualize cross-company supply chain: source companies (left)
// → product categories (middle) → target companies (right). Bands' widths
// are proportional to the flow value (forecast demand).

export type SankeyNode = {
  id: string;
  label: string;
  color?: string;
  // Which column the node sits in (0..N-1). Renderer assumes 3 columns by default.
  column: number;
};

export type SankeyLink = {
  source: string; // node id
  target: string; // node id
  value: number;
  label?: string;
};

export function Sankey({
  nodes,
  links,
  width = 720,
  height = 320,
  formatValue,
}: {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (nodes.length === 0 || links.length === 0) {
    return <div className="text-sm" style={{ color: "var(--text-muted)" }}>—</div>;
  }
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));

  // Group nodes by column
  const cols = new Map<number, SankeyNode[]>();
  for (const n of nodes) {
    const arr = cols.get(n.column) ?? [];
    arr.push(n);
    cols.set(n.column, arr);
  }
  const sortedColumns = [...cols.keys()].sort((a, b) => a - b);

  // Compute column total values to allocate height
  const colTotals = new Map<number, number>();
  for (const col of sortedColumns) {
    let total = 0;
    for (const n of cols.get(col)!) {
      const out = links.filter((l) => l.source === n.id).reduce((a, l) => a + l.value, 0);
      const inc = links.filter((l) => l.target === n.id).reduce((a, l) => a + l.value, 0);
      total += Math.max(out, inc);
    }
    colTotals.set(col, total);
  }
  const grandTotal = Math.max(0.0001, ...colTotals.values());

  // Wide horizontal padding so source/target labels (company names) have room
  // to render alongside the bars without getting clipped at the edges.
  const padding = { top: 32, right: 160, bottom: 24, left: 160 };
  const inner = { w: width - padding.left - padding.right, h: height - padding.top - padding.bottom };
  const colCount = sortedColumns.length;
  const colSpacing = inner.w / Math.max(1, colCount - 1);
  const nodeWidth = 16;
  const verticalGap = 10;
  // Column header titles — first/last/middle column gets a label above
  const COL_HEADER: Record<number, string> = {
    0: "SOURCE",
    1: "CATEGORY",
    2: "TARGET",
  };

  // Position each node: x by column, y stacked within column proportional to flow
  type PositionedNode = SankeyNode & { x: number; y: number; height: number };
  const positioned = new Map<string, PositionedNode>();

  for (const col of sortedColumns) {
    const colIndex = sortedColumns.indexOf(col);
    const x = padding.left + colIndex * colSpacing - nodeWidth / 2;
    const colNodes = cols.get(col)!;
    // Compute total flow for this column
    const colNodeFlows = colNodes.map((n) => {
      const out = links.filter((l) => l.source === n.id).reduce((a, l) => a + l.value, 0);
      const inc = links.filter((l) => l.target === n.id).reduce((a, l) => a + l.value, 0);
      return { node: n, flow: Math.max(out, inc) };
    });
    const totalFlow = colNodeFlows.reduce((a, n) => a + n.flow, 0) || 1;
    const totalGap = (colNodes.length - 1) * verticalGap;
    const availH = inner.h - totalGap;

    let y = padding.top;
    for (const { node, flow } of colNodeFlows) {
      const h = Math.max(20, (flow / totalFlow) * availH);
      positioned.set(node.id, { ...node, x: Math.max(0, x), y, height: h });
      y += h + verticalGap;
    }
  }

  // Build link paths
  type RenderedLink = SankeyLink & {
    path: string;
    fromX: number; fromY: number; toX: number; toY: number;
    thickness: number;
    color: string;
  };
  const rendered: RenderedLink[] = [];
  // Track running offset within each node
  const sourceOffset = new Map<string, number>();
  const targetOffset = new Map<string, number>();
  // Sort links so largest are drawn first (so smaller appear on top)
  const sortedLinks = [...links].sort((a, b) => b.value - a.value);

  for (const link of sortedLinks) {
    const s = positioned.get(link.source);
    const t = positioned.get(link.target);
    if (!s || !t) continue;
    const sFlow = links.filter((l) => l.source === link.source).reduce((a, l) => a + l.value, 0) || 1;
    const tFlow = links.filter((l) => l.target === link.target).reduce((a, l) => a + l.value, 0) || 1;
    const thicknessFromSource = (link.value / sFlow) * s.height;
    const thicknessFromTarget = (link.value / tFlow) * t.height;
    const thickness = Math.max(2, Math.min(thicknessFromSource, thicknessFromTarget));

    const sOff = sourceOffset.get(link.source) ?? 0;
    const tOff = targetOffset.get(link.target) ?? 0;

    const fromX = s.x + nodeWidth;
    const fromY = s.y + sOff + thickness / 2;
    const toX = t.x;
    const toY = t.y + tOff + thickness / 2;

    sourceOffset.set(link.source, sOff + thickness);
    targetOffset.set(link.target, tOff + thickness);

    // Cubic bezier — control points at midX
    const midX = (fromX + toX) / 2;
    const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

    rendered.push({
      ...link,
      path,
      fromX, fromY, toX, toY,
      thickness,
      color: s.color ?? "var(--brand)",
    });
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ minWidth: 720 }}
        role="img"
        aria-label="Supply chain flow"
      >
        <defs>
          {nodes.map((n) => (
            <linearGradient key={`grad-${n.id}`} id={`sankey-grad-${n.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={n.color ?? "var(--brand)"} stopOpacity="0.55" />
              <stop offset="100%" stopColor={n.color ?? "var(--brand)"} stopOpacity="0.18" />
            </linearGradient>
          ))}
        </defs>

        {/* Column headers */}
        {sortedColumns.map((col) => {
          const colIndex = sortedColumns.indexOf(col);
          const x = padding.left + colIndex * colSpacing;
          const label = COL_HEADER[col];
          if (!label) return null;
          return (
            <text
              key={`hdr-${col}`}
              x={x}
              y={20}
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fill="var(--text-muted)"
              letterSpacing="2"
            >
              {label}
            </text>
          );
        })}

        {/* Links */}
        {rendered.map((link, i) => {
          const sourceNode = positioned.get(link.source)!;
          return (
            <g key={`link-${i}`}>
              <path
                d={link.path}
                stroke={`url(#sankey-grad-${link.source})`}
                strokeWidth={link.thickness}
                fill="none"
                strokeOpacity="0.9"
                style={{
                  opacity: 0,
                  animation: "fade-in .8s ease forwards",
                  animationDelay: `${0.3 + i * 0.05}s`,
                }}
              >
                <title>{link.label ?? `${sourceNode.label}: ${fmt(link.value)}`}</title>
              </path>
            </g>
          );
        })}

        {/* Nodes */}
        {[...positioned.values()].map((n, i) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={nodeWidth}
              height={n.height}
              rx="3"
              fill={n.color ?? "var(--brand)"}
              style={{
                transformOrigin: `${n.x + nodeWidth / 2}px ${n.y + n.height / 2}px`,
                transform: "scaleY(0)",
                animation: "sankey-grow .6s cubic-bezier(.21,.92,.32,1) forwards",
                animationDelay: `${i * 0.04}s`,
              }}
            >
              <title>{n.label}</title>
            </rect>
            <text
              x={
                n.column === sortedColumns[0]
                  ? n.x - 10
                  : n.column === sortedColumns[sortedColumns.length - 1]
                  ? n.x + nodeWidth + 10
                  : n.x + nodeWidth / 2
              }
              y={n.y + n.height / 2 + 4}
              textAnchor={
                n.column === sortedColumns[0]
                  ? "end"
                  : n.column === sortedColumns[sortedColumns.length - 1]
                  ? "start"
                  : "middle"
              }
              fontSize="12"
              fontWeight="800"
              fill="var(--text)"
              style={{
                opacity: 0,
                animation: "fade-in .4s ease forwards",
                animationDelay: `${0.6 + i * 0.04}s`,
              }}
            >
              {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
            </text>
            {/* Flow value below label — gives concrete number context */}
            <text
              x={
                n.column === sortedColumns[0]
                  ? n.x - 10
                  : n.column === sortedColumns[sortedColumns.length - 1]
                  ? n.x + nodeWidth + 10
                  : n.x + nodeWidth / 2
              }
              y={n.y + n.height / 2 + 18}
              textAnchor={
                n.column === sortedColumns[0]
                  ? "end"
                  : n.column === sortedColumns[sortedColumns.length - 1]
                  ? "start"
                  : "middle"
              }
              fontSize="9.5"
              fontWeight="700"
              fill="var(--text-muted)"
              fontFamily="Inter, monospace"
              style={{
                opacity: 0,
                animation: "fade-in .4s ease forwards",
                animationDelay: `${0.7 + i * 0.04}s`,
              }}
            >
              {(() => {
                const flow = Math.max(
                  links.filter((l) => l.source === n.id).reduce((a, l) => a + l.value, 0),
                  links.filter((l) => l.target === n.id).reduce((a, l) => a + l.value, 0),
                );
                return fmt(flow);
              })()}
            </text>
          </g>
        ))}

        <style>{`
          @keyframes sankey-grow {
            from { transform: scaleY(0); opacity: 0 }
            to { transform: scaleY(1); opacity: 1 }
          }
        `}</style>
      </svg>
    </div>
  );
}
