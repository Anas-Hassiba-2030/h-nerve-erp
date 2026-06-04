import Link from "next/link";
import { Search } from "lucide-react";
import { formatNumber, formatRelative } from "@/lib/utils";
import {
  ENTITY_META,
  ACTION_TAG,
  ACTION_AR,
  VALID_ENTITIES,
  type RecentRecord,
} from "../data";

export function AuditPickerView({
  ar,
  records,
}: {
  ar: boolean;
  records: RecentRecord[];
}) {
  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · تتبع 360" : "System · Audit 360"}
            </div>
            <h1 className="sec-title">{ar ? "تتبع السجلات" : "Audit 360"}</h1>
            <p className="sec-sub">
              {ar
                ? "اختر سجلاً لرؤية كل لمسة عليه عبر كل وحدة عمل في المجموعة."
                : "Pick a record to see every touch on it across every business unit."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "مباشر" : "Live"}
            </span>
          </div>
        </div>

        {/* Tabs — reference audit.html: التدقيق ٣٦٠ / النشاط */}
        <div className="ops-tabs">
          <span className="ops-tab on">{ar ? "التدقيق ٣٦٠" : "Audit 360"}</span>
          <Link href="/activity" className="ops-tab">
            {ar ? "النشاط" : "Activity"}
          </Link>
        </div>

        {/* Manual entry — paste-id form, styled as an ops-form */}
        <div className="panel reveal">
          <div className="panel-head">
            <div className="panel-title">{ar ? "تتبع سجل بمعرفه" : "Trace by record ID"}</div>
          </div>
          <p className="panel-aside" style={{ marginBottom: 12 }}>
            {ar
              ? "اختر نوع السجل والصق المعرّف. يدعم الأنواع الـ 12 أدناه."
              : "Pick a record type and paste its ID. All 12 entity kinds are supported."}
          </p>
          {/* Plain GET form so the entire URL (entity + id) is shareable. */}
          <form
            action="/audit-360"
            method="get"
            className="ops-form"
            style={{ gridTemplateColumns: "200px 1fr auto", border: 0, background: "transparent", padding: 0 }}
          >
            <select name="entity" defaultValue="BOOKING">
              {VALID_ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {ar ? ENTITY_META[e].ar : ENTITY_META[e].en} ({e})
                </option>
              ))}
            </select>
            <input
              type="text"
              name="id"
              placeholder={ar ? "المعرّف (cuid)" : "Record ID (cuid)"}
              style={{ fontFamily: "monospace" }}
              required
              maxLength={64}
              pattern="[A-Za-z0-9_-]+"
            />
            <button type="submit" className="ops-add">
              <Search className="h-4 w-4" />
              {ar ? "تتبع" : "Trace"}
            </button>
          </form>
        </div>

        {/* Recent activity picker as an ops-table */}
        <div className="ops-panel on">
          <div className="ops-toolbar">
            <h2>{ar ? "أكثر السجلات تفاعلاً مؤخراً" : "Recently active records"}</h2>
            <div className="ops-actions">
              <span className="panel-aside">{formatNumber(records.length)}</span>
            </div>
          </div>
          <div className="ops-table">
            <div
              className="ops-tr head"
              style={{ gridTemplateColumns: ".9fr 2fr 1fr .7fr .8fr" }}
            >
              <span className="ops-cell">{ar ? "النوع" : "Type"}</span>
              <span className="ops-cell name">{ar ? "الملخص" : "Summary"}</span>
              <span className="ops-cell">{ar ? "المستخدم" : "User"}</span>
              <span className="ops-cell num">{ar ? "مرات" : "Count"}</span>
              <span className="ops-cell num">{ar ? "الوقت" : "Time"}</span>
            </div>
            {records.length === 0 ? (
              <div className="ops-empty">
                <div className="oe-ic">◇</div>
                <div className="oe-t">{ar ? "لا يوجد نشاط حديث" : "No recent activity"}</div>
                <div className="oe-s">
                  {ar
                    ? "ما إن يبدأ التفاعل عبر الوحدات حتى تظهر السجلات هنا."
                    : "Once touches start flowing across modules, records will surface here."}
                </div>
              </div>
            ) : (
              records.map((r) => {
                const m = ENTITY_META[r.entity];
                const href = `/audit-360?entity=${r.entity}&id=${encodeURIComponent(r.entityId)}`;
                return (
                  <Link
                    key={`${r.entity}:${r.entityId}`}
                    href={href}
                    className="ops-tr row"
                    style={{ gridTemplateColumns: ".9fr 2fr 1fr .7fr .8fr" }}
                  >
                    <span className="ops-cell">
                      <span className="ops-tag info">{ar ? m.ar : m.en}</span>
                    </span>
                    <span className="ops-cell name">
                      <span className={`ops-tag ${ACTION_TAG[r.lastAction] ?? "info"}`} style={{ marginInlineEnd: 6 }}>
                        {ar ? ACTION_AR[r.lastAction] ?? r.lastAction : r.lastAction}
                      </span>
                      {ar ? r.summary : r.summaryEn ?? r.summary}
                    </span>
                    <span className="ops-cell">{r.actorName ?? "—"}</span>
                    <span className="ops-cell num">{formatNumber(r.count)} ×</span>
                    <span className="ops-cell num">{formatRelative(r.lastAt)}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
