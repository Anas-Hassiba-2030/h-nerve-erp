// PATCH /api/protocol/[id] — Phase 20 Living Protocol.
//
// Edits a clause body (and optional English mirror) and bumps its version —
// the "living" part of the constitution. ADMIN only.
//
// The id may be a real persisted cuid OR a "seed:<key>" placeholder for a
// clause that exists only as a default (not yet written to the DB). For the
// seed case we upsert by (tenantId, key) so the first admin edit persists it.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin, isSafeId } from "@/lib/auth/authz";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { DEFAULT_PROTOCOL_CLAUSES } from "@/lib/protocol/clauses";

export const dynamic = "force-dynamic";

const MAX_BODY = 4000;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const bodyEn =
    typeof payload?.bodyEn === "string" ? payload.bodyEn.trim() : undefined;
  if (!body) {
    return NextResponse.json({ error: "BODY_REQUIRED" }, { status: 400 });
  }
  if (body.length > MAX_BODY || (bodyEn && bodyEn.length > MAX_BODY)) {
    return NextResponse.json({ error: "BODY_TOO_LONG" }, { status: 400 });
  }

  const id = params.id;
  const tenantId = getActiveTenantSlug() ?? "default";

  try {
    // Seed-only placeholder → upsert by (tenantId, key) so the edit persists.
    if (id.startsWith("seed:")) {
      const key = id.slice(5);
      const def = DEFAULT_PROTOCOL_CLAUSES.find((c) => c.key === key);
      if (!def) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      const row = await prisma.protocolClause.upsert({
        where: { tenantId_key: { tenantId, key } },
        create: {
          tenantId,
          key,
          title: def.title,
          titleEn: def.titleEn,
          body,
          bodyEn: bodyEn ?? def.bodyEn,
          orderIndex: def.orderIndex,
          version: 2, // seed was v1; first persisted edit is v2
        },
        update: {
          body,
          ...(bodyEn !== undefined ? { bodyEn } : {}),
          version: { increment: 1 },
        },
      });
      return NextResponse.json({ clause: serialize(row) });
    }

    if (!isSafeId(id)) {
      return NextResponse.json({ error: "BAD_ID" }, { status: 400 });
    }
    const row = await prisma.protocolClause.update({
      where: { id },
      data: {
        body,
        ...(bodyEn !== undefined ? { bodyEn } : {}),
        version: { increment: 1 },
      },
    });
    return NextResponse.json({ clause: serialize(row) });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: e?.message ?? "unknown" },
      { status: 500 },
    );
  }
}

function serialize(r: {
  id: string;
  key: string;
  title: string;
  titleEn: string | null;
  body: string;
  bodyEn: string | null;
  orderIndex: number;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    key: r.key,
    title: r.title,
    titleEn: r.titleEn,
    body: r.body,
    bodyEn: r.bodyEn,
    orderIndex: r.orderIndex,
    version: r.version,
    updatedAt: r.updatedAt.toISOString(),
  };
}
