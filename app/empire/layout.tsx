// app/empire/layout.tsx — Phase 19 holding-company god-view.
//
// /empire is a top-level "step-out" boardroom — it lives OUTSIDE the (app)
// operator chrome on purpose (the doc: "the boardroom of boardrooms"). Since
// it doesn't inherit the (app) layout's auth gate, this layout owns it: a
// signed-out visitor is bounced to /login, and anyone below EXECUTIVE is sent
// back to their dashboard (the cross-tenant rollup is owner-only).
//
// The <html dir lang> already comes from the root layout; nothing to set here
// beyond the gate.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/authz";

export default async function EmpireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, "EXECUTIVE")) redirect("/dashboard");
  return <>{children}</>;
}
