"use client";

// Phase V3-P12 — message composer. Fixes the input-clear bug: the
// previous uncontrolled textarea kept the typed message in the box
// after submit. This client wrapper controls the value via useState
// and resets to "" once useFormStatus.pending falls back to false.
// Enter to send, Shift+Enter for newline.

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { sendMessage } from "../actions";

function SendButton({ ar, disabled }: { ar: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary hn-hover-shine"
      disabled={pending || disabled}
      title={
        disabled
          ? ar
            ? "اكتب رسالة أولاً"
            : "Type a message first"
          : undefined
      }
    >
      <Send className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} />
      {pending ? (ar ? "يُرسَل…" : "Sending…") : ar ? "أرسل" : "Send"}
    </button>
  );
}

function Reset({ value }: { value: () => void }) {
  // useFormStatus only works inside a child of <form>. When pending
  // flips back from true to false (server action completed), clear.
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) value();
    wasPending.current = pending;
  }, [pending, value]);
  return null;
}

export function MessageComposer({
  threadId,
  recipientName,
  ar,
}: {
  threadId: string;
  recipientName: string;
  ar: boolean;
}) {
  const [body, setBody] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  return (
    <form
      action={sendMessage}
      className="flex items-end gap-2 p-3"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--brand-soft)",
      }}
    >
      <input type="hidden" name="threadId" value={threadId} />
      <textarea
        ref={taRef}
        name="body"
        required
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // Enter to send, Shift+Enter for newline.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (body.trim().length > 0) {
              (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }
        }}
        placeholder={
          ar
            ? `اكتب رسالة لـ ${recipientName}…`
            : `Message ${recipientName}…`
        }
        className="textarea flex-1 resize-none"
        style={{ minHeight: 46 }}
      />
      <Reset value={() => setBody("")} />
      <SendButton ar={ar} disabled={body.trim().length === 0} />
    </form>
  );
}
