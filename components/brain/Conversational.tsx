// components/Conversational.tsx
//
// The Voice & Conversational Layer overlay.
//
// Triggered by ⌘J (or Ctrl+J). A centered night-emerald panel with two
// columns: a cosmic "thinking brain" orb (العقل المفكّر) beside the chat.
// ESC closes.
//
// Aesthetic: the Claude Design "مستشار الدماغ" advisor
// (docs/design/system/advisor.html) — night-emerald field, gold accents,
// brain answers in the display serif with gold citation chips. Ported into
// the live app so the conversational overlay matches the standalone advisor.
//
// Voice in/out via Web Speech API (SpeechRecognition + speechSynthesis).
// While the brain reads aloud, an ochre underline tracks the spoken word
// in real time using the SpeechSynthesisUtterance "boundary" event.
//
// Citations are first-class. Tab cycles through them; Enter on a focused
// citation drills through to its href. Click works too.
//
// Phase 15 of docs/PHASES-INTELLIGENCE.md.

"use client";

import {
  X,
  Mic,
  MicOff,
  CornerDownLeft,
  Volume2,
  VolumeX,
  Sparkle,
  SquarePen,
} from "lucide-react";
import { useConversational } from "./useConversational";

type Citation = {
  id: string;
  source:
    | "INSIGHT"
    | "PLAN"
    | "INTEGRATION"
    | "BOOKING"
    | "BATCH"
    | "FORECAST"
    | "STAT";
  label: string;
  value?: string;
  href: string;
};

// Render brain text with citation chips replacing [c1] [c2] tokens.
// Splits the string into spans so we can also track word-by-word spoken
// position when speechSynthesis fires boundary events.
function renderBrainText(
  text: string,
  citations: Citation[] | undefined,
  spokenWordIndex: number,
  onCiteFocus: (cite: Citation) => void,
) {
  const cites = citations ?? [];
  // First, split the text into segments alternating with citation refs.
  const re = /\[c(\d+)\]/g;
  const segments: Array<
    { type: "text"; value: string } | { type: "cite"; cite: Citation }
  > = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const match = m;
    if (match.index > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }
    const cite = cites.find((c) => c.id === `c${match[1]}`);
    if (cite) segments.push({ type: "cite", cite });
    else segments.push({ type: "text", value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }

  // Then split each text segment into words so the boundary event can
  // track which word is being spoken.
  let wordCursor = 0;
  return segments.map((seg, i) => {
    if (seg.type === "cite") {
      return (
        <button
          key={`s${i}`}
          type="button"
          className="cv-cite"
          data-source={seg.cite.source}
          onClick={() => {
            onCiteFocus(seg.cite);
            window.location.assign(seg.cite.href);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onCiteFocus(seg.cite);
              window.location.assign(seg.cite.href);
            }
          }}
          tabIndex={0}
          aria-label={`${seg.cite.label}${seg.cite.value ? ` ${seg.cite.value}` : ""}`}
        >
          <span className="cv-cite-id">{seg.cite.id.toUpperCase()}</span>
          <span className="cv-cite-label">{seg.cite.label}</span>
          {seg.cite.value ? (
            <span className="cv-cite-value">{seg.cite.value}</span>
          ) : null}
        </button>
      );
    }
    // Text segment — split into words to support the spoken underline
    const words = seg.value.split(/(\s+)/);
    return (
      <span key={`s${i}`}>
        {words.map((w, wi) => {
          if (/^\s+$/.test(w)) return <span key={wi}>{w}</span>;
          const idx = wordCursor++;
          const live = idx === spokenWordIndex;
          return (
            <span key={wi} className={live ? "cv-word is-live" : "cv-word"}>
              {w}
            </span>
          );
        })}
      </span>
    );
  });
}

export function Conversational({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const {
    ar,
    open,
    setOpen,
    draft,
    setDraft,
    pending,
    voiceOut,
    setVoiceOut,
    listening,
    inputRef,
    transcriptRef,
    spokenPos,
    submit,
    toggleListen,
    visibleTurns,
    clearConversation,
    hasHistory,
  } = useConversational({ locale });

  if (!open) return null;

  return (
    <div
      className="cv-root"
      data-open="true"
      role="dialog"
      aria-modal="true"
      aria-label={ar ? "محادثة الدماغ" : "Conversational brain"}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="cv-panel">
        {/* Header bar */}
        <header className="cv-head">
          <div className="cv-head-mark">
            <Sparkle className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>{ar ? "تحدّث مع الدماغ" : "TALK TO THE BRAIN"}</span>
          </div>
          <div className="cv-head-meta">
            <kbd className="cv-kbd">⌘ J</kbd>
            <span className="cv-head-sep">·</span>
            <kbd className="cv-kbd">ESC</kbd>
            {hasHistory ? (
              <button
                type="button"
                className="cv-head-mute"
                onClick={clearConversation}
                aria-label={ar ? "محادثة جديدة" : "New chat"}
                title={ar ? "محادثة جديدة (يمسح المحفوظ)" : "New chat (clears saved history)"}
              >
                <SquarePen className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}
            <button
              type="button"
              className="cv-head-mute"
              onClick={() => setVoiceOut((v) => !v)}
              aria-pressed={voiceOut}
              aria-label={ar ? "كتم الصوت" : "Mute voice"}
              title={ar ? "صوت / صامت" : "Voice / mute"}
            >
              {voiceOut ? (
                <Volume2 className="h-4 w-4" strokeWidth={2} />
              ) : (
                <VolumeX className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              className="cv-head-close"
              onClick={() => setOpen(false)}
              aria-label={ar ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Body — two columns: the thinking orb + the chat */}
        <div className="cv-body">
          {/* Orb side — the cosmic "thinking brain" (Claude Design advisor) */}
          <div className="cv-orb-side" aria-hidden="true">
            <div className="cv-orb-aura" />
            <div className="cv-orb-wrap">
              <div className="cv-orb-label">
                {ar ? "العقل المفكّر" : "THE THINKING BRAIN"}
              </div>
              <div className={`cv-orb ${pending ? "is-thinking" : ""}`}>
                <span className="cv-orb-ring" />
              </div>
              <div className="cv-orb-state">
                {pending
                  ? ar ? "يفكّر…" : "thinking…"
                  : ar ? "في انتظار سؤالك" : "awaiting your question"}
              </div>
            </div>
          </div>

          {/* Chat side — transcript + composer */}
          <div className="cv-chat-side">
        {/* Transcript */}
        <div className="cv-transcript" ref={transcriptRef}>
          {visibleTurns.length === 0 ? (
            <div className="cv-empty">
              <p className="cv-empty-eyebrow">
                {ar ? "هذه واجهة المحادثة" : "CONVERSATION INTERFACE"}
              </p>
              <h2 className="cv-empty-headline">
                {ar
                  ? "اكتب أو تكلّم. الدماغ يجاوبك بثلاث جمل وإحالات."
                  : "Type or talk. The brain answers in three sentences with citations."}
              </h2>
              <ul className="cv-empty-suggestions">
                {(ar
                  ? [
                      "كيف نحن في أهداف الألبان للربع الثاني؟",
                      "ما الذي يستدعي قراري الآن؟",
                      "أعطني نظرة عامة عن أرينا اليوم.",
                    ]
                  : [
                      "How are we tracking on Q2 dairy targets?",
                      "What needs my decision right now?",
                      "Give me Arena's pulse today.",
                    ]
                ).map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className="cv-suggestion"
                      onClick={() => {
                        setDraft(s);
                        submit(s);
                      }}
                    >
                      <CornerDownLeft className="h-3 w-3" strokeWidth={2} />
                      <span>{s}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="cv-turns">
              {visibleTurns.map((t, i) => (
                <li
                  key={i}
                  className="cv-turn"
                  data-role={t.role}
                  data-stub={t.stub ? "true" : "false"}
                >
                  <span className="cv-turn-mark">
                    {t.role === "user"
                      ? ar
                        ? "أنت"
                        : "YOU"
                      : ar
                      ? "الدماغ"
                      : "BRAIN"}
                  </span>
                  <div className="cv-turn-body">
                    {t.role === "brain" ? (
                      <p className="cv-answer">
                        {renderBrainText(
                          t.text,
                          t.citations,
                          spokenPos && spokenPos.turnIndex === i
                            ? spokenPos.wordIndex
                            : -1,
                          () => {},
                        )}
                        {/* Confidence underline */}
                        {t.confidence != null ? (
                          <span
                            aria-hidden
                            className="cv-confidence"
                            style={{
                              width: `${Math.round(t.confidence * 100)}%`,
                            }}
                          />
                        ) : null}
                      </p>
                    ) : (
                      <p className="cv-question">{t.text}</p>
                    )}
                    {t.role === "brain" && t.citations && t.citations.length > 0 ? (
                      <p className="cv-foot">
                        <span className="cv-foot-label">
                          {ar ? "إحالات" : "CITATIONS"}
                        </span>
                        <span className="cv-foot-count">
                          {t.citations.length}
                        </span>
                        {t.stub ? (
                          <span className="cv-foot-stub">
                            {ar ? "وضع تجريبي" : "STUB"}
                          </span>
                        ) : null}
                        {t.ms ? (
                          <span className="cv-foot-ms">{t.ms}ms</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
              {pending ? (
                <li className="cv-turn cv-turn-thinking" data-role="brain">
                  <span className="cv-turn-mark">
                    {ar ? "الدماغ" : "BRAIN"}
                  </span>
                  <div className="cv-turn-body">
                    <p className="cv-thinking">
                      <span className="cv-thinking-dot" />
                      <span className="cv-thinking-dot" />
                      <span className="cv-thinking-dot" />
                    </p>
                  </div>
                </li>
              ) : null}
            </ol>
          )}
        </div>

        {/* Composer */}
        <form
          className="cv-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
        >
          <textarea
            ref={inputRef}
            className="cv-input"
            placeholder={
              ar
                ? "اكتب سؤالك… أو اضغط على المايكروفون"
                : "Type your question… or press the mic"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            rows={1}
            spellCheck={false}
            disabled={pending}
          />
          <button
            type="button"
            className={`cv-mic ${listening ? "is-live" : ""}`}
            onClick={toggleListen}
            aria-pressed={listening}
            aria-label={ar ? "صوت" : "Voice input"}
          >
            {listening ? (
              <MicOff className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
          <button
            type="submit"
            className="cv-send"
            disabled={pending || !draft.trim()}
            aria-label={ar ? "إرسال" : "Send"}
          >
            <CornerDownLeft className="h-4 w-4" strokeWidth={2.5} />
            <span>{ar ? "اسأل" : "ASK"}</span>
          </button>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}
