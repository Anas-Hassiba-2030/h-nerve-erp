"use client";
import { useState, type ReactNode } from "react";

export function OrgTabsClient({
  treeContent,
  listContent,
  treeLabel,
  listLabel,
}: {
  treeContent: ReactNode;
  listContent: ReactNode;
  treeLabel: string;
  listLabel: string;
}) {
  const [tab, setTab] = useState<"tree" | "list">("tree");
  return (
    <>
      <div className="em-tabs">
        <button
          type="button"
          className={`em-tab${tab === "tree" ? " on" : ""}`}
          onClick={() => setTab("tree")}
        >
          {treeLabel}
        </button>
        <button
          type="button"
          className={`em-tab${tab === "list" ? " on" : ""}`}
          onClick={() => setTab("list")}
        >
          {listLabel}
        </button>
      </div>
      <div className={`em-tree-wrap${tab === "tree" ? "" : " hidden"}`}>
        {treeContent}
      </div>
      <div className={tab === "list" ? "" : "hidden"}>
        {listContent}
      </div>
    </>
  );
}
