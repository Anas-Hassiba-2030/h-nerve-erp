"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { SoftEntity } from "@/lib/db/softDelete";
import {
  restoreOne,
  purgeOne,
  restoreSelected,
  purgeSelected,
} from "./actions";

export type TrashItem = {
  entity: SoftEntity;
  id: string;
  label: string;
  sub?: string;
  deletedAt: string; // ISO
};

// Reference uses the OPS tag classes (.ops-tag.{info,crit,...}) — map each
// entity to a bilingual category label + base tone, then escalate to `crit`
// once the row is past its grace window.
const ENTITY_META: Record<
  SoftEntity,
  { ar: string; en: string; tone: "info" | "ok" | "warn" }
> = {
  task: { ar: "مهمة", en: "Task", tone: "info" },
  project: { ar: "مشروع", en: "Project", tone: "ok" },
  insight: { ar: "إشارة", en: "Insight", tone: "warn" },
  forecast: { ar: "تنبؤ", en: "Forecast", tone: "info" },
};

function relativeFromNow(iso: string, ar: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return ar ? "الآن" : "just now";
  if (min < 60) return ar ? `قبل ${min} د` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return ar ? `قبل ${hr} س` : `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return ar ? `قبل ${d} ي` : `${d}d ago`;
}

type RowKey = `${SoftEntity}:${string}`;
const keyOf = (i: TrashItem): RowKey => `${i.entity}:${i.id}`;

export function TrashClient({
  items,
  graceMs,
  ar,
  expiredCount,
  purgeAllExpired,
}: {
  items: TrashItem[];
  graceMs: number;
  ar: boolean;
  expiredCount: number;
  purgeAllExpired: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<RowKey>>(new Set());
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const isExpired = useMemo(
    () => (iso: string) => Date.now() - new Date(iso).getTime() > graceMs,
    [graceMs],
  );

  function toggle(item: TrashItem) {
    const k = keyOf(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function selectionPayload(): string {
    const rows: Array<{ entity: SoftEntity; id: string }> = [];
    for (const k of selected) {
      const [entity, id] = k.split(":");
      rows.push({ entity: entity as SoftEntity, id });
    }
    return JSON.stringify(rows);
  }

  // Bulk submit helpers — use a transition so the controls show a busy state
  // while the server action runs.
  function runBulk(
    action: (fd: FormData) => Promise<void> | void,
    msg: string,
  ) {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.append("selection", selectionPayload());
    startTransition(async () => {
      await action(fd);
      setSelected(new Set());
      showToast(msg);
    });
  }

  // Single-row server-action submit.
  function runOne(
    action: (fd: FormData) => Promise<void> | void,
    item: TrashItem,
    msg: string,
  ) {
    const fd = new FormData();
    fd.append("entity", item.entity);
    fd.append("id", item.id);
    startTransition(async () => {
      await action(fd);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(keyOf(item));
        return next;
      });
      showToast(msg);
    });
  }

  return (
    <>
      <div className="br-controls" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="ops-add"
          style={{ border: 0 }}
          disabled={pending || selected.size === 0}
          onClick={() =>
            runBulk(
              restoreSelected,
              ar ? "استُعيد المحدّد" : "Restored selected",
            )
          }
        >
          {ar ? "استعد المحدّد" : "Restore selected"}
        </button>
        <button
          type="button"
          className="ops-export"
          disabled={pending || selected.size === 0}
          onClick={() => {
            if (
              !confirm(
                ar
                  ? "حذف نهائي للمحدّد؟ لا يمكن التراجع."
                  : "Permanently delete the selected items? This cannot be undone.",
              )
            )
              return;
            runBulk(
              purgeSelected,
              ar ? "حُذف المحدّد نهائياً" : "Selected purged",
            );
          }}
        >
          {ar ? "احذف المحدّد" : "Delete selected"}
        </button>
        {expiredCount > 0 ? (
          <button
            type="button"
            className="ops-export"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  ar
                    ? "مسح كل العناصر المنتهية نهائياً؟"
                    : "Purge all expired items permanently?",
                )
              )
                return;
              startTransition(async () => {
                await purgeAllExpired();
                showToast(
                  ar ? "مُسحت العناصر المنتهية" : "Expired items swept",
                );
              });
            }}
          >
            {ar
              ? `امسح المنتهية (${expiredCount})`
              : `Purge expired (${expiredCount})`}
          </button>
        ) : null}
      </div>

      <div id="trashList">
        {items.map((r) => {
          const meta = ENTITY_META[r.entity];
          const expired = isExpired(r.deletedAt);
          const k = keyOf(r);
          const sel = selected.has(k);
          return (
            <div
              className="br-row"
              key={k}
              style={{ background: "var(--cream)", borderColor: "var(--line)" }}
            >
              <button
                type="button"
                className={`chk${sel ? " on" : ""}`}
                onClick={() => toggle(r)}
                aria-label={
                  ar ? `تحديد ${r.label}` : `Select ${r.label}`
                }
              >
                {sel ? "✓" : ""}
              </button>
              <span className={`ops-tag ${expired ? "crit" : meta.tone}`}>
                {ar ? meta.ar : meta.en}
              </span>
              <div className="rt">
                <div className="tt" style={{ color: "var(--ink)" }}>
                  {r.label}
                </div>
                <div className="ts">
                  {r.sub ? `${r.sub} · ` : ""}
                  {ar ? "محذوف " : "deleted "}
                  {relativeFromNow(r.deletedAt, ar)}
                  {expired ? (ar ? " · منتهٍ" : " · expired") : ""}
                </div>
              </div>
              <button
                type="button"
                className="ops-add"
                style={{ border: 0 }}
                disabled={pending}
                onClick={() =>
                  runOne(restoreOne, r, ar ? "استُعيد العنصر" : "Restored")
                }
              >
                {ar ? "استعد" : "Restore"}
              </button>
              <button
                type="button"
                className="ops-export"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      ar
                        ? `حذف "${r.label}" نهائياً؟ لا يمكن التراجع.`
                        : `Permanently delete "${r.label}"? This cannot be undone.`,
                    )
                  )
                    return;
                  runOne(purgeOne, r, ar ? "حُذف نهائياً" : "Purged");
                }}
              >
                {ar ? "حذف نهائي" : "Delete forever"}
              </button>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div
          id="trashEmpty"
          style={{
            textAlign: "center",
            padding: 50,
            color: "var(--ink-muted)",
          }}
        >
          <div style={{ fontSize: 42, opacity: 0.4 }}>🗑</div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: 22,
              color: "var(--ink)",
              marginTop: 10,
            }}
          >
            {ar ? "السلة فارغة" : "Trash is empty"}
          </div>
        </div>
      ) : null}

      <div className={`br-toast${toast ? " show" : ""}`}>
        {toast ? `✦ ${toast}` : ""}
      </div>
    </>
  );
}
