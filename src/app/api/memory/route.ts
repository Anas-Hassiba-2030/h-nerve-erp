// GET /api/memory?module=DAIRY&limit=50
//
// The JSON surface behind the Memory Lake (Phase 6). The /brain/memory
// page renders memories server-side; this route exposes the same data to
// non-SSR callers — the mobile recall view, the conversational overlay,
// and any external client that wants "what does the brain remember".
//
// The Memory model is a GROUP-WIDE lake (no per-tenant column — analogies
// are most useful when they cross unit boundaries), so the route does not
// scope by tenant. It DOES require a caller: an authenticated operator
// (session cookie) or a machine bearing the CRON_SECRET bearer token.
// Anything anonymous gets 401 — memories are operational intelligence.
//
// Phase 6 of docs/governance/PHASES-INTELLIGENCE.md.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isCronAuthorized } from "@/lib/auth/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const machineOk = isCronAuthorized(req.headers.get("authorization"));
  if (!user && !machineOk) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const moduleFilter = req.nextUrl.searchParams.get("module")?.trim() || null;
  const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
  const take = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
    : 50;

  const rows = await prisma.memory.findMany({
    where: moduleFilter ? { module: moduleFilter } : {},
    orderBy: { occurredAt: "desc" },
    take,
  });

  const memories = rows.map((m) => ({
    id: m.id,
    occurredAt: m.occurredAt,
    module: m.module,
    headline: { ar: m.headlineAr, en: m.headlineEn },
    body: { ar: m.bodyAr, en: m.bodyEn },
    lesson: { ar: m.lessonAr, en: m.lessonEn },
    tags: safeStringArray(m.tagsJson),
    outcome:
      m.outcomeMetric != null
        ? { metric: m.outcomeMetric, delta: m.outcomeDelta ?? 0 }
        : null,
  }));

  return NextResponse.json({ count: memories.length, memories });
}

function safeStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
