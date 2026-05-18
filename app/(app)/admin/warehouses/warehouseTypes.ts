// Plain shared constant for /admin/warehouses. Kept OUT of actions.ts:
// a "use server" module turns every export into a server-action
// reference, so a non-async const exported there reaches client
// components as a function proxy (TypeError: .map is not a function).
// Both the server actions and the "use client" forms import it here.

export const WAREHOUSE_TYPES = ["MAIN", "COLD", "DRY", "TRANSIT"] as const;
