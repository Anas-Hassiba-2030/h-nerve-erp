// /api/search?q= — Phase 10 universal search endpoint. Authed (any
// signed-in user; the deep-link targets are themselves RBAC-gated by
// middleware on navigation). Delegates to lib/universalSearch
// (fail-soft, capped). Used by the ⌘K CommandPalette.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { universalSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await universalSearch(q);
  return NextResponse.json(
    { q, count: hits.length, hits },
    { headers: { "Cache-Control": "no-store" } },
  );
}
