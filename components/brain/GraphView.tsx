"use client";

// GraphView — client wrapper around <GraphCanvas/> that handles the
// "selected node detail" overlay. Kept separate so the page itself can
// stay a server component (Server Actions land cleanly).

import { useState } from "react";
import { GraphCanvas, type GNode, type GEdge } from "./GraphCanvas";

export function GraphView({ nodes, edges }: { nodes: GNode[]; edges: GEdge[] }) {
  const [selected, setSelected] = useState<GNode | null>(null);

  return (
    <div className="relative">
      <GraphCanvas nodes={nodes} edges={edges} onSelectNode={setSelected} />

      {selected ? (
        <aside
          className="absolute z-20"
          style={{
            top: 56,
            insetInlineEnd: 16,
            width: 280,
            background: "rgba(14,14,16,0.94)",
            border: "1px solid rgba(245,239,230,0.14)",
            color: "rgba(245,239,230,0.92)",
            backdropFilter: "blur(6px)",
            padding: "16px 18px",
            animation:
              "heri-rise 280ms cubic-bezier(0.25,1,0.5,1) both",
          }}
        >
          <div
            style={{
              fontFamily:
                "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 9.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#c69345",
              marginBottom: 6,
            }}
          >
            {selected.kind}
          </div>
          <div
            style={{
              fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
              fontSize: 18,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              fontWeight: 500,
              color: "#fafaf7",
              marginBottom: 10,
            }}
          >
            {selected.label}
          </div>

          <ul
            className="space-y-1.5"
            style={{
              borderTop: "1px solid rgba(245,239,230,0.08)",
              paddingTop: 10,
              fontFamily:
                "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 11,
            }}
          >
            {Object.entries(selected.payload ?? {}).slice(0, 8).map(([k, v]) => (
              <li
                key={k}
                className="flex items-center justify-between gap-2"
              >
                <span style={{ color: "rgba(245,239,230,0.55)", letterSpacing: "0.06em" }}>
                  {k}
                </span>
                <span
                  style={{
                    color: "#fafaf7",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right" as const,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                    maxWidth: 160,
                  }}
                  title={String(v)}
                >
                  {formatPayloadValue(v)}
                </span>
              </li>
            ))}
          </ul>

          <div
            className="mt-4 pt-3"
            style={{
              borderTop: "1px solid rgba(245,239,230,0.08)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(245,239,230,0.45)",
              fontFamily:
                "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            }}
          >
            click again to dismiss
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function formatPayloadValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("en-US");
    return v.toFixed(3);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
