"use client";

// Interactive company covers + sector filter pills — mirrors the reference
// analytics-ops.js behaviour (sector pills filter the cover grid; each cover
// links through to the per-company analytics page). Presentational only; all
// numbers are pre-formatted on the server and passed in.

import { useState } from "react";
import Link from "next/link";

export type Cover = {
  id: string;
  name: string;
  emblem: string;
  rev: string; // pre-formatted
  growth: number; // signed percent (integer)
  growthText: string; // pre-formatted absolute percent
  sector: string; // localized sector label (used for filtering)
};

export function AnalyticsCovers({
  covers,
  allLabel,
  title,
  sub,
}: {
  covers: Cover[];
  allLabel: string;
  title: string;
  sub: string;
}) {
  const sectors = Array.from(new Set(covers.map((c) => c.sector)));
  const pills = [allLabel, ...sectors];
  const [active, setActive] = useState<string>(""); // "" === all

  const shown = covers.filter((c) => !active || c.sector === active);

  return (
    <>
      <div
        className="filter-pills reveal"
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}
      >
        {pills.map((label, i) => {
          const value = i === 0 ? "" : label;
          const on = value === active;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActive(value)}
              style={{
                padding: "7px 15px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid var(--line)",
                background: on ? "linear-gradient(135deg,var(--emerald-soft),var(--emerald))" : "var(--cream)",
                color: on ? "#fff" : "var(--ink-muted)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="an-card reveal">
        <h2>{title}</h2>
        <div className="sub">{sub}</div>
        <div className="an-covers">
          {shown.map((co) => (
            <Link key={co.id} href={`/analytics/${co.id}`} className="cover">
              <div className="lg">{co.emblem}</div>
              <div className="cn">{co.name}</div>
              <div className="cv">{co.rev}</div>
              <div
                style={{
                  fontSize: 11,
                  color: co.growth >= 0 ? "var(--sage)" : "#9a5648",
                  marginTop: 3,
                }}
              >
                {co.growth >= 0 ? "▲ +" : "▼ "}
                {co.growthText}%
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
