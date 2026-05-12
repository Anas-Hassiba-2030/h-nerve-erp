"use client";

import { useCallback } from "react";
import { TOAST_EVENT, type ToastFlash } from "./toast.shared";

export { TOAST_EVENT, type ToastFlash } from "./toast.shared";

export type ClientToast = Omit<ToastFlash, "expiresAt">;

// Client-triggered toasts dispatch a window event that <ToastProvider> listens
// for. Use this for client-only flows (no server round-trip) like a copy-link
// confirmation. Server actions should call flashToast() from lib/toast.ts.
export function useToast() {
  const showToast = useCallback((toast: ClientToast) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: toast }));
  }, []);
  return { showToast };
}
