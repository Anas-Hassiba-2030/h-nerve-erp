"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, CheckCircle2, Info, X } from "lucide-react";
import {
  FLASH_COOKIE,
  TOAST_EVENT,
  type ToastFlash,
} from "@/lib/toast.shared";

type Toast = ToastFlash & { uid: string };
const MAX_STACK = 3;

export function ToastProvider({ initialFlash }: { initialFlash: ToastFlash | null }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenSigRef = useRef<string>("");

  const dismiss = useCallback((uid: string) => {
    setToasts((prev) => prev.filter((x) => x.uid !== uid));
  }, []);

  const push = useCallback((flash: ToastFlash) => {
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { ...flash, uid }];
      return next.length > MAX_STACK ? next.slice(next.length - MAX_STACK) : next;
    });
  }, []);

  // Hydrate from server flash cookie. Each new initialFlash (different sig) is
  // pushed once, then the cookie is wiped so it doesn't replay on next render.
  useEffect(() => {
    if (!initialFlash) return;
    const sig = JSON.stringify(initialFlash);
    if (sig === seenSigRef.current) return;
    seenSigRef.current = sig;
    push(initialFlash);
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
  }, [initialFlash, push]);

  // Client-triggered toasts via useToast().
  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<ToastFlash>).detail;
      if (detail) push(detail);
    }
    window.addEventListener(TOAST_EVENT, onEvt as EventListener);
    return () => window.removeEventListener(TOAST_EVENT, onEvt as EventListener);
  }, [push]);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.uid} toast={t} onDismiss={() => dismiss(t.uid)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [exiting, setExiting] = useState(false);
  const isDeleted = toast.type === "deleted" && toast.entity !== "info" && !!toast.id;
  const isRestored = toast.type === "restored";

  const ar = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  // Two-phase exit: trigger the leave animation, then unmount once it ends.
  // Falls through immediately if reduced-motion is on.
  function close() {
    setExiting(true);
    setTimeout(onDismiss, 220);
  }

  // Dismissal is driven by the CSS progress-bar animation. When the bar
  // finishes shrinking, it fires `animationend` here.
  function onProgressEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.animationName === "toast-progress") close();
  }

  async function onUndo() {
    if (!isDeleted || busy) return;
    setBusy(true);
    try {
      const res = await fetch(toast.restorePath ?? "/api/toast/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: toast.entity, id: toast.id }),
      });
      if (!res.ok) throw new Error("restore failed");
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: {
            type: "restored",
            entity: toast.entity,
            id: toast.id,
            label: ar ? "تم الاسترجاع" : "Restored",
          } satisfies ToastFlash,
        }),
      );
      router.refresh();
      close();
    } catch {
      setBusy(false);
    }
  }

  const Icon = isRestored ? CheckCircle2 : isDeleted ? Trash2 : Info;
  const iconClass = isRestored
    ? "text-emerald-600"
    : isDeleted
    ? "text-red-600"
    : "text-[var(--brand)]";
  const tone = isRestored ? "toast-restored" : isDeleted ? "toast-deleted" : "toast-info";

  return (
    <div
      className={`toast ${tone}${exiting ? " toast-exit" : ""}`}
      role="status"
      data-tone={tone}
    >
      <div className={`toast-icon ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="toast-label">
        {toast.label ?? (ar ? "تم التنفيذ" : "Done")}
      </div>
      {isDeleted ? (
        <button
          type="button"
          onClick={onUndo}
          disabled={busy}
          className="toast-undo"
          aria-label={ar ? "تراجع" : "Undo"}
        >
          <RotateCcw className={`h-3.5 w-3.5${busy ? " animate-spin" : ""}`} />
          <span>{ar ? "تراجع" : "Undo"}</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={close}
        className="toast-close"
        aria-label={ar ? "إغلاق" : "Close"}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div
        className="toast-progress"
        onAnimationEnd={onProgressEnd}
        aria-hidden
      />
    </div>
  );
}
