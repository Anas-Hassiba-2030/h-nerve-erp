// lib/realtime.ts
//
// Real-time collaboration substrate for H-Nerve.
//
// Phase 17 of docs/PHASES-INTELLIGENCE.md.
//
// Architecture:
// - In-memory presence store keyed by scopeId (typically a normalized URL).
// - Each entry has a TTL (60s); a GET filters out anything stale.
// - Real users POST their cursor/typing/comment state every ~25s
//   (raised from ~250ms for performance — see components/realtime/
//   RealtimePresence.tsx). TTL must stay >= the poll interval or peers
//   expire between polls.
// - Phantom demo users are generated server-side based on scope so the
//   wow moment lands without needing a second browser open. They follow
//   pre-scripted timelines that loop every 18 seconds.
//
// This is intentionally polling-based, not WebSockets — H-Nerve's runtime
// is Next.js dev/Vercel, which doesn't ship a long-lived socket server by
// default. Polling at 25s with HTTP/1.1 keep-alive is fine for a 5-10
// person company exec view (presence + comments don't need sub-second
// freshness), and the API surface is identical to what a proper Yjs/
// Liveblocks integration would expose.

export type RTUser = {
  id: string;
  name: string;
  monogram: string; // 1-2 letters; used in the avatar pip
  color: string;    // hex; cursor + pip ring
  role?: string;
};

export type RTCursor = {
  // Normalized to viewport: 0..1 on each axis. Lets us render correctly
  // across different screen sizes since cursor positions don't translate
  // 1:1 between users.
  x: number;
  y: number;
  visible: boolean;
};

export type RTTyping = {
  // The element selector the user is "near" (used as a hint for which
  // surface to underline). When null, no typing indicator is shown.
  near: string | null;
  startedAt: number;
};

export type RTComment = {
  id: string;
  ownerId: string;
  ownerName: string;
  monogram: string;
  color: string;
  body: string;
  // Anchor — like cursors, normalized [0..1] for cross-screen mapping.
  anchorX: number;
  anchorY: number;
  createdAt: number;
};

export type RTSession = {
  user: RTUser;
  cursor: RTCursor;
  typing: RTTyping;
  // Wall clock; sessions older than TTL are filtered out on read.
  lastBeatAt: number;
  // Marks phantoms so the client can render them with a subtle "demo" hint.
  phantom?: boolean;
};

export type RTScopeState = {
  scopeId: string;
  sessions: RTSession[];
  comments: RTComment[];
};

// 60s. Must stay >= the client poll interval (25s visible / 60s hidden
// in components/realtime/RealtimePresence.tsx) or real peers expire from
// the store between polls and flicker out of each other's presence.
const TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// In-memory store. The Next dev server reuses the module instance across
// HMR boundaries, so this state survives source edits in dev. In prod
// behind a load balancer you'd swap this for Redis — same shape.
// ---------------------------------------------------------------------------
type ScopeRecord = {
  sessions: Map<string, RTSession>; // userId -> session
  comments: RTComment[];
};
const SCOPES = new Map<string, ScopeRecord>();

function getOrCreate(scopeId: string): ScopeRecord {
  let r = SCOPES.get(scopeId);
  if (!r) {
    r = { sessions: new Map(), comments: [] };
    SCOPES.set(scopeId, r);
  }
  return r;
}

// Phantom user definitions — used by the demo timeline.
// Two execs the user has plausibly heard of in the H-Nerve / Hourani context.
const PHANTOM_USERS: RTUser[] = [
  {
    id: "phantom:cfo",
    name: "أحمد القاسم",
    monogram: "أق",
    color: "#b3733e", // copper
    role: "CFO",
  },
  {
    id: "phantom:coo",
    name: "ليلى الحوراني",
    monogram: "لح",
    color: "#5a7d4a", // sage
    role: "COO",
  },
];

/**
 * Generate phantom presences + comments for the current scope. Determinis-
 * tic per (scopeId, second) so multiple GETs in a single second return
 * the same data — the client interpolates cursors smoothly between
 * polls.
 *
 * The CFO follows a 18-second loop:
 *   0-4s   reading top-left
 *   4-7s   moves to a "decide" card
 *   7-9s   typing indicator near a comment box
 *   9-11s  comment appears
 *  11-18s  drifts back across the page
 */
function phantomState(scopeId: string, now: number): {
  sessions: RTSession[];
  comments: RTComment[];
} {
  // PHANTOM PRESENCE DISABLED. The simulated CFO cursor that drifted
  // around the screen was distracting in real use. Real multi-user
  // presence (two actual people on the same page) still works — it just
  // never injects a fake ghost user. To re-enable for a sales demo,
  // delete the next line.
  return { sessions: [], comments: [] };

  // Only show phantoms on certain scopes — the dashboard, the decision
  // theater, plans, insights. Not on settings/login etc.
  // eslint-disable-next-line no-unreachable
  const phantomScopes = [
    "/dashboard",
    "/insights",
    "/plans",
    "/brain",
    "/decisions",
    "/companies",
    "/workflows",
  ];
  const matches = phantomScopes.some((p) => scopeId.startsWith(p));
  if (!matches) return { sessions: [], comments: [] };

  const cycle = (now / 1000) % 18; // 0..18s repeating

  // CFO path — a smooth Bezier through 5 anchor points
  const cfoAnchors: Array<[number, number]> = [
    [0.18, 0.32], // top-left reading
    [0.34, 0.46], // KPI tile
    [0.62, 0.58], // decide card
    [0.66, 0.72], // comment box
    [0.36, 0.78], // drifts back
    [0.18, 0.32], // loop
  ];
  // Pick segment based on cycle
  const segIdx = Math.min(
    cfoAnchors.length - 2,
    Math.floor((cycle / 18) * (cfoAnchors.length - 1)),
  );
  const segPos =
    ((cycle / 18) * (cfoAnchors.length - 1)) - segIdx; // 0..1 within segment
  const a = cfoAnchors[segIdx];
  const b = cfoAnchors[segIdx + 1];
  // Smooth ease-in-out on the segment position so the cursor doesn't
  // teleport between anchors.
  const ease = segPos * segPos * (3 - 2 * segPos);
  const cfoX = a[0] + (b[0] - a[0]) * ease;
  const cfoY = a[1] + (b[1] - a[1]) * ease;

  const cfoTyping: RTTyping = {
    near: cycle >= 7 && cycle < 9 ? "decide-comment-box" : null,
    startedAt: now - Math.max(0, (cycle - 7) * 1000),
  };

  const cfoSession: RTSession = {
    user: PHANTOM_USERS[0],
    cursor: { x: cfoX, y: cfoY, visible: true },
    typing: cfoTyping,
    lastBeatAt: now,
    phantom: true,
  };

  // The CFO's comment lands in the second half of the loop and persists
  // until the loop wraps. Anchored to the same spot as the typing was.
  // We deliberately give it a STABLE id across cycles so a dismissal on
  // the client sticks — without this the user would see the same demo
  // comment every 18s for as long as they stayed on the page.
  // We also tighten the visibility window to cycles 9-14 (5 seconds)
  // so it pops in, lands, and clears without dominating the canvas.
  const cfoComments: RTComment[] = [];
  if (cycle >= 9 && cycle < 14) {
    cfoComments.push({
      id: "phantom-cfo:demo",
      ownerId: PHANTOM_USERS[0].id,
      ownerName: PHANTOM_USERS[0].name,
      monogram: PHANTOM_USERS[0].monogram,
      color: PHANTOM_USERS[0].color,
      body:
        "اعتمد الخطة كما هي. الهامش يتحمّل التقلّب وأنا متابع لسيولة الأسبوع.",
      anchorX: cfoAnchors[3][0],
      anchorY: cfoAnchors[3][1],
      createdAt: now - (cycle - 9) * 1000,
    });
  }

  return {
    sessions: [cfoSession],
    comments: cfoComments,
  };
}

// ---------------------------------------------------------------------------
// Public API used by the API route
// ---------------------------------------------------------------------------

export type BeatInput = {
  scopeId: string;
  userId: string;
  user: RTUser;
  cursor?: RTCursor;
  typing?: RTTyping;
};

export function beat(input: BeatInput) {
  const r = getOrCreate(input.scopeId);
  const prev = r.sessions.get(input.userId);
  r.sessions.set(input.userId, {
    user: input.user,
    cursor: input.cursor ?? prev?.cursor ?? { x: 0, y: 0, visible: false },
    typing: input.typing ?? prev?.typing ?? { near: null, startedAt: 0 },
    lastBeatAt: Date.now(),
  });
}

export function postComment(input: {
  scopeId: string;
  user: RTUser;
  body: string;
  anchorX: number;
  anchorY: number;
}): RTComment {
  const r = getOrCreate(input.scopeId);
  const c: RTComment = {
    id:
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    ownerId: input.user.id,
    ownerName: input.user.name,
    monogram: input.user.monogram,
    color: input.user.color,
    body: input.body.slice(0, 480),
    anchorX: input.anchorX,
    anchorY: input.anchorY,
    createdAt: Date.now(),
  };
  r.comments.push(c);
  // Cap comments per scope so memory doesn't grow unbounded
  if (r.comments.length > 60) r.comments = r.comments.slice(-60);
  return c;
}

export function dismissComment(scopeId: string, commentId: string) {
  const r = getOrCreate(scopeId);
  r.comments = r.comments.filter((c) => c.id !== commentId);
}

export function readScope(
  scopeId: string,
  excludeUserId?: string,
): RTScopeState {
  const r = getOrCreate(scopeId);
  const now = Date.now();

  // Drop stale real sessions
  for (const [uid, s] of r.sessions) {
    if (now - s.lastBeatAt > TTL_MS) r.sessions.delete(uid);
  }

  const live = Array.from(r.sessions.values()).filter(
    (s) => s.user.id !== excludeUserId,
  );
  const phantom = phantomState(scopeId, now);

  // Comments that auto-expire from phantom timeline are filtered here too.
  // Real comments persist until dismissed.
  const realComments = r.comments;

  return {
    scopeId,
    sessions: [...live, ...phantom.sessions],
    comments: [...realComments, ...phantom.comments],
  };
}

/**
 * Normalize a URL into a scope ID. We strip query strings and trailing
 * slashes so two execs viewing the same page collide on the same key
 * regardless of how they navigated there.
 */
export function normalizeScope(url: string): string {
  try {
    const u = new URL(url, "http://x.local");
    let p = u.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return url || "/";
  }
}
