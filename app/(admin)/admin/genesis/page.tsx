// /admin/genesis — Phase 21 (Genesis Seed).
//
// First-run onboarding wizard that promotes `npm run db:seed` to a UI moment.
// Reads entity counts to determine whether the workspace is empty or already
// populated, then offers the appropriate CTA — "Seed workspace" for the blank
// state, "Re-seed from scratch" (destructive, red) for an existing dataset.
//
// Aesthetic: Sleek Operator (DESIGN-SKILL §1.F) — cyan on near-black.
// See docs/PHASES-INTELLIGENCE.md § Phase 21.

import { Sprout, CheckCircle2 } from "lucide-react";
import { prismaUnscoped } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { runGenesisSeed } from "./actions";

export const dynamic = "force-dynamic";

// CROSS-TENANT INTENT: genesis needs raw counts across the entire database.
const db = prismaUnscoped;

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export default async function GenesisPage({
  searchParams,
}: {
  searchParams: { seeded?: string };
}) {
  const ar = getLocale() === "ar";
  const justSeeded = searchParams.seeded === "1";

  const [companies, hotels, users, insights, brainEdges] = await Promise.all([
    safeCount(() => db.company.count()),
    safeCount(() => db.hotel.count()),
    safeCount(() => db.user.count()),
    safeCount(() => db.aIInsight.count()),
    safeCount(() => db.brainEdge.count()),
  ]);

  const isEmpty = companies === 0 && hotels === 0 && users === 0;
  const totalEntities = companies + hotels + users + insights + brainEdges;

  return (
    <div className="admin-page admin-page-narrow">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="admin-page-head">
        <div>
          <span className="admin-eyebrow">SUPERADMIN · PHASE 21</span>
          <h1 className="admin-h1">{ar ? "بداية مساحة العمل" : "Workspace Genesis"}</h1>
          <p className="admin-sub">
            {ar
              ? "ابذُر بيانات مجموعة الحوراني التجريبية في خطوة واحدة: فنادق، شركات، مستخدمون، ذاكرة دماغ. تحوّل النظام الفارغ إلى بيئة تجريبية كاملة."
              : "Seed the Hourani demo dataset in one click: hotels, companies, users, brain memory. Turns an empty system into a fully functional demo environment."}
          </p>
        </div>
      </div>

      {/* ── Success banner ─────────────────────────────────────────────── */}
      {justSeeded && (
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            padding: "16px 20px",
            background: "rgba(35, 99, 67, 0.12)",
            border: "1px solid rgba(35, 99, 67, 0.35)",
            borderRadius: 8,
          }}
        >
          <CheckCircle2 size={20} style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 14 }}>
              {ar ? "تمت عملية البذر بنجاح" : "Seeded successfully"}
            </div>
            <div style={{ color: "var(--admin-text-muted)", fontSize: 13, marginTop: 3, lineHeight: 1.55 }}>
              {ar
                ? "بيانات مجموعة الحوراني جاهزة. ادخل بـ admin@hourani.jo / admin123"
                : "Hourani demo data is ready. Sign in with admin@hourani.jo / admin123"}
            </div>
          </div>
        </div>
      )}

      {/* ── Entity counts ──────────────────────────────────────────────── */}
      <div className="admin-stats">
        {[
          { label: ar ? "شركات" : "Companies", value: companies, accent: companies > 0 ? "cyan" : undefined },
          { label: ar ? "فنادق" : "Hotels", value: hotels, accent: hotels > 0 ? "cyan" : undefined },
          { label: ar ? "مستخدمون" : "Users", value: users, accent: users > 0 ? "cyan" : undefined },
          { label: ar ? "إشارات الدماغ" : "Brain insights", value: insights, accent: undefined },
          { label: ar ? "روابط سببية" : "Causal edges", value: brainEdges, accent: undefined },
        ].map(({ label, value, accent }) => (
          <div key={label} className="admin-stat-tile">
            <span className="admin-stat-label">{label}</span>
            <span
              className="admin-stat-value"
              data-accent={accent}
            >
              {value.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </div>

      {/* ── Action panel ───────────────────────────────────────────────── */}
      {isEmpty ? (
        <div
          style={{
            background: "var(--admin-bg-2)",
            border: "1px solid var(--admin-rule-strong)",
            borderRadius: 12,
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 10.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--admin-cyan)",
              marginBottom: 12,
            }}
          >
            {ar ? "مساحة العمل فارغة — جاهزة للبذر" : "Empty workspace — ready to seed"}
          </div>
          <p
            style={{
              color: "var(--admin-text-muted)",
              fontSize: 13.5,
              lineHeight: 1.65,
              marginBottom: 20,
              maxWidth: "56ch",
            }}
          >
            {ar
              ? "سيُنشئ البذر: 4 شركات، 3 فنادق، 200+ غرفة، دفعات ألبان، محاصيل، مستودعات، توريد، تنبؤات، إشارات دماغ وذاكرة سببية، ومستخدمون بكلمة مرور admin123."
              : "Seeding creates: 4 companies, 3 hotels, 200+ rooms, dairy batches, crops, warehouses, supply forecasts, brain insights and causal memory, and users (password: admin123)."}
          </p>
          <form action={runGenesisSeed}>
            <button type="submit" className="admin-cta-primary">
              <Sprout size={15} />
              {ar ? "ابذُر مساحة العمل" : "Seed workspace"}
            </button>
          </form>
        </div>
      ) : (
        <div
          style={{
            background: "var(--admin-bg-2)",
            border: "1px solid var(--admin-rule-strong)",
            borderRadius: 12,
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 10.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--admin-text-muted)",
              marginBottom: 12,
            }}
          >
            {ar ? "مساحة العمل تحتوي على بيانات" : "Workspace contains data"}
          </div>
          <p
            style={{
              color: "var(--admin-text-muted)",
              fontSize: 13.5,
              lineHeight: 1.65,
              marginBottom: 8,
              maxWidth: "56ch",
            }}
          >
            {ar
              ? `الإجمالي: ${totalEntities.toLocaleString("en-US")} سجل. إعادة البذر ستمحو جميع البيانات الحالية وتستبدلها ببيانات الحوراني التجريبية — هذا الإجراء لا يمكن التراجع عنه.`
              : `Total: ${totalEntities.toLocaleString("en-US")} records. Re-seeding will wipe all current data and replace it with the Hourani demo dataset — this action cannot be undone.`}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#ff6b6b",
              marginBottom: 20,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.04em",
            }}
          >
            ⚠ {ar ? "تحذير: سيتم حذف جميع البيانات الحالية" : "WARNING: ALL CURRENT DATA WILL BE DELETED"}
          </p>
          <form action={runGenesisSeed}>
            <button type="submit" className="admin-btn-danger">
              {ar ? "إعادة البذر من الصفر" : "Re-seed from scratch"}
            </button>
          </form>
        </div>
      )}

      {/* ── Default credentials cheat-sheet ────────────────────────────── */}
      <div
        style={{
          background: "var(--admin-bg-2)",
          border: "1px solid var(--admin-rule)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--admin-text-muted)",
            marginBottom: 14,
          }}
        >
          {ar ? "بيانات الدخول الافتراضية" : "Default credentials (after seed)"}
        </div>
        {[
          { email: "admin@hourani.jo",    role: ar ? "ملك ♚ · مدير عام" : "King ♚ · Admin" },
          { email: "ceo@hourani.jo",      role: ar ? "ملك ♚ · رئيس تنفيذي" : "King ♚ · CEO" },
          { email: "staff@hourani.jo",    role: ar ? "فيل ♝ · موظف" : "Bishop ♝ · Staff" },
          { email: "newhire@hourani.jo",  role: ar ? "بيدق ♟ · موظف جديد" : "Pawn ♟ · New hire" },
        ].map(({ email, role }) => (
          <div
            key={email}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 16,
              padding: "8px 0",
              borderBottom: "1px solid var(--admin-rule)",
              fontSize: 12.5,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: "var(--admin-cyan)",
                fontSize: 12,
              }}
            >
              {email}
            </span>
            <span style={{ color: "var(--admin-text-muted)" }}>{role}</span>
          </div>
        ))}
        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--admin-text-muted)",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {ar ? "كلمة المرور لجميع الحسابات:" : "Password for all accounts:"}{" "}
          <span style={{ color: "var(--admin-text)" }}>admin123</span>
        </div>
      </div>
    </div>
  );
}
