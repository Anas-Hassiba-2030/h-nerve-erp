"use client";

import { useState, useTransition } from "react";
import { Trash2, CheckCheck, X, Loader2 } from "lucide-react";

export type BulkAction = {
  id: string;
  label: string;
  labelAr: string;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  action: (ids: string[]) => Promise<void>;
};

type Props = {
  ids: string[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  actions: BulkAction[];
  ar: boolean;
};

export function BulkActionBar({
  ids,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  actions,
  ar,
}: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const count = selected.size;
  const allSelected = count === ids.length && ids.length > 0;

  function run(action: BulkAction) {
    if (count === 0) return;
    setPending(action.id);
    startTransition(async () => {
      await action.action(Array.from(selected));
      onClearAll();
      setPending(null);
    });
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ borderBottom: "1px solid var(--heri-rule)", paddingBottom: 10, marginBottom: 8 }}
    >
      {/* Select-all checkbox */}
      <label
        className="heri-focusable flex cursor-pointer items-center gap-2"
        style={{ fontSize: 12, color: "var(--heri-ink-3)", userSelect: "none" }}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={allSelected ? onClearAll : onSelectAll}
          style={{ accentColor: "var(--heri-ochre)", width: 14, height: 14 }}
        />
        <span>
          {count > 0
            ? ar
              ? `${count} محدد`
              : `${count} selected`
            : ar
              ? "تحديد الكل"
              : "Select all"}
        </span>
      </label>

      {/* Action buttons — only show when something is selected */}
      {count > 0 && (
        <>
          <span style={{ width: 1, height: 18, background: "var(--heri-rule-strong)", display: "inline-block" }} />

          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={pending !== null}
              onClick={() => run(a)}
              className="heri-btn"
              style={{
                fontSize: 12,
                padding: "4px 10px",
                gap: 5,
                background: a.tone === "danger" ? "var(--heri-terracotta)" : "var(--heri-ink)",
                color: "var(--heri-cream)",
                border: "none",
                opacity: pending !== null ? 0.6 : 1,
              }}
            >
              {pending === a.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                a.icon
              )}
              {ar ? a.labelAr : a.label}
            </button>
          ))}

          <button
            type="button"
            onClick={onClearAll}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--heri-ink-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            <X className="h-3 w-3" />
            {ar ? "إلغاء" : "Cancel"}
          </button>
        </>
      )}
    </div>
  );
}

// Checkbox cell for use inside table rows or card rows
export function BulkCheckbox({
  id,
  selected,
  onToggle,
}: {
  id: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => onToggle(id)}
      onClick={(e) => e.stopPropagation()}
      style={{ accentColor: "var(--heri-ochre)", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
    />
  );
}

// Hook to manage selection state
export function useBulkSelect(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(ids));
  }

  function clearAll() {
    setSelected(new Set());
  }

  return { selected, toggle, selectAll, clearAll };
}
