// app/api/realtime/stream/route.ts
//
// W8 (Phase 17) — the real-time READ path as Server-Sent Events.
//
//   GET ?scopeId=&userId=  → text/event-stream
//     · pushes the full RTScopeState immediately on connect
//     · re-pushes whenever anyone beats / comments / dismisses on
//       this scope (via lib/realtime subscribe/notify)
//     · ": keepalive" comment every 20s so proxies (and Vercel's
//       infra) don't kill the idle connection
//     · drops its subscription when the client disconnects
//
// Writes still go to POST /api/realtime (SSE is server→client only).
// A raw WebSocket would need a long-lived socket server the
// Next.js/Vercel runtime doesn't provide; SSE delivers the same
// sub-second outcome on the existing stack.

import { NextRequest } from "next/server";
import { normalizeScope, readScope, subscribe } from "@/lib/realtime";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEPALIVE_MS = 20_000;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const url = new URL(req.url);
  const scopeId = normalizeScope(url.searchParams.get("scopeId") ?? "/");
  const userId = url.searchParams.get("userId") ?? user.id;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      let keepAlive: ReturnType<typeof setInterval> | null = null;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed (client vanished mid-write) —
          // tear down so we don't leak the subscription.
          cleanup();
        }
      };

      const pushState = () => {
        safeEnqueue(
          `data: ${JSON.stringify(readScope(scopeId, userId))}\n\n`,
        );
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (keepAlive) clearInterval(keepAlive);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Client gone (tab closed / navigated away) → release everything.
      if (req.signal.aborted) {
        cleanup();
        return;
      }
      req.signal.addEventListener("abort", cleanup);

      // 1) Immediate snapshot so the UI paints without waiting for an event.
      pushState();
      // 2) Live updates — any mutation on this scope re-pushes.
      unsubscribe = subscribe(scopeId, pushState);
      // 3) Heartbeat the stream itself so idle connections survive proxies.
      keepAlive = setInterval(() => safeEnqueue(`: keepalive\n\n`), KEEPALIVE_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Disable proxy/CDN buffering so events flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
