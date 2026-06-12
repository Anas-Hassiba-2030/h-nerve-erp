"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// Reference Inbox feed (docs/design/system/sections/inbox.html + inbox.js):
// pill filter + live search over the attention feed. Real items are fed in
// from the server page; this only handles the client-side filtering UI.

export type FeedItem = {
  id: string;
  type: "brain" | "alert" | "task" | "msg";
  icon: string;
  title: string;
  preview: string;
  chip: string;
  time: string;
  href: string;
};

type Pill = { f: "all" | FeedItem["type"]; label: string };

export function InboxFeed({
  items,
  pills,
  searchPlaceholder,
  emptyTitle,
  emptyDesc,
}: {
  items: FeedItem[];
  pills: Pill[];
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDesc: string;
}) {
  const [filter, setFilter] = useState<Pill["f"]>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return items.filter((it) => {
      if (filter !== "all" && it.type !== filter) return false;
      if (query) {
        const h = `${it.title} ${it.preview} ${it.chip}`.toLowerCase();
        if (h.indexOf(query.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }, [items, filter, query]);

  return (
    <>
      <div className="ib-controls">
        <div className="ib-pills">
          {pills.map((p) => (
            <button
              key={p.f}
              className={`pill${filter === p.f ? " on" : ""}`}
              data-f={p.f}
              onClick={() => setFilter(p.f)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          className="ib-search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="ib-feed">
        {visible.map((it) => (
          <Link key={it.id} className="item" href={it.href}>
            <span className={`tic ${it.type}`}>{it.icon}</span>
            <div className="ibody">
              <div className="it">{it.title}</div>
              <div className="ip">{it.preview}</div>
            </div>
            <span className="chip">{it.chip}</span>
            <span className="tm">{it.time}</span>
            <span className="go">←</span>
          </Link>
        ))}
      </div>
      <div className={`ib-empty${visible.length === 0 ? " show" : ""}`}>
        <div className="ic">✓</div>
        <div className="t">{emptyTitle}</div>
        <div className="s">{emptyDesc}</div>
      </div>
    </>
  );
}
