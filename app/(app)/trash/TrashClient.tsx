"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ListChecks,
  FlaskConical,
  Sparkles,
  Brain,
  RotateCcw,
  Trash2,
  Clock,
  X,
} from "lucide-react";
import type { SoftEntity } from "@/lib/softDelete";
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

const ENTITY_META: Record<
  SoftEntity,
  { ar: string; en: string; icon: typeof ListChecks; tone: string; tint: string }
> = {
  task: {
    ar: "مهمة",
    en: "Task",
    icon: ListChecks,
    tone: "badge-emerald",
    tint: "#10b981",
  },
  project: {
    ar: "مشروع",
    en: "Project",
    icon: FlaskConical,
    tone: "badge-violet",
    tint: "#8b5cf6",
  },
  insight: {
    ar: "إشارة",
    en: "Insight",
    icon: Sparkles,
    tone: "badge-amber",
    tint: "#f59e0b",
  },
  forecast: {
    ar: "تنبؤ",
    en: "Forecast",
    icon: Brain,
    tone: "badge-blue",
    tint: "#3b82f6",
  },
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

function timeLeft(iso: string, graceMs: number, ar: boolean) {
  const elapsed = Date.now() - new Date(iso).getTime();
  const remaining = Math.max(0, graceMs - elapsed);
  const pct = Math.max(0, Math.min(1, remaining / graceMs));
  const expired = remaining === 0;

  let label: string;
  if (expired) {
    label = ar ? "منتهي الصلاحية" : "expired";
  } else {
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    if (hrs > 0) {
      label = ar ? `${hrs} س ${mins} د متبقية` : `${hrs}h ${mins}m left`;
    } else {
      label = ar ? `${mins} د متبقية` : `${mins}m left`;
    }
  }

  // Tone tracks remaining %, not elapsed — UI should look healthy when fresh.
  let tone: "ok" | "warn" | "danger";
  if (expired) tone = "danger";
  else if (pct > 0.5) tone = "ok";
  else if (pct > 0.25) tone = "warn";
  else tone = "danger";

  return { pct, label, expired, tone };
}

const TONE_COLOR: Record<"ok" | "warn" | "danger", string> = {
  ok: "linear-gradient(90deg, #10b981 0%, var(--heri-ochre) 100%)",
  warn: "linear-gradient(90deg, #f59e0b 0%, #f97316 100%)",
  danger: "linear-gradient(90deg, #ef4444 0%, #991b1b 100%)",
};

type RowKey = `${SoftEntity}:${string}`;
const keyOf = (i: TrashItem): RowKey => `${i.entity}:${i.id}`;

export function TrashClient({
  items,
  graceMs,
  ar,
}: {
  items: TrashItem[];
  graceMs: number;
  ar: boolean;
}) {
  const [selected, setSelected] = useState<Set<RowKey>>(new Set());
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => {
    const out: Record<SoftEntity, number> = {
      task: 0,
      project: 0,
      insight: 0,
      forecast: 0,
    };
    for (const i of items) out[i.entity]++;
    return out;
  }, [items]);

  function toggle(item: TrashItem) {
    const k = keyOf(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(keyOf)));
  }

  function clear() {
    setSelected(new Set());
  }

  function selectionPayload(): string {
    const rows: Array<{ entity: SoftEntity; id: string }> = [];
    for (const k of selected) {
      const [entity, id] = k.split(":");
      rows.push({ entity: entity as SoftEntity, id });
    }
    return JSON.stringify(rows);
  }

  // Bulk submit helpers — use a transition so the bulk toolbar shows a busy
  // state while the server action is running.
  function runBulk(action: (fd: FormData) => Promise<void> | void) {
    const fd = new FormData();
    fd.append("selection", selectionPayload());
    startTransition(async () => {
      await action(fd);
      setSelected(new Set());
    });
  }

  const allChecked = selected.size > 0 && selected.size === items.length;

  return (
    <>
      {/* Totals strip */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {(Object.keys(ENTITY_META) as SoftEntity[]).map((e) => {
          const meta = ENTITY_META[e];
          const Icon = meta.icon;
          return (
            <div key={e} className="card card-pad flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ background: meta.tint }}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {ar ? meta.ar : meta.en}
                </div>
                <div
                  className="font-mono text-xl font-bold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {totals[e]}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Selection toolbar — appears only when something is selected */}
      {selected.size > 0 ? (
        <div
          className="card card-pad sticky top-2 z-10 flex flex-wrap items-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--heri-ochre) 8%, var(--heri-cream)) 0%, var(--heri-cream) 100%)",
            borderColor: "color-mix(in srgb, var(--heri-ochre) 28%, var(--heri-rule))",
          }}
        >
          <span
            className="font-mono text-sm font-bold"
            style={{ color: "var(--brand-deep)" }}
          >
            {selected.size}
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--heri-ink)" }}
          >
            {ar ? "محدد" : "selected"}
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runBulk(restoreSelected)}
              disabled={pending}
              className="btn-secondary btn-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {ar ? "استرجاع المحدد" : "Restore selected"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  !confirm(
                    ar
                      ? "حذف نهائي للمحدد؟ لا يمكن التراجع عن هذا الإجراء."
                      : "Permanently delete the selected items? This cannot be undone.",
                  )
                ) return;
                runBulk(purgeSelected);
              }}
              disabled={pending}
              className="btn-danger btn-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {ar ? "حذف نهائي" : "Delete forever"}
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="btn-ghost btn-sm"
              aria-label={ar ? "إلغاء التحديد" : "Clear selection"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Items list */}
      <section className="card overflow-hidden">
        {/* Header with select-all */}
        <header
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--heri-rule)" }}
        >
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            aria-label={ar ? "تحديد الكل" : "Select all"}
            className="h-4 w-4 cursor-pointer accent-[var(--heri-ochre)]"
          />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--heri-ink)" }}
          >
            {ar ? `${items.length} عنصر محذوف` : `${items.length} deleted item${items.length === 1 ? "" : "s"}`}
          </span>
          <span
            className="ms-auto inline-flex items-center gap-1 text-[11px]"
            style={{ color: "var(--heri-ink-3)" }}
          >
            <Clock className="h-3.5 w-3.5" />
            {ar ? "نافذة الاسترجاع: 24 ساعة" : "Recovery window: 24h"}
          </span>
        </header>

        <ul>
          {items.map((item, i) => {
            const meta = ENTITY_META[item.entity];
            const Icon = meta.icon;
            const k = keyOf(item);
            const checked = selected.has(k);
            const t = timeLeft(item.deletedAt, graceMs, ar);
            return (
              <li
                key={k}
                className="grid items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  gridTemplateColumns: "auto auto 1fr auto auto",
                  borderTop: i === 0 ? "none" : "1px solid var(--heri-rule)",
                  background: checked
                    ? "color-mix(in srgb, var(--heri-ochre) 6%, transparent)"
                    : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item)}
                  aria-label={ar ? `تحديد ${item.label}` : `Select ${item.label}`}
                  className="h-4 w-4 cursor-pointer accent-[var(--heri-ochre)]"
                />
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ background: meta.tint }}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={meta.tone}>{ar ? meta.ar : meta.en}</span>
                    <span
                      className="truncate text-sm font-bold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    className="mt-0.5 truncate text-[11px]"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    {item.sub ? `${item.sub} · ` : ""}
                    {ar ? "حُذف" : "deleted"}{" "}
                    {relativeFromNow(item.deletedAt, ar)}
                  </div>
                  {/* Countdown rail */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      className="relative h-1 flex-1 overflow-hidden rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
                        maxWidth: 240,
                      }}
                    >
                      <div
                        className="absolute inset-y-0 start-0 rounded-full"
                        style={{
                          width: `${t.pct * 100}%`,
                          background: TONE_COLOR[t.tone],
                          transition: "width .4s ease",
                        }}
                      />
                    </div>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{
                        color: t.expired ? "#dc2626" : "var(--heri-ink-3)",
                      }}
                    >
                      {t.label}
                    </span>
                  </div>
                </div>

                {/* Per-row actions */}
                <form action={restoreOne}>
                  <input type="hidden" name="entity" value={item.entity} />
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="btn-secondary btn-sm"
                    title={ar ? "استرجاع" : "Restore"}
                    aria-label={ar ? "استرجاع" : "Restore"}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </form>
                <form
                  action={purgeOne}
                  onSubmit={(e) => {
                    if (
                      !confirm(
                        ar
                          ? `حذف "${item.label}" نهائياً؟ لا يمكن التراجع.`
                          : `Permanently delete "${item.label}"? This cannot be undone.`,
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="entity" value={item.entity} />
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    title={ar ? "حذف نهائي" : "Delete forever"}
                    aria-label={ar ? "حذف نهائي" : "Delete forever"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
