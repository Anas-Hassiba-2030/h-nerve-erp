"use client";
// Tab switcher for the AR/AP ageing report — the *Client.tsx pattern
// (server renders both tables, client only swaps visibility).
import { useState, type ReactNode } from "react";

export function AgeingTabsClient({
  receivables,
  payables,
  labels,
}: {
  receivables: ReactNode;
  payables: ReactNode;
  labels: { receivables: string; payables: string };
}) {
  const [tab, setTab] = useState<"ar" | "ap">("ar");
  const tabs = [
    { key: "ar" as const, label: labels.receivables, content: receivables },
    { key: "ap" as const, label: labels.payables, content: payables },
  ];
  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "btn btn-primary" : "btn"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} className={tab === t.key ? "" : "hidden"}>
          {t.content}
        </div>
      ))}
    </>
  );
}
