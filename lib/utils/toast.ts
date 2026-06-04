import { cookies } from "next/headers";
import {
  FLASH_COOKIE,
  FLASH_TTL_SECONDS,
  TOAST_DURATION_MS,
  type ToastFlash,
} from "@/lib/utils/toast.shared";

export {
  FLASH_COOKIE,
  FLASH_TTL_SECONDS,
  TOAST_DURATION_MS,
  type ToastFlash,
} from "@/lib/utils/toast.shared";

// Server-side: attach a one-shot flash to the response so the next render of
// (app)/layout.tsx hands it to <ToastProvider>. httpOnly is intentionally false
// — the client clears the cookie after consuming it.
export function flashToast(payload: Omit<ToastFlash, "expiresAt">): void {
  const value: ToastFlash = {
    ...payload,
    expiresAt: Date.now() + TOAST_DURATION_MS,
  };
  cookies().set(FLASH_COOKIE, JSON.stringify(value), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FLASH_TTL_SECONDS,
  });
}

export function readFlash(): ToastFlash | null {
  const raw = cookies().get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ToastFlash;
  } catch {
    return null;
  }
}
