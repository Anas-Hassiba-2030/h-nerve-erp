// /admin/audit — read-only who-did-what-when (Phase 7). Surfaces the
// existing ActivityLog (written by lib/activityLog.ts + auth/workspace
// actions). Sleek Operator, bilingual (getLocale + ar-ternary, Phase 3
// convention). ADMIN-gated by the (admin) layout. No server actions —
// read-only. Filter form is a plain GET; pagination is take/skip 50.

import Link from "next/link";
import { prisma } from "@/lib/db/db";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";

export const dynamic = "force-dynamic";

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "RESTORE", "LOGIN", "EXPORT", "FORECAST", "INSIGHT"];
const ENTITIES = ["BOOKING", "DAIRY", "FARM", "CROP", "PROGRAM", "PROJECT", "TASK", "FORECAST", "INSIGHT", "TRANSACTION", "USER", "COMPANY", "HOTEL", "AUTH"];
const PER = 50;

type SP = { [k: string]: string | string[] | undefined };
const s = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "");

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const locale = getLocale();
  const ar = locale === "ar";
  const m = getMessages(locale);

  const fAction = s(searchParams.action);
  const fEntity = s(searchParams.entity);
  const fActor = s(searchParams.actor);
  const fFrom = s(searchParams.from);
  const fTo = s(searchParams.to);
  const page = Math.max(1, parseInt(s(searchParams.page) || "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (ACTIONS.includes(fAction)) where.action = fAction;
  if (ENTITIES.includes(fEntity)) where.entity = fEntity;
  if (fActor) where.actorName = { contains: fActor };
  const created: Record<string, Date> = {};
  if (fFrom && !Number.isNaN(Date.parse(fFrom))) created.gte = new Date(fFrom);
  if (fTo && !Number.isNaN(Date.parse(fTo))) {
    const d = new Date(fTo);
    d.setHours(23, 59, 59, 999);
    created.lte = d;
  }
  if (created.gte || created.lte) where.createdAt = created;

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PER,
      skip: (page - 1) * PER,
      select: {
        id: true, action: true, entity: true, entityId: true,
        summary: true, summaryEn: true, actorName: true, createdAt: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (fAction) u.set("action", fAction);
    if (fEntity) u.set("entity", fEntity);
    if (fActor) u.set("actor", fActor);
    if (fFrom) u.set("from", fFrom);
    if (fTo) u.set("to", fTo);
    u.set("page", String(p));
    return `/admin/audit?${u.toString()}`;
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.audit"]}</span>
          <h1 className="admin-h1">{ar ? "سجل التدقيق" : "Audit log"}</h1>
          <p className="admin-sub">
            {ar
              ? "من فعل ماذا ومتى — للقراءة فقط. مبني على سجل النشاط الحالي."
              : "Who did what, when — read-only. Built on the existing activity log."}
            {" · "}
            {total.toLocaleString("en-US")} {ar ? "حدث" : "events"}
          </p>
        </div>
      </header>

      <form method="get" action="/admin/audit" className="admin-section">
        <div className="admin-grid-2">
          <label className="admin-field">
            <span className="admin-label">{ar ? "الإجراء" : "Action"}</span>
            <select name="action" defaultValue={fAction} className="admin-input">
              <option value="">{ar ? "الكل" : "All"}</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "المورد" : "Resource"}</span>
            <select name="entity" defaultValue={fEntity} className="admin-input">
              <option value="">{ar ? "الكل" : "All"}</option>
              {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "المستخدم" : "User"}</span>
            <input name="actor" defaultValue={fActor} className="admin-input" placeholder={ar ? "اسم الفاعل" : "actor name"} />
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "من تاريخ" : "From"}</span>
            <input type="date" name="from" defaultValue={fFrom} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "إلى تاريخ" : "To"}</span>
            <input type="date" name="to" defaultValue={fTo} className="admin-input" />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="admin-cta-primary">
            {ar ? "تصفية" : "Filter"}
          </button>
          <Link href="/admin/audit" className="admin-btn-ghost">
            {ar ? "مسح" : "Clear"}
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="admin-empty">
          <p>{ar ? "لا أحداث مطابقة." : "No matching events."}</p>
        </div>
      ) : (
        <ul className="admin-trail">
          {rows.map((r) => (
            <li key={r.id} className="admin-trail-row">
              <span className="admin-trail-time">
                {r.createdAt.toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <span className="admin-trail-meta">
                <strong style={{ color: "var(--admin-cyan)" }}>{r.action}</strong>
                {" · "}{r.entity}
                {r.entityId ? <span className="admin-stat-label"> #{r.entityId.slice(0, 8)}</span> : null}
              </span>
              <span>{ar ? r.summary : (r.summaryEn || r.summary)}</span>
              <span className="admin-stat-label">{r.actorName ?? (ar ? "النظام" : "system")}</span>
            </li>
          ))}
        </ul>
      )}

      <nav className="admin-rail-nav" style={{ marginTop: 18, justifyContent: "space-between" }}>
        <span className="admin-stat-label">
          {ar ? "صفحة" : "Page"} {page} / {pages}
        </span>
        <span style={{ display: "flex", gap: 10 }}>
          {page > 1 ? (
            <Link href={qs(page - 1)} className="admin-btn-ghost">{ar ? "السابق" : "Prev"}</Link>
          ) : null}
          {page < pages ? (
            <Link href={qs(page + 1)} className="admin-btn-ghost">{ar ? "التالي" : "Next"}</Link>
          ) : null}
        </span>
      </nav>
    </div>
  );
}
