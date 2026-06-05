// /admin/genesis — Phase 21 (Genesis Seed).
//
// First-run onboarding wizard that promotes `npm run db:seed` to a UI moment.
// Reads live entity counts, diffs them against the declarative recipe catalog
// (lib/genesis/recipes.ts), and previews the SHAPE of the demo dataset sector
// by sector — what's present, what a seed will create — before the operator
// commits. Two paths:
//   • Top up demo corpus  — idempotent + non-destructive (safe to re-run).
//   • Re-seed from scratch — destructive, gated behind an explicit ack.
//
// Aesthetic: Sleek Operator (DESIGN-SKILL §1.F) — cyan on near-black.
// See docs/PHASES-INTELLIGENCE.md § Phase 21.

import { Sprout, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { prismaUnscoped } from "@/lib/db/db";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { summarizeGenesis } from "@/lib/genesis/recipes";
import { ConstellationGrid } from "@/components/genesis/Constellation";
import { runGenesisSeed, topUpDemoCorpus, seedMissingGenesis } from "./actions";
import { DangerReseed } from "./DangerReseed";

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
  searchParams: { seeded?: string; topup?: string; error?: string; fill?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const m = getMessages(locale);
  const justSeeded = searchParams.seeded === "1";
  const topup = searchParams.topup;
  const fill = searchParams.fill;
  const confirmError = searchParams.error === "confirm";
  const seedError = searchParams.error === "seed";

  // Live counts for every key the recipe catalog references.
  const [
    companies,
    hotels,
    bookings,
    users,
    insights,
    brainEdges,
    dairyBatches,
    supplyForecasts,
    farms,
    crops,
    programs,
    documents,
  ] = await Promise.all([
    safeCount(() => db.company.count()),
    safeCount(() => db.hotel.count()),
    safeCount(() => db.booking.count()),
    safeCount(() => db.user.count()),
    safeCount(() => db.aIInsight.count()),
    safeCount(() => db.brainEdge.count()),
    safeCount(() => db.dairyBatch.count()),
    safeCount(() => db.supplyForecast.count()),
    safeCount(() => db.farm.count()),
    safeCount(() => db.crop.count()),
    safeCount(() => db.program.count()),
    safeCount(() => db.document.count()),
  ]);

  const counts = {
    companies,
    hotels,
    bookings,
    users,
    insights,
    brainEdges,
    dairyBatches,
    supplyForecasts,
    farms,
    crops,
    programs,
    documents,
  };
  const summary = summarizeGenesis(counts);
  const isEmpty = summary.isEmpty;
  const totalEntities = Object.values(counts).reduce((a, b) => a + b, 0);
  // Sectors with zero presence on every line — the additive path's targets.
  const emptySectors = summary.sectors.filter((s) => s.status === "empty");
  const hasGaps = !isEmpty && emptySectors.length > 0;

  const panel = {
    background: "var(--admin-bg-2)",
    border: "1px solid var(--admin-rule-strong)",
    borderRadius: 12,
    padding: "24px 28px",
  } as const;
  const eyebrow = {
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 10.5,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    marginBottom: 12,
  };

  return (
    <div className="admin-page admin-page-narrow">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.genesis"]}</span>
          <h1 className="admin-h1">{ar ? "بداية مساحة العمل" : "Workspace Genesis"}</h1>
          <p className="admin-sub">
            {ar
              ? "عاين شكل بيانات مجموعة الحوراني التجريبية قبل إنشائها — قطاعاً بقطاع — ثم ابذُرها بأمان من داخل المنتج."
              : "Preview the shape of the Hourani demo dataset before it's created — sector by sector — then seed it safely from inside the product."}
          </p>
        </div>
      </div>

      {/* ── Status banners ─────────────────────────────────────────────── */}
      {justSeeded && (
        <Banner
          color="#4ade80"
          icon={<CheckCircle2 size={20} style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }} />}
          title={ar ? "تمت عملية البذر بنجاح" : "Seeded successfully"}
          body={ar ? "بيانات مجموعة الحوراني جاهزة. ادخل بـ admin@hourani.jo / admin123" : "Hourani demo data is ready. Sign in with admin@hourani.jo / admin123"}
        />
      )}
      {topup && (
        <Banner
          color={topup === "error" ? "#ff6b6b" : "#4ade80"}
          icon={<FileText size={20} style={{ color: topup === "error" ? "#ff6b6b" : "#4ade80", flexShrink: 0, marginTop: 1 }} />}
          title={
            topup === "skip"
              ? ar ? "لا حاجة للتحديث" : "Nothing to top up"
              : topup === "error"
                ? ar ? "تعذّر التحديث" : "Top-up failed"
                : ar ? "تمت إضافة المستندات" : "Demo corpus added"
          }
          body={
            topup === "skip"
              ? ar ? "توجد مستندات بالفعل — لم يتم تغيير أي شيء." : "Documents already present — nothing was changed."
              : topup === "error"
                ? ar ? "حدث خطأ غير متوقع. حاول مرة أخرى." : "An unexpected error occurred. Try again."
                : ar ? `تمت إضافة ${topup} مستند مرجعي للدماغ.` : `Added ${topup} reference documents for the brain.`
          }
        />
      )}
      {confirmError && (
        <Banner
          color="#fbbf24"
          icon={<AlertTriangle size={20} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />}
          title={ar ? "لم يتم تأكيد الحذف" : "Wipe not confirmed"}
          body={ar ? "يجب تأكيد المربع قبل إعادة البذر المدمّرة." : "You must tick the acknowledgement before a destructive reseed."}
        />
      )}
      {seedError && (
        <Banner
          color="#ff6b6b"
          icon={<AlertTriangle size={20} style={{ color: "#ff6b6b", flexShrink: 0, marginTop: 1 }} />}
          title={ar ? "فشلت إعادة البذر" : "Reseed failed"}
          body={ar ? "حدث خطأ أثناء إعادة بناء البيانات. حاول مرة أخرى." : "An error occurred while rebuilding the dataset. Try again."}
        />
      )}
      {fill && (
        <Banner
          color={fill === "error" ? "#ff6b6b" : "#4ade80"}
          icon={<Sprout size={20} style={{ color: fill === "error" ? "#ff6b6b" : "#4ade80", flexShrink: 0, marginTop: 1 }} />}
          title={
            fill === "skip"
              ? ar ? "لا توجد قطاعات ناقصة" : "No missing sectors"
              : fill === "error"
                ? ar ? "تعذّر الإكمال" : "Fill failed"
                : ar ? "تم إكمال القطاعات الناقصة" : "Missing sectors filled"
          }
          body={
            fill === "skip"
              ? ar ? "كل قطاع يحتوي على بيانات بالفعل — لم يتم تغيير أي شيء." : "Every sector already has data — nothing was changed."
              : fill === "error"
                ? ar ? "حدث خطأ غير متوقع. حاول مرة أخرى." : "An unexpected error occurred. Try again."
                : ar ? `تمت إضافة بيانات ${fill} قطاع ناقص دون حذف أي شيء.` : `Added data for ${fill} empty sector(s) without deleting anything.`
          }
        />
      )}

      {/* ── Sector preview (the constellations) ────────────────────────── */}
      <ConstellationGrid summary={summary} ar={ar} />

      {/* ── Idempotent top-up (safe) ───────────────────────────────────── */}
      <div style={panel}>
        <div style={{ ...eyebrow, color: "var(--admin-cyan)" }}>
          {ar ? "تحديث آمن — غير مدمّر" : "Safe top-up — non-destructive"}
        </div>
        <p style={{ color: "var(--admin-text-muted)", fontSize: 13.5, lineHeight: 1.65, marginBottom: 18, maxWidth: "56ch" }}>
          {ar
            ? `يضيف مجموعة المستندات المرجعية للدماغ فقط إذا كانت مساحة العمل خالية منها (حالياً: ${documents.toLocaleString("en-US")}). آمن للتكرار — لا يلمس أي مستند رفعه المستخدم.`
            : `Adds the brain's reference document corpus only when the workspace has none (currently: ${documents.toLocaleString("en-US")}). Safe to re-run — never touches a user-uploaded document.`}
        </p>
        <form action={topUpDemoCorpus}>
          <button type="submit" className="admin-cta-primary">
            <FileText size={15} />
            {ar ? "تحديث مجموعة المستندات" : "Top up demo corpus"}
          </button>
        </form>
      </div>

      {/* ── Additive fill (safe, non-destructive) ──────────────────────── */}
      {hasGaps && (
        <div style={panel}>
          <div style={{ ...eyebrow, color: "var(--admin-cyan)" }}>
            {ar ? "إكمال القطاعات الناقصة — غير مدمّر" : "Fill missing sectors — non-destructive"}
          </div>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13.5, lineHeight: 1.65, marginBottom: 18, maxWidth: "56ch" }}>
            {ar
              ? `يوجد ${emptySectors.length} قطاع فارغ: ${emptySectors.map((s) => s.ar).join("، ")}. سيبذر هذا الإجراء القطاعات الفارغة فقط، ويبقي البيانات الحالية كما هي — آمن للتكرار ولا يحذف شيئاً.`
              : `${emptySectors.length} empty sector(s): ${emptySectors.map((s) => s.en).join(", ")}. This seeds only the empty sectors, leaves existing data untouched — safe to re-run, never deletes.`}
          </p>
          <form action={seedMissingGenesis}>
            <button type="submit" className="admin-cta-primary">
              <Sprout size={15} />
              {ar ? "إكمال القطاعات الناقصة" : "Fill missing sectors"}
            </button>
          </form>
        </div>
      )}

      {/* ── Seed / reseed ──────────────────────────────────────────────── */}
      {isEmpty ? (
        <div style={panel}>
          <div style={{ ...eyebrow, color: "var(--admin-cyan)" }}>
            {ar ? "مساحة العمل فارغة — جاهزة للبذر" : "Empty workspace — ready to seed"}
          </div>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13.5, lineHeight: 1.65, marginBottom: 20, maxWidth: "56ch" }}>
            {ar
              ? "سيُنشئ البذر القطاعات الستة أعلاه: شركات، فنادق، غرف، ألبان، مزارع، برامج، ذاكرة الدماغ، ومستخدمون بكلمة مرور admin123."
              : "Seeding creates all six sectors above: companies, hotels, rooms, dairy, farms, programs, brain memory, and users (password: admin123)."}
          </p>
          <form action={runGenesisSeed}>
            {/* Empty workspace — nothing to wipe, so the ack is implicit. */}
            <input type="hidden" name="confirm" value="WIPE" />
            <button type="submit" className="admin-cta-primary">
              <Sprout size={15} />
              {ar ? "ابذُر مساحة العمل" : "Seed workspace"}
            </button>
          </form>
        </div>
      ) : (
        <div style={panel}>
          <div style={{ ...eyebrow, color: "var(--admin-text-muted)" }}>
            {ar ? "مساحة العمل تحتوي على بيانات" : "Workspace contains data"}
          </div>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13.5, lineHeight: 1.65, marginBottom: 8, maxWidth: "56ch" }}>
            {ar
              ? `الإجمالي: ${totalEntities.toLocaleString("en-US")} سجل. إعادة البذر ستمحو جميع البيانات الحالية وتستبدلها ببيانات الحوراني التجريبية — هذا الإجراء لا يمكن التراجع عنه.`
              : `Total: ${totalEntities.toLocaleString("en-US")} records. Re-seeding will wipe all current data and replace it with the Hourani demo dataset — this action cannot be undone.`}
          </p>
          <p style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 20, fontFamily: "'JetBrains Mono', ui-monospace, monospace", letterSpacing: "0.04em" }}>
            ⚠ {ar ? "تحذير: سيتم حذف جميع البيانات الحالية" : "WARNING: ALL CURRENT DATA WILL BE DELETED"}
          </p>
          <DangerReseed ar={ar} total={totalEntities} />
        </div>
      )}

      {/* ── Default credentials cheat-sheet ────────────────────────────── */}
      <div style={{ background: "var(--admin-bg-2)", border: "1px solid var(--admin-rule)", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ ...eyebrow, color: "var(--admin-text-muted)", marginBottom: 14 }}>
          {ar ? "بيانات الدخول الافتراضية" : "Default credentials (after seed)"}
        </div>
        {[
          { email: "admin@hourani.jo", role: ar ? "ملك ♚ · مدير عام" : "King ♚ · Admin" },
          { email: "ceo@hourani.jo", role: ar ? "ملك ♚ · رئيس تنفيذي" : "King ♚ · CEO" },
          { email: "staff@hourani.jo", role: ar ? "فيل ♝ · موظف" : "Bishop ♝ · Staff" },
          { email: "newhire@hourani.jo", role: ar ? "بيدق ♟ · موظف جديد" : "Pawn ♟ · New hire" },
        ].map(({ email, role }) => (
          <div
            key={email}
            style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--admin-rule)", fontSize: 12.5 }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "var(--admin-cyan)", fontSize: 12 }}>{email}</span>
            <span style={{ color: "var(--admin-text-muted)" }}>{role}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--admin-text-muted)", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
          {ar ? "كلمة المرور لجميع الحسابات:" : "Password for all accounts:"}{" "}
          <span style={{ color: "var(--admin-text)" }}>admin123</span>
        </div>
      </div>
    </div>
  );
}

function Banner({
  color,
  icon,
  title,
  body,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "16px 20px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${color}55`,
        borderRadius: 8,
      }}
    >
      {icon}
      <div>
        <div style={{ color, fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div style={{ color: "var(--admin-text-muted)", fontSize: 13, marginTop: 3, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
}
