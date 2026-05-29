// components/empire/CouncilFeed.tsx — Phase 19 (empire boardroom).
//
// The live council feed: the last 5 council deliberations across the whole
// group, newest first, each with its status and the moderator's confidence.
// Server component, pure props. Quiet Authority.

import { formatDate } from "@/lib/utils";
import type { CouncilFeedItem } from "@/lib/empire/summary";

function statusTone(status: string): "done" | "running" | "failed" {
  if (status === "DONE") return "done";
  if (status === "FAILED") return "failed";
  return "running";
}

export function CouncilFeed({ items, ar }: { items: CouncilFeedItem[]; ar: boolean }) {
  return (
    <section className="emp-panel">
      <header className="emp-panel-head">
        <span className="emp-panel-title">{ar ? "آخر مجالس النقاش" : "Latest council sessions"}</span>
        <span className="emp-panel-meta">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="emp-panel-empty">{ar ? "لا جلسات بعد." : "No sessions yet."}</p>
      ) : (
        <ul className="emp-feed">
          {items.map((c) => (
            <li key={c.id} className="emp-feed-row">
              <span className="emp-feed-dot" data-tone={statusTone(c.status)} aria-hidden />
              <div className="emp-feed-body">
                <span className="emp-feed-topic">{c.topic}</span>
                <span className="emp-feed-sub">
                  {formatDate(c.ranAt, ar ? "ar" : "en")}
                  {c.confidence != null ? (
                    <>
                      <span className="emp-feed-sep">·</span>
                      {ar ? "ثقة" : "conf"} {Math.round(c.confidence * 100)}%
                    </>
                  ) : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
