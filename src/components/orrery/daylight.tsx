import type { ReactNode } from "react";

// Reusable Claude Design "daylight" work-surface building blocks. Pair with
// app/(app)/daylight.css (styles scoped under .dl-page). Presentational only —
// pages keep their own real-data queries + server actions and just render these.

export function DaylightShell({ children, dir }: { children: ReactNode; dir?: "rtl" | "ltr" }) {
  return (
    <div className="dl-page" dir={dir}>
      {children}
    </div>
  );
}

export function DaylightHeader({
  eyebrow, title, subtitle, status, actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="sec-head reveal">
      <div>
        <div className="sec-eyebrow"><span className="tick" />{eyebrow}</div>
        <h1 className="sec-title">{title}</h1>
        {subtitle ? <p className="sec-sub">{subtitle}</p> : null}
      </div>
      {status || actions ? (
        <div className="sec-head-aside">
          {status ? <span className="sec-status"><span className="dot" />{status}</span> : null}
          {actions ? <div className="sec-actions">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

export function DaylightKpiGrid({ children }: { children: ReactNode }) {
  return <section className="kpi-grid">{children}</section>;
}

export function DaylightKpi({
  label, value, hint, delta,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { dir: "up" | "down"; text: ReactNode };
}) {
  return (
    <div className="kpi-card reveal">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}</div>
      {hint || delta ? (
        <div className="kpi-foot">
          {hint ? <span className="kpi-hint">{hint}</span> : null}
          {delta ? <span className={`delta ${delta.dir}`}>{delta.dir === "up" ? "▲" : "▾"} {delta.text}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function DaylightPanel({
  title, aside, children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="panel reveal">
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        {aside ? <span className="panel-aside">{aside}</span> : null}
      </div>
      {children}
    </div>
  );
}
