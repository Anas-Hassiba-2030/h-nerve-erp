"use client";

import { useState, useTransition } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";

// Drop-in replacement for the inline `<form action={delete}>...delete</form>`
// pattern. Renders a small ghost button; clicking it opens a centered
// confirm modal. Submission is wrapped in a transition for a loading state.
//
// `softDelete`: when true, the confirm modal is skipped and the action runs
// on the first click. Use this for entities that go through the soft-delete +
// undo-toast flow — the toast is the safety net.
export function DeleteButton({
  action,
  payload,
  label,
  description,
  size = "sm",
  softDelete = false,
}: {
  // Server action expecting a FormData with at least { id, ...payload }.
  action: (formData: FormData) => void | Promise<void>;
  payload: Record<string, string>;
  label?: string;
  description?: string;
  size?: "sm" | "md";
  softDelete?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const sizeCls = size === "sm" ? "btn-ghost btn-sm" : "btn-ghost";
  const ar = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  if (softDelete) {
    return (
      <form
        action={(fd) => startTransition(async () => { await action(fd); })}
      >
        {Object.entries(payload).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="submit"
          disabled={pending}
          className={`${sizeCls} text-red-600 hover:bg-red-50 disabled:opacity-60`}
          title={label ?? (ar ? "حذف" : "Delete")}
          aria-label={label ?? (ar ? "حذف" : "Delete")}
        >
          {pending ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </form>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${sizeCls} text-red-600 hover:bg-red-50`}
        title={label ?? (ar ? "حذف" : "Delete")}
        aria-label={label ?? (ar ? "حذف" : "Delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 anim-fade-in"
            style={{ background: "color-mix(in srgb, var(--text) 50%, transparent)", backdropFilter: "blur(8px)" }}
            onClick={() => !pending && setOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl shadow-glow anim-rise-glow"
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold" style={{ color: "var(--text)" }}>
                    {label ?? (ar ? "تأكيد الحذف" : "Confirm deletion")}
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    {description ?? (ar
                      ? "هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد من المتابعة؟"
                      : "This action cannot be undone. Are you sure you want to continue?")}
                  </p>
                </div>
                <button
                  onClick={() => !pending && setOpen(false)}
                  className="rounded-md p-1 transition hover:bg-[var(--brand-soft)]"
                  aria-label="close"
                  disabled={pending}
                >
                  <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="btn-ghost btn-sm"
                disabled={pending}
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <form
                action={(fd) => startTransition(async () => { await action(fd); setOpen(false); })}
              >
                {Object.entries(payload).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <button type="submit" className="btn-danger btn-sm" disabled={pending}>
                  {pending ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {ar ? "جارٍ الحذف…" : "Deleting…"}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      {ar ? "نعم، احذف" : "Yes, delete"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
