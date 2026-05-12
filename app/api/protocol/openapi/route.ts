// app/api/protocol/openapi/route.ts
//
// Serves the public OpenAPI document for the H-Nerve protocol.
// Phase 20 of docs/PHASES-INTELLIGENCE.md.

import { NextResponse } from "next/server";
import { OPENAPI_DOC } from "@/lib/protocol/spec";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(OPENAPI_DOC, {
    headers: {
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
