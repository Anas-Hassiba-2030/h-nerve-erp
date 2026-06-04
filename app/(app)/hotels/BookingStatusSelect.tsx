"use client";

import { useRef } from "react";

// Inline booking-status control. setBookingStatus is exported by
// hotels/actions.ts but was never wired to any UI, so a booking's status could
// never change after creation. This client island auto-submits the server
// action on change (mirrors the dairy status pattern). The server action
// re-validates and revalidatePath("/hotels"), so the list refreshes.
const OPTIONS: Array<[string, string, string]> = [
  ["CONFIRMED", "مؤكد", "Confirmed"],
  ["ACTIVE", "نشط", "Active"],
  ["CHECKED_IN", "دخل الفندق", "Checked-in"],
  ["COMPLETED", "مكتمل", "Completed"],
  ["CANCELLED", "ملغى", "Cancelled"],
];

export function BookingStatusSelect({
  id,
  status,
  ar,
  action,
}: {
  id: string;
  status: string;
  ar: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="tag info"
        style={{ cursor: "pointer", border: "1px solid var(--line)", background: "transparent" }}
        aria-label={ar ? "حالة الحجز" : "Booking status"}
      >
        {OPTIONS.map(([v, a, e]) => (
          <option key={v} value={v}>
            {ar ? a : e}
          </option>
        ))}
      </select>
    </form>
  );
}
