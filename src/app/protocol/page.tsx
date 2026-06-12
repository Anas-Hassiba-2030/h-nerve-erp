// app/protocol/page.tsx — Phase 20 The Living Protocol (company constitution).
//
// The self-updating company constitution: a handful of governing clauses that
// every unit operates under. Read-only for everyone; an ADMIN edits any clause
// body inline (each save bumps its version — the "living" part). Refined
// Editorial register, Arabic-first / RTL.
//
// Data is loaded server-side via getProtocolClauses() directly (same loader
// GET /api/protocol wraps) — SSR, no self-fetch. Auth gate is in layout.tsx;
// the ADMIN edit gate is enforced both here (UI) and in PATCH /api/protocol/[id].
//
// Phase 20 of docs/PHASES-INTELLIGENCE.md.

import { ScrollText } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/authz";
import { getProtocolClauses } from "@/lib/protocol/load";
import { ProtocolDoc } from "@/components/protocol/ProtocolDoc";

export const dynamic = "force-dynamic";

export default async function ProtocolPage() {
  const ar = (await getLocale()) === "ar";
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const { clauses, fallback } = await getProtocolClauses();

  return (
    <main className="proto-root">
      <article className="proto-doc">
        <header className="proto-head">
          <div className="proto-mark">
            <ScrollText className="h-3.5 w-3.5" strokeWidth={1.4} />
            <span>{ar ? "البروتوكول الحيّ" : "THE LIVING PROTOCOL"}</span>
          </div>
          <h1 className="proto-title">
            {ar ? "دستور مجموعة الحوراني" : "The Hourani Group Constitution"}
          </h1>
          <p className="proto-lede">
            {ar
              ? "المبادئ الحاكمة التي تعمل بموجبها كل وحدة. وثيقة حيّة — يحدّثها المسؤول، ويُسجَّل كل تعديل بنسخته."
              : "The governing principles every unit operates under. A living document — the admin updates it, and every edit is versioned."}
          </p>
          {admin ? (
            <p className="proto-role-note" data-role="admin">
              {ar
                ? "وضع المسؤول — يمكنك تحرير أي بند مباشرةً."
                : "Admin mode — you can edit any clause inline."}
            </p>
          ) : (
            <p className="proto-role-note">
              {ar ? "عرض للقراءة فقط." : "Read-only view."}
            </p>
          )}
        </header>

        <ProtocolDoc clauses={clauses} ar={ar} admin={admin} />

        {fallback ? (
          <p className="proto-foot">
            {ar
              ? "تُعرض البنود الافتراضية. سيُحفظ أول تعديل من المسؤول في قاعدة البيانات."
              : "Showing the default clauses. The first admin edit persists them to the database."}
          </p>
        ) : null}
      </article>
    </main>
  );
}
