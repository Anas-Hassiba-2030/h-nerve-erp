"use client";

// المراسلات · Messages index — composer for the previewed (latest) thread.
// Reuses the real `sendMessage` server action and the data-URI image pipeline
// from the thread-detail composer, but wears the reference's .ms-composer
// markup (paperclip icon button, pill textarea, gold send button, attach
// preview chip) so the index conversation panel matches messages.html exactly.
//
// On a successful send the parent server component is revalidated, so the new
// message appears in the panel without a manual refetch here. The textarea
// resets on send (matching the reference's input.value="" behavior).

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendMessage } from "./actions";

const MAX_BYTES = 1_000_000; // ~1 MB raw binary (≈1.4 MB base64)

function Reset({ reset }: { reset: () => void }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) reset();
    wasPending.current = pending;
  }, [pending, reset]);
  return null;
}

export function ConvoComposer({
  threadId,
  ar,
}: {
  threadId: string;
  ar: boolean;
}) {
  const [body, setBody] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
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
      if (typeof result === "string") {
        setImageDataUrl(result);
        setImageName(file.name);
      }
    };
    reader.onerror = () => setError(ar ? "فشل قراءة الملف." : "Failed to read the file.");
    reader.readAsDataURL(file);
  };

  const clearAttach = () => {
    setImageDataUrl("");
    setImageName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const hasContent = body.trim().length > 0 || imageDataUrl.length > 0;

  return (
    <form className="ms-composer" action={sendMessage}>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="imageUrl" value={imageDataUrl} />

      <div className={`ms-attach-preview${imageDataUrl ? " show" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageDataUrl || undefined} alt="" />
        <span className="nm">{imageName}</span>
        <button type="button" className="rm" aria-label={ar ? "إزالة" : "Remove"} onClick={clearAttach}>
          ×
        </button>
      </div>

      {error ? (
        <div role="alert" style={{ color: "#cf9384", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      ) : null}

      <div className="ms-composer-row">
        <button
          type="button"
          className="ms-iconbtn"
          title={ar ? "إرفاق صورة" : "Attach image"}
          aria-label={ar ? "إرفاق صورة" : "Attach image"}
          onClick={() => fileRef.current?.click()}
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <textarea
          ref={taRef}
          name="body"
          className="ms-input"
          rows={1}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 110) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (hasContent) (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }}
          placeholder={ar ? "اكتب رسالة… (Enter للإرسال)" : "Type a message… (Enter to send)"}
        />
        <Reset
          reset={() => {
            setBody("");
            clearAttach();
            setError(null);
            if (taRef.current) taRef.current.style.height = "auto";
          }}
        />
        <button className="ms-send" type="submit" title={ar ? "إرسال" : "Send"} disabled={!hasContent}>
          ➤
        </button>
      </div>
    </form>
  );
}
