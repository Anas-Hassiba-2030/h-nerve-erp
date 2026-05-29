"use client";

// Phase V3-P12 + NS-2 — message composer.
// V3-P12: controls the textarea value so it clears on submit.
// NS-2: paperclip icon → file picker → reads file as data URI →
//       posts as hidden input alongside body. No server-side
//       storage endpoint needed; data URI rides in the form. Hard
//       limit of 1 MB binary (~1.4 MB base64) enforced client-side.

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send, Paperclip, X } from "lucide-react";
import { sendMessage } from "../actions";

const MAX_BYTES = 1_000_000; // ~1 MB raw binary

function SendButton({ ar, disabled }: { ar: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="heri-btn heri-btn-primary"
      disabled={pending || disabled}
      title={
        disabled
          ? ar
            ? "اكتب رسالة أو أرفق صورة"
            : "Type a message or attach an image"
          : undefined
      }
    >
      <Send className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} />
      {pending ? (ar ? "يُرسَل…" : "Sending…") : ar ? "أرسل" : "Send"}
    </button>
  );
}

function Reset({
  reset,
}: {
  reset: () => void;
}) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) reset();
    wasPending.current = pending;
  }, [pending, reset]);
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
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(
        ar
          ? "الصورة أكبر من 1 ميجابايت — اختر صورة أصغر."
          : "Image larger than 1 MB — pick a smaller one.",
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(ar ? "ملف غير مدعوم. الصور فقط." : "Only image files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setImageDataUrl(result);
    };
    reader.onerror = () => {
      setError(ar ? "فشل قراءة الملف." : "Failed to read the file.");
    };
    reader.readAsDataURL(file);
  };

  const hasContent = body.trim().length > 0 || imageDataUrl.length > 0;

  return (
    <form
      action={sendMessage}
      className="flex flex-col gap-2 p-3"
      style={{
        borderTop: "1px solid var(--heri-rule)",
        background: "var(--heri-cream-2)",
      }}
    >
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="imageUrl" value={imageDataUrl} />

      {/* Image preview chip (above textarea) */}
      {imageDataUrl ? (
        <div
          className="flex items-center gap-2 self-start"
          style={{
            background: "var(--heri-cream)",
            border: "1px solid var(--heri-rule)",
            padding: "6px 10px",
            maxWidth: "100%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="preview"
            style={{
              width: 36,
              height: 36,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
          <span
            style={{ fontSize: 11, color: "var(--heri-ink-3)" }}
          >
            {ar ? "صورة جاهزة للإرسال" : "Image ready"}
          </span>
          <button
            type="button"
            aria-label={ar ? "إزالة" : "Remove"}
            onClick={() => setImageDataUrl("")}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--heri-ink-3)",
              padding: 2,
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            color: "#b91c1c",
            fontSize: 11.5,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title={ar ? "أرفق صورة" : "Attach image"}
          aria-label={ar ? "أرفق صورة" : "Attach image"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            border: "1px solid var(--heri-rule)",
            background: "var(--heri-cream)",
            color: "var(--heri-ink-3)",
            cursor: "pointer",
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
        <textarea
          ref={taRef}
          name="body"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (hasContent) {
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
        <Reset
          reset={() => {
            setBody("");
            setImageDataUrl("");
            setError(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <SendButton ar={ar} disabled={!hasContent} />
      </div>
    </form>
  );
}
