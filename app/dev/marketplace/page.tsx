// app/dev/marketplace — Top community-built agents.
//
// 24 agents arranged as planets in three concentric orbits around the
// H-Nerve sun. Each planet's distance from the sun = inverse of installs
// (most-installed agents closest in). Hover any planet to see its tagline
// and stats. Below the orbit, the same 24 in a sortable list.
//
// Phase 20 of docs/PHASES-INTELLIGENCE.md.

import { MARKETPLACE_AGENTS } from "@/lib/protocol/spec";
import { ArrowUpRight, Star, Download } from "lucide-react";

export default function MarketplacePage() {
  // Sort by installs descending; the closest-orbit agents win the spotlight.
  const ranked = MARKETPLACE_AGENTS.slice().sort((a, b) => b.installs - a.installs);
  const maxInstalls = ranked[0]?.installs ?? 1;

  // Place each agent on one of 3 orbits. Top-8 inner, mid-8 middle, rest outer.
  const orbits = [
    ranked.slice(0, 8),
    ranked.slice(8, 16),
    ranked.slice(16),
  ];

  return (
    <>
      <header className="dev-page-head">
        <p className="dev-page-eyebrow">MARKETPLACE</p>
        <h1 className="dev-page-title">Top {ranked.length} community agents</h1>
        <p className="dev-page-sub">
          Each one is a single function. Each one cites every claim. The
          inner orbit shows the most-installed.
        </p>
      </header>

      {/* Orbit visualization */}
      <section className="dev-orbit" aria-label="Agent orbits">
        <svg
          viewBox="-260 -260 520 520"
          width="100%"
          height="100%"
          className="dev-orbit-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Orbit rings */}
          {[110, 170, 230].map((r, i) => (
            <circle
              key={r}
              cx={0}
              cy={0}
              r={r}
              className="dev-orbit-ring"
              data-ring={i}
            />
          ))}

          {/* Sun — H-Nerve core */}
          <circle cx={0} cy={0} r={36} className="dev-orbit-sun" />
          <circle cx={0} cy={0} r={28} className="dev-orbit-sun-inner" />
          <text x={0} y={5} className="dev-orbit-sun-mark" textAnchor="middle">
            H·N
          </text>

          {/* Planets */}
          {orbits.map((agents, ringIdx) => {
            const radius = 110 + ringIdx * 60;
            const dur = 38 + ringIdx * 14; // outer rings revolve slower
            return agents.map((a, i) => {
              const angle = (i / agents.length) * Math.PI * 2 + ringIdx * 0.8;
              const cx = Math.cos(angle) * radius;
              const cy = Math.sin(angle) * radius;
              const size = 6 + (a.installs / maxInstalls) * 8;
              return (
                <g
                  key={a.slug}
                  className="dev-orbit-planet-group"
                  style={{
                    ["--orbit-radius" as any]: `${radius}px`,
                    ["--orbit-duration" as any]: `${dur}s`,
                    ["--orbit-start" as any]: `${(angle * 180) / Math.PI}deg`,
                  } as React.CSSProperties}
                >
                  <g transform={`translate(${cx} ${cy})`}>
                    <circle
                      r={size + 4}
                      className="dev-orbit-planet-halo"
                      style={{ fill: a.color }}
                    />
                    <circle
                      r={size}
                      className="dev-orbit-planet"
                      style={{ fill: a.color }}
                    />
                    <text
                      x={0}
                      y={size + 12}
                      className="dev-orbit-planet-label"
                      textAnchor="middle"
                    >
                      {a.name}
                    </text>
                  </g>
                </g>
              );
            });
          })}
        </svg>
      </section>

      {/* Detailed list */}
      <section className="dev-market-list">
        <header className="dev-market-list-head">
          <span className="dev-market-list-col">AGENT</span>
          <span className="dev-market-list-col">PACK</span>
          <span className="dev-market-list-col">AUTHOR</span>
          <span className="dev-market-list-col dev-market-list-col-num">INSTALLS</span>
          <span className="dev-market-list-col dev-market-list-col-num">RATING</span>
          <span className="dev-market-list-col dev-market-list-col-num">HEALTH</span>
        </header>
        <ol className="dev-market-list-rows">
          {ranked.map((a, i) => (
            <li
              key={a.slug}
              className="dev-market-row"
              style={{ ["--planet-color" as any]: a.color } as React.CSSProperties}
            >
              <span className="dev-market-rank">{String(i + 1).padStart(2, "0")}</span>
              <div className="dev-market-name-cell">
                <div className="dev-market-name">{a.name}</div>
                <div className="dev-market-tag">{a.tagline}</div>
              </div>
              <span className="dev-market-pack">{a.pack}</span>
              <span className="dev-market-author">{a.author}</span>
              <span className="dev-market-stat">
                <Download className="h-3 w-3" strokeWidth={1.6} />
                {a.installs.toLocaleString()}
              </span>
              <span className="dev-market-stat">
                <Star className="h-3 w-3" strokeWidth={1.6} />
                {a.rating.toFixed(1)}
              </span>
              <span
                className="dev-market-health"
                data-dir={a.voteHealth >= 0.6 ? "good" : a.voteHealth >= 0.4 ? "ok" : "low"}
              >
                {Math.round(a.voteHealth * 100)}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 dev-market-arrow" strokeWidth={1.5} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
