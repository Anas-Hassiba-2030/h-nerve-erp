// app/m/me — Mobile account screen.
//
// The "Me" bottom-nav tab. Identity at a glance, a one-tap language
// switch (the only preference that matters on the phone), a link to the
// full desktop account page, and sign-out. Wired to the real handlers:
// setLocale (app/actions/preferences) and the /logout route.

import Link from "next/link";
import { ArrowLeft, ArrowRight, LogOut, Languages, Settings2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { setLocale } from "@/app/actions/preferences";
import { MobileTopbar } from "@/components/mobile/MobileTopbar";
import { MobileNav } from "@/components/mobile/MobileNav";

export const dynamic = "force-dynamic";

const ROLE_AR: Record<string, string> = {
  ADMIN: "مدير النظام", EXECUTIVE: "تنفيذي", MANAGER: "مدير", STAFF: "موظف",
};

export default async function MobileMePage() {
  const session = await requireUser();
  const ar = getLocale() === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, email: true, role: true },
  });
  const name = user?.name?.trim() || (ar ? "مستخدم" : "User");
  const initial = name.charAt(0).toUpperCase();
  const role = user?.role ?? session.role;
  const nextLocale = ar ? "en" : "ar";

  return (
    <div className="m-screen">
      <MobileTopbar
        greeting={ar ? "حسابي" : "My account"}
        dateline={ar ? "أنت" : "You"}
        ar={ar}
      />

      <main className="m-main">
        {/* Identity */}
        <section className="m-section">
          <div className="m-me-id">
            <span aria-hidden className="m-me-avatar">{initial}</span>
            <div className="m-me-idtext">
              <h2 className="m-me-name">{name}</h2>
              {user?.email ? <p className="m-me-sub">{user.email}</p> : null}
              <p className="m-me-sub">{ar ? ROLE_AR[role] ?? role : role}</p>
            </div>
          </div>
        </section>

        {/* Preferences + actions */}
        <section className="m-section">
          <div className="m-section-head">
            <div className="m-section-title-row">
              <h2 className="m-section-title">{ar ? "الإعدادات" : "Settings"}</h2>
            </div>
          </div>

          <div className="m-cards">
            {/* Language switch — posts to setLocale, flips ar ⇄ en. */}
            <form action={setLocale} className="m-me-row">
              <input type="hidden" name="locale" value={nextLocale} />
              <button type="submit" className="m-me-action">
                <Languages className="h-4 w-4" strokeWidth={1.5} />
                <span className="m-me-action-label">
                  {ar ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
                </span>
                <Arrow className="h-3.5 w-3.5 m-card-arrow" strokeWidth={1.5} />
              </button>
            </form>

            {/* Full desktop account page. */}
            <Link href="/me" className="m-me-action">
              <Settings2 className="h-4 w-4" strokeWidth={1.5} />
              <span className="m-me-action-label">
                {ar ? "كل الإعدادات" : "All settings"}
              </span>
              <Arrow className="h-3.5 w-3.5 m-card-arrow" strokeWidth={1.5} />
            </Link>

            {/* Sign out — GET on /logout destroys the session (303 → /login). */}
            <Link href="/logout" prefetch={false} className="m-me-action m-me-action-danger">
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              <span className="m-me-action-label">{ar ? "تسجيل الخروج" : "Sign out"}</span>
              <Arrow className="h-3.5 w-3.5 m-card-arrow" strokeWidth={1.5} />
            </Link>
          </div>
        </section>

        <p className="m-foot">H-Nerve</p>
      </main>

      <MobileNav ar={ar} />
    </div>
  );
}
