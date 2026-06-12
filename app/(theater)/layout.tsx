// (theater) route group — fullscreen takeover for Decision Theater (Phase 9).
//
// Auth-gated like (app), but renders WITHOUT the sidebar/footer/FAB chrome.
// The user steps out of the dashboard and into a magazine spread; pressing
// ESC takes them back where they came from.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { readFlash } from "@/lib/utils/toast";

export default async function TheaterLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
  if (!dbUser) redirect("/logout");

  const initialFlash = await readFlash();
  return (
    <div
      className="theater-shell min-h-screen"
      style={{
        background: "#faf6ee",
        color: "#1a1410",
      }}
    >
      {children}
      <ToastProvider initialFlash={initialFlash} />
    </div>
  );
}
