// lib/workspace.ts — active-company "workspace" context (Phase C).
//
// Cookie-driven, like lib/tenancy.ts. When a workspace is active, the
// scoped Prisma client (lib/db.ts) auto-filters the allow-listed models
// to that company. With NO cookie set, the app behaves byte-identically
// to pre-Phase-C — that invariant is the pitch-safety guarantee.

import { cookies } from "next/headers";

export const WORKSPACE_COOKIE = "h_nerve_workspace";

/**
 * Active company id, or null. Safe to call ANYWHERE: in non-request
 * contexts (prisma/seed.ts, build-time) `cookies()` throws — we treat
 * that as "no workspace" so seeds and builds are never scoped.
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
  try {
    return (await cookies()).get(WORKSPACE_COOKIE)?.value || null;
  } catch {
    // Non-request context (MCP server, seed, build). Allow an explicit
    // workspace via env so a standalone process can run tenant-scoped.
    // With no env set this stays null → byte-identical pass-through.
    return process.env.H_NERVE_MCP_WORKSPACE || null;
  }
}
