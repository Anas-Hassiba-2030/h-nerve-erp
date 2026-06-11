// app/api/converse/route.ts
//
// HTTP entrypoint for the conversational overlay.
//
// POST /api/converse
//   { sessionId, question, scope?, locale? }
// →
//   { brainTurn, sessionTurns }
//
// The overlay is a client component, so it needs an HTTP endpoint to reach
// the brain. We don't stream tokens at the network layer — the UI does its
// own line-by-line reveal animation. The brain returns the full answer
// in one POST.

import { NextRequest, NextResponse } from "next/server";
import { ask } from "@/lib/brain/converse";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/import/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Cost/abuse guard: this endpoint calls the LLM on every request, so cap it
  // per user. Fixed window, in-memory (per-process; swap for Redis at scale).
  const rl = rateLimit(`converse:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "طلبات كثيرة. انتظر لحظة. · Too many requests, wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const sessionId = String(body?.sessionId ?? "").trim();
  const question = String(body?.question ?? "").trim();
  const scope = String(body?.scope ?? "default").trim() || "default";
  const locale: "ar" | "en" =
    body?.locale === "en" ? "en" : "ar";

  if (!sessionId || !question) {
    return NextResponse.json(
      { error: "sessionId and question are required" },
      { status: 400 },
    );
  }
  if (question.length > 800) {
    return NextResponse.json(
      { error: "question too long (max 800 chars)" },
      { status: 413 },
    );
  }

  try {
    const result = await ask({ sessionId, question, scope, locale });
    return NextResponse.json({
      brainTurn: result.brainTurn,
      sessionTurns: result.session.turns,
    });
  } catch (e) {
    // The brain can fail (LLM provider down, DB hiccup). Don't let it surface
    // as an unhandled 500 with a framework stack — log server-side, return a
    // generic error the overlay can show calmly.
    console.error("[converse] ask failed:", e);
    return NextResponse.json({ error: "brain_unavailable" }, { status: 500 });
  }
}
