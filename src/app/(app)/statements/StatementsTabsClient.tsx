"use client";
// Tab switcher for the three financial statements. Server renders all
// three statement tables and passes them down as ReactNodes (the
// *Client.tsx pattern — auth + data stay on the server, no re-fetching).
import { useState, type ReactNode } from "react";

export function StatementsTabsClient({
  trialBalance,
  incomeStatement,
  balanceSheet,
  labels,
}: {
  trialBalance: ReactNode;
  incomeStatement: ReactNode;
  balanceSheet: ReactNode;
  labels: { trialBalance: string; incomeStatement: string; balanceSheet: string };
}) {
  const [tab, setTab] = useState<"tb" | "pl" | "bs">("pl");
  const tabs = [
    { key: "pl" as const, label: labels.incomeStatement, content: incomeStatement },
    { key: "bs" as const, label: labels.balanceSheet, content: balanceSheet },
    { key: "tb" as const, label: labels.trialBalance, content: trialBalance },
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
