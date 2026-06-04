"use client";

// TestRunStrip — bottom dock of the studio.
//
// Press "Test run" → server action evaluates the workflow live → trace
// returns. The strip animates yellow tokens along each affected edge in
// the canvas (1.5s per hop), then prints the trace as a terminal-style
// log below.
//
// Phase 12 of docs/PHASES-INTELLIGENCE.md.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, CheckCircle2, AlertOctagon, X } from "lucide-react";
import { testRunWorkflow } from "@/app/(app)/workflows/actions";

type TraceEvent = {
  nodeId: string;
  templateKey: string;
  kind: "trigger" | "condition" | "action";
  status: "fired" | "passed" | "skipped" | "failed";
  message: string;
  ms: number;
};

type LastRun = {
  id: string;
  status: string;
  durationMs: number;
  trace: TraceEvent[];
};

const STATUS_COLOR: Record<string, string> = {
  fired:   "#f5b647",
  passed:  "#5bd5e0",
  skipped: "#5a6877",
  failed:  "#e85a72",
};

export function TestRunStrip({
  workflowId,
  lastRun: initial,
}: {
  workflowId: string;
  lastRun: LastRun | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LastRun | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const onRun = async () => {
    setError(null);
    setRunning(true);
    try {
      const res = await testRunWorkflow({ workflowId });
      const next: LastRun = {
        id: res.runId,
        status: res.status,
        durationMs: res.durationMs,
        trace: res.trace,
      };
      setResult(next);
      // Trigger token animations on the canvas by setting a CSS attribute
      // on the document — picked up by the .studio-token CSS rule.
      const fired = new Set(res.trace.filter((t) => t.status === "fired" || t.status === "passed").map((t) => t.nodeId));
      document.documentElement.dataset.runId = res.runId;
      animateTokens(fired);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <footer className="studio-runstrip">
      <div className="studio-runstrip-head">
        <button
          onClick={onRun}
          disabled={running}
          className="studio-run-btn"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 studio-spin" strokeWidth={1.75} />
          ) : (
            <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
          {running ? "Running…" : "Test run"}
        </button>

        {result ? (
          <span className="studio-run-meta">
            {result.status === "DRY_RUN" ? (
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#9bd6c4" }} />
            ) : result.status === "SUCCESS" ? (
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#5bd5e0" }} />
            ) : (
              <AlertOctagon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#e85a72" }} />
            )}
            <span>{result.status}</span>
            <span style={{ color: "#5a6877" }}>·</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{result.durationMs}ms</span>
            <span style={{ color: "#5a6877" }}>·</span>
            <span>{result.trace.length} events</span>
          </span>
        ) : (
          <span className="studio-run-meta" style={{ color: "#5a6877" }}>
            no runs yet — press Test run to evaluate live
          </span>
        )}

        {error ? (
          <span className="studio-run-error">
            <X className="h-3 w-3" strokeWidth={2} /> {error}
          </span>
        ) : null}
      </div>

      {result && result.trace.length > 0 ? (
        <ol className="studio-trace">
          {result.trace.map((t, i) => (
            <li key={i} className="studio-trace-row" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="studio-trace-i">{String(i + 1).padStart(2, "0")}</span>
              <span
                className="studio-trace-kind"
                style={{ color: STATUS_COLOR[t.status] }}
              >
                {t.kind.toUpperCase()}
              </span>
              <span
                className="studio-trace-status"
                style={{ color: STATUS_COLOR[t.status] }}
              >
                {t.status.toUpperCase()}
              </span>
              <span className="studio-trace-msg">{t.message}</span>
              <span className="studio-trace-ms">{t.ms}ms</span>
            </li>
          ))}
        </ol>
      ) : null}
    </footer>
  );
}

/**
 * Walk every edge whose endpoints are both in `firedNodeIds`, and trigger
 * the .studio-token motion. We don't know runtime layout in JS — the
 * CSS keyframe handles the path traversal via offset-path on each edge's
 * <circle.studio-token>.
 */
function animateTokens(firedNodeIds: Set<string>) {
  const groups = document.querySelectorAll<SVGGElement>(".studio-edge-group");
  groups.forEach((g) => {
    // Only animate edges whose BOTH endpoints actually fired in this run, so
    // the token motion mirrors the real trace instead of lighting every edge.
    // (StudioCanvas stamps data-from / data-to with the edge's node ids.)
    const from = g.dataset.from;
    const to = g.dataset.to;
    if (!from || !to || !firedNodeIds.has(from) || !firedNodeIds.has(to)) return;
    // Each .studio-edge-group has a path and a .studio-token circle.
    const token = g.querySelector<SVGCircleElement>(".studio-token");
    if (!token) return;
    // Restart the animation by toggling the data attr.
    token.style.animation = "none";
    void token.getBoundingClientRect();
    token.style.animation = "studio-token-flow 1500ms cubic-bezier(0.4, 0, 0.6, 1) forwards";
  });
}
