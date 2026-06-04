// Role-based access helpers — sit on top of `requireUser` so existing actions
// keep working without changes. Adopt incrementally per action.
//
// Hierarchy (low → high): STAFF < MANAGER < EXECUTIVE < ADMIN
// `requireRole("MANAGER")` accepts MANAGER, EXECUTIVE, and ADMIN.

import { requireUser, type SessionUser } from "@/lib/auth/session";

export type Role = "ADMIN" | "EXECUTIVE" | "MANAGER" | "STAFF";

const HIERARCHY: Record<Role, number> = {
  STAFF: 1,
  MANAGER: 2,
  EXECUTIVE: 3,
  ADMIN: 4,
};

function levelOf(role: string | null | undefined): number {
  return HIERARCHY[(role as Role) ?? "STAFF"] ?? 0;
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function hasRole(
  user: { role: string } | null | undefined,
  required: Role | Role[],
): boolean {
  if (!user) return false;
  const userLevel = levelOf(user.role);
  const list = Array.isArray(required) ? required : [required];
  // Any role in the list with a level ≤ user's level satisfies the check.
  // Equivalent to: user passes if their level meets the LOWEST required.
  const minRequired = Math.min(...list.map((r) => HIERARCHY[r] ?? 99));
  return userLevel >= minRequired;
}

export function isAdmin(user: { role: string } | null | undefined): boolean {
  return user?.role === "ADMIN";
}

// Returns the session user if their role is at least `required`, otherwise
// throws ForbiddenError. Use in server actions / route handlers.
export async function requireRole(required: Role | Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, required)) {
    throw new ForbiddenError(
      `Required role: ${Array.isArray(required) ? required.join(" or ") : required}; got: ${user.role}`,
    );
  }
  return user;
}

// Same as `requireRole` but returns `null` instead of throwing — useful for
// conditionally rendering admin-only UI in server components.
export async function getUserIfRole(
  required: Role | Role[],
): Promise<SessionUser | null> {
  const user = await requireUser().catch(() => null);
  if (!user) return null;
  return hasRole(user, required) ? user : null;
}

// Pure ID-shape guard. Prisma cuid IDs are alphanumeric ~25 chars; cuid2 is
// similar. Accept both plus generic short safe IDs. Reject anything that looks
// like a path traversal, SQL fragment, or unicode oddity slipping through.
export function isSafeId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  if (id.length < 1 || id.length > 64) return false;
  return /^[A-Za-z0-9_-]+$/.test(id);
}
