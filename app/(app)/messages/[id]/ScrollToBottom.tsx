"use client";

// BUG-B — message list auto-scroll. Server-rendered list can't scroll
// itself; this client island scrolls its own anchor into view on mount
// and whenever the message count changes (revalidatePath re-render after
// a send), so the newest message is always visible — the WhatsApp/Slack
// behavior the user expects.

import { useEffect, useRef } from "react";

export function ScrollToBottom() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  });
  return <div ref={ref} aria-hidden style={{ height: 1 }} />;
}
