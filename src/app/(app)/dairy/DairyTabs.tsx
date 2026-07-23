"use client";

/* المها · Dairy — the maha.html ops experience, faithfully reproduced.
   Two tabs (overview / batches). The batches tab is the reference Ops.table:
   a CRUD grid with a clickable status-cycle pill, a search box, a delete
   control, and a right-side drawer that shows a quality gauge + a 12-day
   production bar chart + a "simulate the impact of expansion" CTA.

   Behavior matches maha-ops.js; the DATA and the status mutation are real —
   the status pill calls the existing `setBatchStatus` server action and the
   delete control calls `deleteBatch`. Both come in as bound actions so this
   client island never imports server code directly. */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { X, Search, Trash2 } from "lucide-react";

export type BatchRow = {
  id: string;
  batchNumber: string;
  product: string; // localized display name
  liters: number;
  litersText: string;
  quality: number; // 0-100 (grade A => 96-ish, derived on the server)
  qualityText: string;
  grade: string;
  fat: string;
  status: string; // raw enum
  statusLabel: string;
  statusTone: "ok" | "warn" | "crit" | "info";
  production: string;
  expiry: string;
  expiringSoon: boolean;
  destination: string;
};

type Tone = BatchRow["statusTone"];

const STATUS_CYCLE = ["IN_PRODUCTION", "QC", "READY", "DISTRIBUTED"] as const;

export function DairyTabs({
  ar,
  overview,
  batches,
  setStatus,
  remove,
}: {
  ar: boolean;
  overview: React.ReactNode;
  batches: BatchRow[];
  setStatus: (formData: FormData) => void | Promise<void>;
  remove: (formData: FormData) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<"overview" | "batches">("overview");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.product.toLowerCase().includes(q),
    );
  }, [batches, query]);

  const active = batches.find((b) => b.id === openId) ?? null;

  function cycleStatus(b: BatchRow) {
    const i = STATUS_CYCLE.indexOf(b.status as (typeof STATUS_CYCLE)[number]);
    // A status outside the cycle (e.g. RECALLED) has index -1; advancing it
    // would wrap to STATUS_CYCLE[0] (IN_PRODUCTION) and silently un-recall the
    // batch. Leave non-cycle statuses untouched.
    if (i === -1) return;
    const next = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
    const fd = new FormData();
    fd.set("id", b.id);
    fd.set("status", next);
    startTransition(async () => {
      await setStatus(fd);
    });
  }

  return (
    <>
      <div className="ops-tabs">
        <button
          className={`ops-tab${tab === "overview" ? " on" : ""}`}
          onClick={() => setTab("overview")}
          type="button"
        >
          {ar ? "نظرة عامة" : "Overview"}
        </button>
        <button
          className={`ops-tab${tab === "batches" ? " on" : ""}`}
          onClick={() => setTab("batches")}
          type="button"
        >
          {ar ? "الدفعات" : "Batches"}
        </button>
      </div>

      {/* ── overview panel (KPI grid + product-lines table, server-rendered) ── */}
      <div className={`ops-panel${tab === "overview" ? " on" : ""}`}>{overview}</div>

      {/* ── batches panel ── */}
      <div className={`ops-panel${tab === "batches" ? " on" : ""}`}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{ar ? "الدفعات" : "Batches"}</span>
            <span className="ops-search" style={{ display: "inline-flex", alignItems: "center", gap: 6, width: 200 }}>
              <Search className="h-3.5 w-3.5" style={{ color: "var(--ink-muted)", flex: "0 0 auto" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ar ? "بحث…" : "Search…"}
                aria-label={ar ? "بحث في الدفعات" : "Search batches"}
                style={{ all: "unset", flex: 1, fontSize: 13, color: "var(--ink)" }}
              />
            </span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: "46px 20px", textAlign: "center", color: "var(--ink-muted)" }}>
              {ar ? "لا توجد دفعات مطابقة." : "No matching batches."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>{ar ? "رقم الدفعة" : "Batch #"}</th>
                    <th>{ar ? "المنتج" : "Product"}</th>
                    <th className="num">{ar ? "اللترات" : "Liters"}</th>
                    <th className="num">{ar ? "الجودة %" : "Quality %"}</th>
                    <th>{ar ? "الحالة" : "Status"}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setOpenId(b.id)}
                          style={{ font: "inherit", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--emerald)", cursor: "pointer", background: "none", border: 0, padding: 0 }}
                        >
                          {b.batchNumber}
                        </button>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--ink)" }}>{b.product}</td>
                      <td className="num">{b.litersText}</td>
                      <td className="num">{b.qualityText}</td>
                      <td>
                        <button
                          type="button"
                          className={`tag ${b.statusTone} ops-status`}
                          onClick={() => cycleStatus(b)}
                          disabled={pending}
                          title={ar ? "اضغط لتغيير الحالة" : "Click to cycle status"}
                        >
                          {b.statusLabel}
                        </button>
                      </td>
                      <td style={{ textAlign: "end" }}>
                        <DeleteCell ar={ar} batch={b} remove={remove} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── drawer (gauge + bars + CTA), mirrors maha-ops.js drawer() ── */}
      <div className={`ops-backdrop${active ? " open" : ""}`} onClick={() => setOpenId(null)} />
      <aside className={`ops-drawer${active ? " open" : ""}`} aria-hidden={!active}>
        {active ? (
          <>
            <button type="button" className="dr-close" onClick={() => setOpenId(null)} aria-label={ar ? "إغلاق" : "Close"}>
              <X className="h-5 w-5" />
            </button>
            <div className="dr-eyebrow">{(ar ? "دفعة · " : "Batch · ") + active.product}</div>
            <h3 className="dr-title">{active.batchNumber}</h3>
            <div className="dr-sub">{active.litersText} {ar ? "لتر" : "liters"} · {active.statusLabel}</div>

            <div className="dr-sec">{ar ? "جودة الدفعة" : "Batch quality"}</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Gauge pct={active.quality} ar={ar} />
            </div>

            <div className="dr-sec">{ar ? "إنتاج آخر ١٢ يوماً" : "Output, last 12 days"}</div>
            <Bars />

            <Link className="dr-msg" href="/brain/scenarios">
              {ar ? "محاكاة أثر التوسّع" : "Simulate the impact of expansion"}
            </Link>
          </>
        ) : null}
      </aside>
    </>
  );
}

function DeleteCell({ ar, batch, remove }: { ar: boolean; batch: BatchRow; remove: (fd: FormData) => void | Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => startTransition(async () => { await remove(fd); })}
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="id" value={batch.id} />
      <button
        type="submit"
        disabled={pending}
        title={ar ? `حذف الدفعة ${batch.batchNumber}` : `Delete batch ${batch.batchNumber}`}
        aria-label={ar ? `حذف الدفعة ${batch.batchNumber}` : `Delete batch ${batch.batchNumber}`}
        style={{ background: "none", border: 0, cursor: "pointer", color: "var(--brick)", opacity: pending ? 0.5 : 0.75, padding: 4 }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

/* Quality ring — the SVG/maths of maha-ops.js gauge(), reproduced 1:1. */
function Gauge({ pct, ar }: { pct: number; ar: boolean }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const C = 2 * Math.PI * 40;
  const off = C * (1 - p / 100);
  const fmt = new Intl.NumberFormat(ar ? "ar-JO-u-nu-arab" : "en-US").format(p);
  return (
    <div className="gauge">
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(46,107,87,.15)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke="#2E6B57" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off}
        />
      </svg>
      <span className="gv">{fmt}%</span>
      <div className="gl">{ar ? "الجودة" : "Quality"}</div>
    </div>
  );
}

/* 12-day production bars — same shape values as maha-ops.js bars(). */
function Bars() {
  const d = [42, 48, 40, 52, 46, 58, 54, 62, 60, 68, 64, 72];
  const max = Math.max(...d);
  return (
    <div className="bars" style={{ height: 120 }}>
      {d.map((v, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-stack">
            <div className="bar rev" style={{ height: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
