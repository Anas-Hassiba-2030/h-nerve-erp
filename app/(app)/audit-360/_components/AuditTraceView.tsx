import Link from "next/link";
import {
  MessageSquare,
  Pin as PinIcon,
  Eye,
  Search,
} from "lucide-react";
import { formatNumber, formatRelative } from "@/lib/utils";
import {
  ENTITY_META,
  ACTION_TAG,
  ACTION_AR,
  type EntityType,
  type AuditTrace,
} from "../data";

export function AuditTraceView({
  ar,
  entity,
  id,
  trace,
}: {
  ar: boolean;
  entity: EntityType;
  id: string;
  trace: AuditTrace;
}) {
  const { resolved, activity, threads, pinCount } = trace;
  const meta = ENTITY_META[entity];
  const detailHref = meta.href(id);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · تتبع 360" : "System · Audit 360"}
            </div>
            <h1 className="sec-title">{ar ? "تتبع السجل" : "Record trace"}</h1>
            <p className="sec-sub">
              {ar
                ? "كل تفاعل ولمسة على هذا العنصر — عبر كل وحدة في المنصة."
                : "Every interaction and touch on this record — across every module."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {resolved?.label ?? (ar ? "سجل غير موجود" : "Record not found")}
            </span>
            <div className="sec-actions">
              <Link href="/audit-360" className="dl-btn dl-btn-secondary">
                <Search className="h-4 w-4" />
                {ar ? "تتبع آخر" : "Trace another"}
              </Link>
            </div>
          </div>
        </div>

        {/* Entity overview KPIs */}
        <section className="kpi-grid reveal">
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "النوع" : "Entity"}</div>
            <div className="kpi-val" style={{ fontSize: 28 }}>
              {ar ? meta.ar : meta.en}
            </div>
            <div className="kpi-foot">
              <span className="kpi-hint" style={{ fontFamily: "monospace" }}>{id}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "أحداث" : "Events"}</div>
            <div className="kpi-val">{formatNumber(activity.length)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "نقاشات" : "Threads"}</div>
            <div className="kpi-val">{formatNumber(threads.length)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{ar ? "تثبيتات" : "Pins"}</div>
            <div className="kpi-val">{formatNumber(pinCount)}</div>
            {detailHref ? (
              <div className="kpi-foot">
                <Link href={detailHref} className="kpi-hint" style={{ color: "var(--gold)", fontWeight: 700 }}>
                  <Eye className="me-1 inline h-3.5 w-3.5" />
                  {ar ? "فتح السجل" : "Open record"}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {/* Tabs — reference audit.html: التدقيق ٣٦٠ / النشاط */}
        <div className="ops-tabs">
          <span className="ops-tab on">{ar ? "التدقيق ٣٦٠" : "Audit 360"}</span>
          <Link href="/activity" className="ops-tab">
            {ar ? "النشاط" : "Activity"}
          </Link>
        </div>

        {/* Activity timeline as an ops-table */}
        <div className="ops-panel on">
          <div className="ops-toolbar">
            <h2>{ar ? "الجدول الزمني" : "Activity timeline"}</h2>
            <div className="ops-actions">
              <span className="panel-aside">{formatNumber(activity.length)}</span>
            </div>
          </div>
          <div className="ops-table">
            <div
              className="ops-tr head"
              style={{ gridTemplateColumns: "1.4fr 2fr 1.2fr .9fr" }}
            >
              <span className="ops-cell">{ar ? "الإجراء" : "Action"}</span>
              <span className="ops-cell name">{ar ? "الملخص" : "Summary"}</span>
              <span className="ops-cell">{ar ? "المستخدم" : "User"}</span>
              <span className="ops-cell num">{ar ? "الوقت" : "Time"}</span>
            </div>
            {activity.length === 0 ? (
              <div className="ops-empty">
                <div className="oe-ic">◇</div>
                <div className="oe-t">{ar ? "لا لمسات بعد" : "No touches yet"}</div>
                <div className="oe-s">
                  {ar
                    ? "لا توجد لمسات مسجلة على هذا العنصر بعد."
                    : "No recorded touches on this record yet."}
                </div>
              </div>
            ) : (
              activity.map((a) => (
                <div
                  key={a.id}
                  className="ops-tr row"
                  style={{ gridTemplateColumns: "1.4fr 2fr 1.2fr .9fr" }}
                >
                  <span className="ops-cell">
                    <span className={`ops-tag ${ACTION_TAG[a.action] ?? "info"}`}>
                      {ar ? ACTION_AR[a.action] ?? a.action : a.action}
                    </span>
                  </span>
                  <span className="ops-cell name">
                    {ar ? a.summary : a.summaryEn ?? a.summary}
                  </span>
                  <span className="ops-cell">
                    {a.actorName ?? (ar ? "النظام" : "System")}
                    {a.module ? ` · ${a.module}` : ""}
                  </span>
                  <span className="ops-cell num">{formatRelative(a.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Discussions + pins as a secondary ops-table */}
        <div className="ops-panel on">
          <div className="ops-toolbar">
            <h2>{ar ? "نقاشات حول السجل" : "Discussions"}</h2>
            <div className="ops-actions">
              <span className="panel-aside">
                <MessageSquare className="me-1 inline h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
                {formatNumber(threads.length)}
              </span>
            </div>
          </div>
          <div className="ops-table">
            <div
              className="ops-tr head"
              style={{ gridTemplateColumns: "2fr .8fr .8fr .9fr" }}
            >
              <span className="ops-cell">{ar ? "النقاش" : "Thread"}</span>
              <span className="ops-cell num">{ar ? "رسائل" : "Msgs"}</span>
              <span className="ops-cell num">{ar ? "مشاركون" : "People"}</span>
              <span className="ops-cell num">{ar ? "آخر تحديث" : "Updated"}</span>
            </div>
            {threads.length === 0 ? (
              <div className="ops-empty">
                <div className="oe-ic">◇</div>
                <div className="oe-t">{ar ? "لا نقاشات" : "No discussions"}</div>
                <div className="oe-s">
                  {ar
                    ? "لم يفتح أحد نقاشاً عن هذا العنصر بعد."
                    : "No discussion thread anchored to this record yet."}
                </div>
              </div>
            ) : (
              threads.map((t) => (
                <Link
                  key={t.id}
                  href={`/messages/${t.id}`}
                  className="ops-tr row"
                  style={{ gridTemplateColumns: "2fr .8fr .8fr .9fr" }}
                >
                  <span className="ops-cell name">
                    {t.title ?? (ar ? "نقاش بدون عنوان" : "Untitled thread")}
                  </span>
                  <span className="ops-cell num">{formatNumber(t._count.messages)}</span>
                  <span className="ops-cell num">{formatNumber(t._count.participants)}</span>
                  <span className="ops-cell num">{formatRelative(t.updatedAt)}</span>
                </Link>
              ))
            )}
          </div>
          <p className="panel-aside" style={{ marginTop: 12 }}>
            <PinIcon className="me-1 inline h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
            {pinCount === 0
              ? ar
                ? "لم يثبّت أحد هذا السجل بعد."
                : "No one has pinned this record yet."
              : ar
                ? `${formatNumber(pinCount)} مستخدم ثبّت هذا السجل في مفضلته.`
                : `${formatNumber(pinCount)} user${pinCount === 1 ? "" : "s"} pinned this record.`}
          </p>
        </div>
      </div>
    </div>
  );
}
