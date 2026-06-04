import type { SoftEntity } from "@/lib/db/softDelete";

export const FLASH_COOKIE = "h_nerve_flash";
export const FLASH_TTL_SECONDS = 30;
export const TOAST_DURATION_MS = 8000;
export const TOAST_EVENT = "h-nerve-toast";

export type ToastFlash = {
  type: "deleted" | "restored" | "info";
  entity: SoftEntity | "info";
  id?: string;
  label?: string;
  // Endpoint the Undo button POSTs to. Always /api/toast/undo for soft-deletes.
  restorePath?: string;
  expiresAt?: number;
};
