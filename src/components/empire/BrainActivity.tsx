// components/empire/BrainActivity.tsx — Phase 19 (empire boardroom).
//
// Brain activity over the last 7 days: total workflow runs across the group,
// broken down by tenant (Workflow.scope), drawn as a compact share bar list.
// Server component, pure props. Quiet Authority.

import type { BrainActivityRow } from "@/lib/empire/summary";

export function BrainActivity({
  total,
  byScope,
  ar,
}: {
  total: number;
  byScope: BrainActivityRow[];
  ar: boolean;
}) {
  const max = byScope.reduce((m, r) => Math.max(m, r.runs), 0) || 1;
  return (
    <section className="emp-panel">
      <header className="emp-panel-head">
        <span className="emp-panel-title">{ar ? "نشاط الدماغ · ٧ أيام" : "Brain activity · 7d"}</span>
        <span className="emp-panel-meta">{total.toLocaleString(ar ? "ar-JO" : "en-US")}</span>
      </header>

      {byScope.length === 0 ? (
        <p className="emp-panel-empty">
          {ar ? "لا تشغيلات في آخر ٧ أيام." : "No runs in the last 7 days."}
        </p>
      ) : (
        <ul className="emp-activity">
          {byScope.map((r) => (
            <li key={r.scope} className="emp-activity-row">
              <span className="emp-activity-scope" title={r.scope}>
                {r.scope === "default" ? (ar ? "المجموعة" : "Group") : r.scope}
              </span>
              <span className="emp-activity-bar" aria-hidden>
                <span
                  className="emp-activity-fill"
                  style={{ width: `${Math.round((r.runs / max) * 100)}%` }}
                />
              </span>
              <span className="emp-activity-num">{r.runs}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
