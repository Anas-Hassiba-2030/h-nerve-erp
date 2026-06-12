// components/realtime/CommentBubble.tsx
//
// A peer's comment, sliding in from the inline-end of the page. Stays
// docked on the right (LTR) / left (RTL) so multiple comments stack.
//
// Phase 17 of docs/PHASES-INTELLIGENCE.md.

"use client";

import { X } from "lucide-react";

type RTComment = {
  id: string;
  ownerId: string;
  ownerName: string;
  monogram: string;
  color: string;
  body: string;
  anchorX: number;
  anchorY: number;
  createdAt: number;
};

export function CommentBubble({
  comment,
  ar,
  index,
  onDismiss,
}: {
  comment: RTComment;
  ar: boolean;
  index: number;
  onDismiss: () => void;
}) {
  const ago = relativeTime(comment.createdAt, ar);
  return (
    <aside
      className="rt-comment"
      style={{
        ["--rt-color" as any]: comment.color,
        ["--rt-stack" as any]: index,
      } as React.CSSProperties}
      role="status"
    >
      <div className="rt-comment-head">
        <span className="rt-comment-pip">{comment.monogram}</span>
        <span className="rt-comment-name">{comment.ownerName}</span>
        <span className="rt-comment-ago">{ago}</span>
        <button
          type="button"
          className="rt-comment-close"
          onClick={onDismiss}
          aria-label={ar ? "إغلاق" : "Dismiss"}
        >
          <X className="h-3 w-3" strokeWidth={2} />
        </button>
      </div>
      <p className="rt-comment-body">{comment.body}</p>
    </aside>
  );
}

function relativeTime(ts: number, ar: boolean): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return ar ? "الآن" : "now";
  if (s < 60) return ar ? `قبل ${s} ث` : `${s}s ago`;
  const m = Math.round(s / 60);
  return ar ? `قبل ${m} د` : `${m}m ago`;
}
