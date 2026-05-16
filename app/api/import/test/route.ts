// app/api/import/test/route.ts
//
//   POST /api/import/test
//   Authorization: Bearer <IMPORT_API_TOKEN>
//   Body: { records: object[], source?: string }   (or a bare array)
//   →  200 { accepted, rejected, errors }
//
// A Bearer-authenticated external ingestion test endpoint. Each record
// must be a non-null, non-array object with at least one key; anything
// else is rejected with a reason. Every call writes one ImportLog row
// (best-effort — logging never blocks the response). SQLite as-is; no
// schema datasource changes.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prismaUnscoped } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportError = { index: number; error: string };

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  // --- Bearer auth ---
  const expected = process.env.IMPORT_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "import endpoint not configured (IMPORT_API_TOKEN unset)" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m || !tokenMatches(m[1], expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // --- Body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }

  let records: unknown[];
  let source: string | null = null;
  if (Array.isArray(body)) {
    records = body;
  } else if (
    body &&
    typeof body === "object" &&
    Array.isArray((body as any).records)
  ) {
    records = (body as any).records;
    const s = (body as any).source;
    source = typeof s === "string" ? s.slice(0, 120) : null;
  } else {
    return NextResponse.json(
      { error: "expected an array or { records: [...] }" },
      { status: 400 },
    );
  }

  // --- Validate each record ---
  const errors: ImportError[] = [];
  let accepted = 0;
  records.forEach((rec, index) => {
    if (rec === null || typeof rec !== "object" || Array.isArray(rec)) {
      errors.push({ index, error: "record must be a non-array object" });
      return;
    }
    if (Object.keys(rec as object).length === 0) {
      errors.push({ index, error: "record is empty" });
      return;
    }
    accepted++;
  });
  const rejected = errors.length;
  const status =
    accepted > 0 && rejected > 0
      ? "PARTIAL"
      : rejected > 0
        ? "REJECTED"
        : "OK";

  // --- Audit row (never blocks the response) ---
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    await prismaUnscoped.importLog.create({
      data: {
        endpoint: "test",
        source,
        accepted,
        rejected,
        // Cap stored errors so a huge bad batch can't bloat the row.
        errors: errors.length ? JSON.stringify(errors.slice(0, 100)) : null,
        status,
        ip,
      },
    });
  } catch {
    /* logging is best-effort — the import result still returns */
  }

  return NextResponse.json({ accepted, rejected, errors }, { status: 200 });
}
