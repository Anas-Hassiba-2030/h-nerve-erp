// app/api/realtime/route.ts
//
// Realtime presence endpoint.
//
//   POST  body { scopeId, user, cursor?, typing? }    → write own state
//   GET   ?scopeId=&userId=                            → read peers
//   POST  body { scopeId, user, comment: { ... } }    → post a comment
//   DELETE body { scopeId, commentId }                → dismiss a comment
//
// Phase 17 of docs/governance/PHASES-INTELLIGENCE.md.

import { NextRequest, NextResponse } from "next/server";
import {
  beat,
  dismissComment,
  normalizeScope,
  postComment,
  readScope,
} from "@/lib/realtime/realtime";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const rawScope = url.searchParams.get("scopeId") ?? "/";
  const userId = url.searchParams.get("userId") ?? user.id;
  const scopeId = normalizeScope(rawScope);

  const state = readScope(scopeId, userId);
  return NextResponse.json(state, {
    headers: {
      // Keep the polling loop snappy — never let a CDN cache this.
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const scopeId = normalizeScope(String(body?.scopeId ?? "/"));
  const rtUser = body?.user;
  if (!rtUser?.id) {
    return NextResponse.json({ error: "user.id required" }, { status: 400 });
  }

  // Branch — comment vs heartbeat
  if (body?.comment) {
    const c = postComment({
      scopeId,
      user: rtUser,
      body: String(body.comment.body ?? ""),
      anchorX: Number(body.comment.anchorX ?? 0.5),
      anchorY: Number(body.comment.anchorY ?? 0.5),
    });
    return NextResponse.json({ comment: c });
  }

  beat({
    scopeId,
    userId: rtUser.id,
    user: rtUser,
    cursor: body?.cursor,
    typing: body?.typing,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const scopeId = normalizeScope(String(body?.scopeId ?? "/"));
  const commentId = String(body?.commentId ?? "");
  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }
  dismissComment(scopeId, commentId);
  return NextResponse.json({ ok: true });
}
