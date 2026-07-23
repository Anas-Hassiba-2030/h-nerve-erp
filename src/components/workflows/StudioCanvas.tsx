"use client";

// StudioCanvas — visual flow editor.
//
// Layout strategy: simple 3-column grid (Triggers / Conditions / Actions).
// Nodes are placed in their column at evenly-spaced rows. Edges drawn as
// luminous Bézier curves between node anchor points.
//
// Wiring: click a source node's right port to start a wire, click a
// target's left port to commit. While wiring, a ghost line follows the
// cursor.
//
// Phase 12 of docs/PHASES-INTELLIGENCE.md.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addEdge, deleteEdge, deleteNode } from "@/app/(app)/workflows/actions";
import { TOAST_EVENT, type ToastFlash } from "@/lib/utils/toast.shared";
import { Plug, GitBranch, Zap, X, Cable } from "lucide-react";

export type StudioNode = {
  id: string;
  kind: "trigger" | "condition" | "action";
  templateKey: string;
  label: string;
  labelAr: string;
  module: "DAIRY" | "HOTELS" | "FARMS" | "FINANCE" | "GROUP" | "EDUCATION" | "TIME";
  summary: string;
  column: 1 | 2 | 3;
  orderInColumn: number;
  configJson: string;
};

export type StudioEdge = { id: string; fromNodeId: string; toNodeId: string };

const NODE_W = 240;
const NODE_H = 100;
const COL_GAP = 96;
const ROW_GAP = 28;
const PAD = 56;

const KIND_ACCENT: Record<string, string> = {
  trigger: "#f5b647",   // amber
  condition: "#5bd5e0", // cyan
  action: "#9bd6c4",    // mint
};

const MODULE_ACCENT: Record<string, string> = {
  HOTELS: "#e89a7c",
  DAIRY: "#c69345",
  FARMS: "#7fb89b",
  FINANCE: "#cdd7e1",
  GROUP: "#9aa8b8",
  EDUCATION: "#d6a48a",
  TIME: "#5bd5e0",
};

export function StudioCanvas({
  workflowId,
  nodes: initialNodes,
  edges: initialEdges,
  ar,
  canManage,
}: {
  workflowId: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  ar: boolean;
  // MANAGER+ can delete nodes/edges; below that the delete affordances are
  // hidden (the server actions are role-gated, so showing them would be a
  // dead button). Wiring/adding stays available to everyone (requireUser).
  canManage: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Defense-in-depth: even though delete buttons are hidden for non-managers,
  // surface a clear message instead of a silent no-op if a role-gated action
  // ever rejects.
  function notifyDenied() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<ToastFlash>(TOAST_EVENT, {
        detail: {
          type: "info",
          entity: "info",
          label: ar ? "ليس لديك صلاحية لتعديل سير العمل" : "You don't have permission to edit workflows",
        },
      }),
    );
  }

  // Group nodes by column.
  const layout = useMemo(() => {
    const byCol: Record<1 | 2 | 3, StudioNode[]> = { 1: [], 2: [], 3: [] };
    for (const n of initialNodes) byCol[n.column].push(n);
    for (const c of [1, 2, 3] as const) {
      byCol[c].sort((a, b) => a.orderInColumn - b.orderInColumn);
    }
    const colHeights = [byCol[1].length, byCol[2].length, byCol[3].length];
    const maxCol = Math.max(1, ...colHeights);
    const totalWidth = PAD * 2 + 3 * NODE_W + 2 * COL_GAP;
    const totalHeight = PAD * 2 + maxCol * NODE_H + (maxCol - 1) * ROW_GAP;
    return { byCol, totalWidth, totalHeight };
  }, [initialNodes]);

  // Per-node coordinates.
  const nodePos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const c of [1, 2, 3] as const) {
      const list = layout.byCol[c];
      list.forEach((n, i) => {
        const x = PAD + (c - 1) * (NODE_W + COL_GAP);
        const y = PAD + i * (NODE_H + ROW_GAP);
        m.set(n.id, { x, y });
      });
    }
    return m;
  }, [layout]);

  // Wiring state.
  const [wiringFrom, setWiringFrom] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!wiringFrom || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWiringFrom(null);
    };
    if (wiringFrom) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("keydown", onEsc);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onEsc);
    };
  }, [wiringFrom]);

  const onPortClick = async (nodeId: string, side: "out" | "in") => {
    if (side === "out") {
      setWiringFrom(nodeId);
      return;
    }
    if (!wiringFrom) return;
    if (wiringFrom === nodeId) {
      setWiringFrom(null);
      return;
    }
    // Commit the edge.
    const fd = new FormData();
    fd.set("workflowId", workflowId);
    fd.set("fromNodeId", wiringFrom);
    fd.set("toNodeId", nodeId);
    setWiringFrom(null);
    setCursor(null);
    await addEdge(fd);
    router.refresh();
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    // Click on empty canvas cancels wiring.
    if ((e.target as HTMLElement).dataset.canvas === "1") {
      setWiringFrom(null);
      setCursor(null);
    }
  };

  const onDeleteEdge = async (edgeId: string) => {
    const fd = new FormData();
    fd.set("id", edgeId);
    fd.set("workflowId", workflowId);
    try {
      await deleteEdge(fd);
      router.refresh();
    } catch {
      notifyDenied();
    }
  };

  const onDeleteNode = async (id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("workflowId", workflowId);
    try {
      await deleteNode(fd);
      router.refresh();
    } catch {
      notifyDenied();
    }
  };

  const isEmpty = initialNodes.length === 0;

  return (
    <div
      ref={containerRef}
      className="studio-canvas"
      data-canvas="1"
      onClick={onCanvasClick}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "#0a0d12",
      }}
    >
      {isEmpty ? (
        <div className="studio-empty">
          <Zap className="h-5 w-5" strokeWidth={1.5} />
          <p>
            {ar
              ? "هذا السير العمل فارغ. اسحب عقدة من المجموعة على اليسار لتبدأ."
              : "This workflow is empty. Pick a node from the palette to begin."}
          </p>
        </div>
      ) : (
        <svg
          width={layout.totalWidth}
          height={layout.totalHeight}
          style={{ display: "block" }}
        >
          {/* Column header bands */}
          {[
            { col: 1, label: ar ? "مُشغّلات" : "TRIGGERS", accent: KIND_ACCENT.trigger },
            { col: 2, label: ar ? "شروط"   : "CONDITIONS", accent: KIND_ACCENT.condition },
            { col: 3, label: ar ? "أفعال"  : "ACTIONS", accent: KIND_ACCENT.action },
          ].map(({ col, label, accent }) => {
            const x = PAD + (col - 1) * (NODE_W + COL_GAP);
            return (
              <g key={col}>
                <rect
                  x={x}
                  y={20}
                  width={NODE_W}
                  height={1}
                  fill={accent}
                  opacity={0.5}
                />
                <text
                  x={x}
                  y={14}
                  fill={accent}
                  style={{
                    fontFamily:
                      "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: 12,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Edges */}
          <g>
            {initialEdges.map((e) => {
              const a = nodePos.get(e.fromNodeId);
              const b = nodePos.get(e.toNodeId);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const cx = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
              return (
                <g
                  key={e.id}
                  className="studio-edge-group"
                  data-from={e.fromNodeId}
                  data-to={e.toNodeId}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="#5bd5e0"
                    strokeWidth={1.4}
                    opacity={0.85}
                    style={{
                      strokeDasharray: 800,
                      strokeDashoffset: 800,
                      animation: "studio-edge-draw 480ms cubic-bezier(0.16,1,0.3,1) forwards",
                      filter: "drop-shadow(0 0 6px rgba(91, 213, 224, 0.55))",
                    }}
                  />
                  {/* Endpoint dot */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={3}
                    fill="#5bd5e0"
                    style={{ filter: "drop-shadow(0 0 6px rgba(91, 213, 224, 0.85))" }}
                  />
                  {/* Token particle for the test-run animation */}
                  <circle
                    className="studio-token"
                    r={4}
                    fill="#f5b647"
                    style={{
                      offsetPath: `path("${path}")` as any,
                      filter: "drop-shadow(0 0 8px rgba(245, 182, 71, 0.9))",
                      opacity: 0,
                    }}
                  />
                  {/* Delete affordance — visible on hover (MANAGER+ only) */}
                  {canManage ? (
                    <foreignObject
                      x={cx - 11}
                      y={(y1 + y2) / 2 - 11}
                      width={22}
                      height={22}
                      className="studio-edge-x"
                    >
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDeleteEdge(e.id);
                        }}
                        className="studio-edge-x-btn"
                        title="Remove wire"
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2} />
                      </button>
                    </foreignObject>
                  ) : null}
                </g>
              );
            })}

            {/* Ghost wire while building */}
            {wiringFrom && cursor ? (() => {
              const a = nodePos.get(wiringFrom);
              if (!a) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = cursor.x;
              const y2 = cursor.y;
              const cx = (x1 + x2) / 2;
              return (
                <path
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#5bd5e0"
                  strokeWidth={1.5}
                  strokeDasharray="4 6"
                  opacity={0.7}
                />
              );
            })() : null}
          </g>

          {/* Nodes */}
          <g>
            {initialNodes.map((n) => {
              const p = nodePos.get(n.id);
              if (!p) return null;
              const accent = KIND_ACCENT[n.kind];
              const moduleColor = MODULE_ACCENT[n.module] ?? "#9aa8b8";
              const Icon = n.kind === "trigger" ? Zap : n.kind === "condition" ? GitBranch : Plug;
              const wiringMode = wiringFrom != null;
              const isSource = wiringFrom === n.id;
              const canBeTarget =
                wiringMode && !isSource && n.kind !== "trigger";

              return (
                <g
                  key={n.id}
                  className="studio-node-group"
                  data-node={n.id}
                  data-kind={n.kind}
                >
                  {/* Card */}
                  <rect
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={2}
                    fill="#11161e"
                    stroke={canBeTarget ? "#f5b647" : "#1f2630"}
                    strokeWidth={canBeTarget ? 1.5 : 1}
                  />
                  {/* Top accent rail */}
                  <rect
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={2}
                    fill={accent}
                  />
                  {/* Module color band on left edge */}
                  <rect
                    x={p.x}
                    y={p.y + 2}
                    width={3}
                    height={NODE_H - 2}
                    fill={moduleColor}
                  />
                  {/* Kind tag */}
                  <text
                    x={p.x + 14}
                    y={p.y + 22}
                    fill={accent}
                    style={{
                      fontFamily:
                        "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 12,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    {n.kind}
                    <tspan dx={8} fill="rgba(231,236,242,0.45)">
                      · {n.module}
                    </tspan>
                  </text>
                  {/* Label */}
                  <text
                    x={p.x + 14}
                    y={p.y + 46}
                    fill="#e6ecf2"
                    style={{
                      fontFamily: "'Inter Tight','Inter',sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {ar ? n.labelAr : n.label}
                  </text>
                  {/* Summary */}
                  <text
                    x={p.x + 14}
                    y={p.y + 64}
                    fill="rgba(231,236,242,0.62)"
                    style={{
                      fontFamily:
                        "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 12,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {n.summary}
                  </text>

                  {/* Inbound port (left edge mid) */}
                  {n.kind !== "trigger" ? (
                    <circle
                      className="studio-port studio-port-in"
                      cx={p.x}
                      cy={p.y + NODE_H / 2}
                      r={6}
                      fill={canBeTarget ? "#f5b647" : "#1f2630"}
                      stroke="#5bd5e0"
                      strokeWidth={1}
                      onClick={() => onPortClick(n.id, "in")}
                      style={{ cursor: "pointer" }}
                    />
                  ) : null}

                  {/* Outbound port (right edge mid) */}
                  {n.kind !== "action" ? (
                    <circle
                      className="studio-port studio-port-out"
                      cx={p.x + NODE_W}
                      cy={p.y + NODE_H / 2}
                      r={6}
                      fill={isSource ? "#f5b647" : "#0a0d12"}
                      stroke={isSource ? "#f5b647" : "#5bd5e0"}
                      strokeWidth={1.5}
                      onClick={() => onPortClick(n.id, "out")}
                      style={{ cursor: "pointer" }}
                    />
                  ) : null}

                  {/* Delete node button (top-right corner of card) — MANAGER+ only */}
                  {canManage ? (
                    <foreignObject
                      x={p.x + NODE_W - 22}
                      y={p.y + 4}
                      width={18}
                      height={18}
                      className="studio-node-x"
                    >
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDeleteNode(n.id);
                        }}
                        className="studio-node-x-btn"
                        title="Delete node"
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2} />
                      </button>
                    </foreignObject>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {wiringFrom ? (
        <div className="studio-wiring-hint">
          <Cable className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "اضغط على منفذ الدخل لربطه — أو ESC للإلغاء" : "Click an inbound port to wire — or ESC to cancel"}
        </div>
      ) : null}
    </div>
  );
}
