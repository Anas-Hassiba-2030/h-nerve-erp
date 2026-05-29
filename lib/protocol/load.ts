// lib/protocol/load.ts — Phase 20 Living Protocol server loader.
//
// Shared by GET /api/protocol and app/protocol/page.tsx so the read path
// (scoped query + tolerant seed fallback) lives in exactly one place. Reads
// through the scoped `prisma` client — ProtocolClause is in
// TENANT_SCOPED_MODELS, so it auto-filters by the active tenant.

import { prisma } from "@/lib/db";
import { DEFAULT_PROTOCOL_CLAUSES } from "./clauses";

export type ProtocolClauseDTO = {
  id: string;
  key: string;
  title: string;
  titleEn: string | null;
  body: string;
  bodyEn: string | null;
  orderIndex: number;
  version: number;
  updatedAt: string | null;
  seedOnly?: boolean; // true when this is an un-persisted fallback clause
};

function fallback(): ProtocolClauseDTO[] {
  return DEFAULT_PROTOCOL_CLAUSES.map((c) => ({
    id: `seed:${c.key}`,
    key: c.key,
    title: c.title,
    titleEn: c.titleEn,
    body: c.body,
    bodyEn: c.bodyEn,
    orderIndex: c.orderIndex,
    version: 1,
    updatedAt: null,
    seedOnly: true,
  }));
}

/**
 * Load the active tenant's constitution. Persisted rows win; an empty table or
 * a not-yet-migrated DB (P2021) falls back to the seed clauses so /protocol
 * always renders. `fallback` flags that the result is the un-persisted seed.
 */
export async function getProtocolClauses(): Promise<{
  clauses: ProtocolClauseDTO[];
  fallback: boolean;
}> {
  try {
    const rows = await prisma.protocolClause.findMany({
      orderBy: { orderIndex: "asc" },
    });
    if (rows.length === 0) return { clauses: fallback(), fallback: true };
    return {
      clauses: rows.map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        titleEn: r.titleEn,
        body: r.body,
        bodyEn: r.bodyEn,
        orderIndex: r.orderIndex,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
      })),
      fallback: false,
    };
  } catch {
    return { clauses: fallback(), fallback: true };
  }
}
