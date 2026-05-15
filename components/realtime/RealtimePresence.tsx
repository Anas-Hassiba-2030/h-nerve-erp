// components/realtime/RealtimePresence.tsx
//
// Client root for the real-time collaboration layer. Mounts:
//  - Top-end pip stack (avatar circles for everyone live on this page)
//  - Floating cursors that interpolate at 60fps via RAF
//  - Sliding comment bubbles
//  - Typing-near-element ochre underline
//
// Polls /api/realtime every 25s while the tab is visible, 60s while
// hidden. (Was 280ms/1500ms — far too chatty; it hammered the network
// and made the whole app feel laggy. The server session TTL was raised
// to 60s in lib/realtime.ts so peers don't expire between polls.)
//
// Phase 17 of docs/PHASES-INTELLIGENCE.md.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Pip } from "./Pip";
import { Cursor } from "./Cursor";
import { CommentBubble } from "./CommentBubble";
import { TypingUnderline } from "./TypingUnderline";

type RTUser = {
  id: string; name: string; monogram: string; color: string; role?: string;
};
type RTCursor = { x: number; y: number; visible: boolean };
type RTTyping = { near: string | null; startedAt: number };
type RTSession = { user: RTUser; cursor: RTCursor; typing: RTTyping; lastBeatAt: number; phantom?: boolean };
type RTComment = {
  id: string; ownerId: string; ownerName: string; monogram: string;
  color: string; body: string; anchorX: number; anchorY: number; createdAt: number;
};
type Scope = { sessions: RTSession[]; comments: RTComment[] };

// Stable color palette assigned per user — small set for quick recognition.
const COLORS = [
  "#5a7d4a", // sage
  "#b3733e", // copper
  "#8c7250", // bronze
  "#7d6f95", // lilac
  "#a5666a", // dusty rose
  "#4a6f80", // teal
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}
function monogramOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

type Props = {
  user: { id: string; name: string };
  locale?: "ar" | "en";
};

// Smoothly tween a peer's cursor toward its latest reported position.
// Each peer keeps a `display` (rendered) and `target` (last polled) pair;
// every animation frame we move display closer to target by ~14% — that
// gives the requested ~80ms ease without jitter, even when polls are
// sparse.
type RenderedCursor = {
  user: RTUser;
  // pixel coords (scaled from normalized at the moment we poll)
  displayX: number;
  displayY: number;
  targetX: number;
  targetY: number;
  visible: boolean;
  lastSeen: number;
  phantom?: boolean;
  typingNear: string | null;
};

export function RealtimePresence({ user, locale = "ar" }: Props) {
  const ar = locale === "ar";
  const pathname = usePathname();
  const me: RTUser = useMemo(
    () => ({
      id: user.id,
      name: user.name,
      monogram: monogramOf(user.name),
      color: hashColor(user.id),
    }),
    [user.id, user.name],
  );

  // Peers state
  const [peers, setPeers] = useState<RTSession[]>([]);
  const [comments, setComments] = useState<RTComment[]>([]);
  const renderedRef = useRef<Map<string, RenderedCursor>>(new Map());
  const [, force] = useState(0);

  // Own cursor → throttled to ~50ms via RAF
  const myCursor = useRef<RTCursor>({ x: 0, y: 0, visible: false });
  const myTyping = useRef<RTTyping>({ near: null, startedAt: 0 });
  const dismissed = useRef<Set<string>>(new Set());

  // Track local mouse position (normalized)
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      myCursor.current = {
        x: e.clientX / w,
        y: e.clientY / h,
        visible: true,
      };
    }
    function onLeave() {
      myCursor.current = { ...myCursor.current, visible: false };
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Track typing focus — broad heuristic: when the user focuses an input/
  // textarea inside the page, we light up the underline. The "near"
  // selector is the element's id or its closest [data-rt-anchor].
  useEffect(() => {
    function isText(el: HTMLElement | null) {
      if (!el) return null;
      if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) return el;
      if (el.isContentEditable) return el;
      return null;
    }
    function onFocus(e: FocusEvent) {
      const el = isText(e.target as HTMLElement);
      if (!el) return;
      const anchor =
        el.closest<HTMLElement>("[data-rt-anchor]")?.dataset.rtAnchor ??
        el.id ??
        "input";
      myTyping.current = { near: anchor, startedAt: Date.now() };
    }
    function onBlur() {
      myTyping.current = { near: null, startedAt: 0 };
    }
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", onBlur);
    return () => {
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("focusout", onBlur);
    };
  }, []);

  // Poll loop
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__rtMounted = true;
    }
    let alive = true;
    let tickHandle: number | null = null;
    let nextDelay = 25_000;

    async function tick() {
      if (!alive) return;
      // Slow down further (but never fully stop) when the tab is hidden so
      // the phantom timeline still ticks in MCP/automated/embedded contexts
      // that report visibility=hidden even when the tab is actually
      // rendered. 25s while visible, 60s while hidden. The server session
      // TTL (lib/realtime.ts) is 60s so peers don't expire between polls.
      const slow = document.visibilityState === "hidden";
      nextDelay = slow ? 60_000 : 25_000;
      try {
        // POST own state (fire and forget)
        fetch("/api/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopeId: pathname,
            user: me,
            cursor: myCursor.current,
            typing: myTyping.current,
          }),
        }).catch(() => {});

        // GET peers
        const res = await fetch(
          `/api/realtime?scopeId=${encodeURIComponent(pathname)}&userId=${encodeURIComponent(me.id)}`,
          { method: "GET", cache: "no-store" },
        );
        if (res.ok) {
          const data: Scope = await res.json();
          setPeers(data.sessions);
          setComments(
            data.comments.filter((c) => !dismissed.current.has(c.id)),
          );
        }
      } catch {}
      if (alive)
        tickHandle = window.setTimeout(tick, nextDelay);
    }
    tick();
    function onVis() {
      if (document.visibilityState === "visible" && alive && tickHandle == null) {
        tick();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      if (tickHandle != null) window.clearTimeout(tickHandle);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname, me]);

  // Reconcile peers list into rendered cursors; reset display positions
  // for newcomers so they fade in instead of teleporting.
  useEffect(() => {
    const map = renderedRef.current;
    const seen = new Set<string>();
    for (const s of peers) {
      seen.add(s.user.id);
      const tx = s.cursor.x * window.innerWidth;
      const ty = s.cursor.y * window.innerHeight;
      const cur = map.get(s.user.id);
      if (!cur) {
        map.set(s.user.id, {
          user: s.user,
          displayX: tx,
          displayY: ty,
          targetX: tx,
          targetY: ty,
          visible: s.cursor.visible,
          lastSeen: Date.now(),
          phantom: s.phantom,
          typingNear: s.typing?.near ?? null,
        });
      } else {
        cur.user = s.user;
        cur.targetX = tx;
        cur.targetY = ty;
        cur.visible = s.cursor.visible;
        cur.lastSeen = Date.now();
        cur.phantom = s.phantom;
        cur.typingNear = s.typing?.near ?? null;
      }
    }
    // Drop peers we no longer see
    for (const id of Array.from(map.keys())) {
      if (!seen.has(id)) map.delete(id);
    }
    force((n) => n + 1);
  }, [peers]);

  // 60fps interpolation toward target. We don't snap to target — at 14%
  // per frame the cursor reaches within 1px of target after ~6 frames
  // (~100ms) which is the ~80ms easing target.
  useEffect(() => {
    let raf = 0;
    function frame() {
      const map = renderedRef.current;
      let dirty = false;
      for (const c of map.values()) {
        const dx = c.targetX - c.displayX;
        const dy = c.targetY - c.displayY;
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
          c.displayX += dx * 0.18;
          c.displayY += dy * 0.18;
          dirty = true;
        }
      }
      if (dirty) force((n) => n + 1);
      raf = window.requestAnimationFrame(frame);
    }
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  // Dismiss a comment locally (client-side only — phantom comments
  // re-spawn on the next poll so this is mostly for real comments).
  const onDismissComment = useCallback((id: string) => {
    dismissed.current.add(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    fetch("/api/realtime", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scopeId: pathname, commentId: id }),
    }).catch(() => {});
  }, [pathname]);

  const renderedCursors = Array.from(renderedRef.current.values());

  return (
    <>
      {/* Top-end pip stack — peer avatars */}
      {peers.length > 0 ? (
        <div className="rt-pip-stack" aria-label={ar ? "حضور مباشر" : "Live presence"}>
          {peers.slice(0, 5).map((p) => (
            <Pip
              key={p.user.id}
              monogram={p.user.monogram}
              name={p.user.name}
              role={p.user.role}
              color={p.user.color}
              phantom={p.phantom}
            />
          ))}
          {peers.length > 5 ? (
            <span className="rt-pip-more">+{peers.length - 5}</span>
          ) : null}
        </div>
      ) : null}

      {/* Cursors */}
      {renderedCursors.map((c) =>
        c.visible ? (
          <Cursor
            key={c.user.id}
            x={c.displayX}
            y={c.displayY}
            color={c.user.color}
            label={c.user.name}
            monogram={c.user.monogram}
            phantom={c.phantom}
          />
        ) : null,
      )}

      {/* Typing underlines for peers */}
      {renderedCursors.map((c) =>
        c.typingNear ? (
          <TypingUnderline
            key={`t-${c.user.id}`}
            anchor={c.typingNear}
            color={c.user.color}
          />
        ) : null,
      )}

      {/* Comment bubbles */}
      {comments.map((c, i) => (
        <CommentBubble
          key={c.id}
          comment={c}
          ar={ar}
          index={i}
          onDismiss={() => onDismissComment(c.id)}
        />
      ))}
    </>
  );
}
