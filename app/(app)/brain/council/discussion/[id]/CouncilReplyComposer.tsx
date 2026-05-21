"use client";

// Phase V3-NEW-6 — controlled composer for the council discussion
// thread. Clears the textarea once the server action resolves. Same
// idiom as MessageComposer in /messages.

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { MessagesSquare } from "lucide-react";
import { replyToDiscussion } from "@/app/actions/council";

function PostButton({ ar, disabled }: { ar: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="heri-btn heri-btn-primary"
      disabled={pending || disabled}
      style={{ alignSelf: "flex-end" }}
    >
      <MessagesSquare className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""}`} strokeWidth={1.5} />
      {pending
        ? ar ? "يُنشَر…" : "Posting…"
        : ar ? "نشر الرد" : "Post reply"}
    </button>
  );
}

function Reset({
  value,
  focus,
}: {
  value: () => void;
  focus: () => void;
}) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) {
      value();
      focus();
    }
    wasPending.current = pending;
  }, [pending, value, focus]);
  return null;
}

export function CouncilReplyComposer({
  discussionId,
  ar,
}: {
  discussionId: string;
  ar: boolean;
}) {
  const [body, setBody] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  return (
    <form action={replyToDiscussion} className="space-y-2">
      <input type="hidden" name="discussionId" value={discussionId} />
      <textarea
        ref={taRef}
        name="body"
        required
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (body.trim().length > 0) {
              (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }
        }}
        placeholder={
          ar ? "ما رأيك في هذا النقاش؟" : "What's your take on this thread?"
        }
        className="textarea w-full"
        style={{ minHeight: 80 }}
      />
      <Reset
        value={() => setBody("")}
        focus={() => taRef.current?.focus()}
      />
      <PostButton ar={ar} disabled={body.trim().length === 0} />
    </form>
  );
}
