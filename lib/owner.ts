// lib/owner.ts — the product owner(s) who are always ADMIN.
//
// The login page's signup makes only the FIRST account an admin; everyone
// after is STAFF. The owner signed up after others, so their account was
// STAFF and hit permission walls. This list guarantees the owner is treated
// as ADMIN on login (and their row is promoted), regardless of signup order.
//
// Configure extra owners with the OWNER_EMAILS env var (comma-separated).

const BUILT_IN_OWNERS = ["anashasiba91@gmail.com"];

export function ownerEmails(): Set<string> {
  const fromEnv = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BUILT_IN_OWNERS.map((e) => e.toLowerCase()), ...fromEnv]);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerEmails().has(email.trim().toLowerCase());
}
