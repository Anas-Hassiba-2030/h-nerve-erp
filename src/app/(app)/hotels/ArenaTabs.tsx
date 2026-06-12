"use client";

// Minimal client island for the arena tab switcher. Mirrors the behaviour of
// docs/design/system/ops.js `tabs()`: clicking an .ops-tab marks it `.on` and
// reveals the matching .ops-panel (data-panel === data-tab). Everything else on
// the page stays a server component — only this interaction needs JS.

import { useState, type ReactNode } from "react";

export type ArenaTab = { id: string; label: string };

export function ArenaTabs({
  tabs,
  panels,
}: {
  tabs: ArenaTab[];
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <>
      <div className="ops-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ops-tab${t.id === active ? " on" : ""}`}
            data-tab={t.id}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} className={`ops-panel${t.id === active ? " on" : ""}`} data-panel={t.id}>
          {panels[t.id]}
        </div>
      ))}
    </>
  );
}
