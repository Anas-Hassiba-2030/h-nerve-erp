// app/protocol/layout.tsx — Phase 20 The Living Protocol.
//
// /protocol is a top-level "manifesto" surface outside the (app) operator
// chrome (Refined Editorial register). It owns its own auth gate: any
// signed-in user may READ the constitution; editing is gated to ADMIN inside
// the page. The <html dir lang> comes from the root layout.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function ProtocolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
