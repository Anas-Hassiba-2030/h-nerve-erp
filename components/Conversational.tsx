// components/Conversational.tsx
//
// The Voice & Conversational Layer overlay.
//
// Triggered by ⌘J (or Ctrl+J). Slides up from the bottom in 280ms with an
// ink-on-cream split: the user's input docks at the top, the brain's
// answers write themselves line-by-line below. ESC closes.
//
// Aesthetic: Brutalist Confidence per docs/DESIGN-SKILL.md §1.H —
// stark black, electric yellow accent, mono everything, 0px corners,
// hard offset shadows, all-caps mono headers. Intentionally jarring next
// to the Heritage rest of the app: the user knows they're talking to the
// engine, not the dashboard.
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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  X,
  Mic,
  MicOff,
  CornerDownLeft,
  Volume2,
  VolumeX,
  Sparkle,
} from "lucide-react";

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
type Turn = {
  role: "user" | "brain";
  text: string;
  ts: string;
  citations?: Citation[];
  confidence?: number;
  stub?: boolean;
  ms?: number;
};
// The currently-spoken word position is held in a sibling state so it can
// update on every speech boundary event without invalidating the reveal
// timer's effect (which depends on `turns`).
type SpokenPos = { turnIndex: number; wordIndex: number } | null;

const SESSION_KEY = "h_nerve_converse_session_v1";

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
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const [listening, setListening] = useState(false);
  const [revealedTurnIndex, setRevealedTurnIndex] = useState<number | null>(
    null,
  );
  const [revealedChars, setRevealedChars] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [spokenPos, setSpokenPos] = useState<SpokenPos>(null);
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }, []);

  // ⌘J / Ctrl+J toggle. ⌘K is reserved for CommandPalette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isJ = e.key === "j" || e.key === "J";
      if (isJ && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        // Stop any in-flight TTS
        try {
          window.speechSynthesis?.cancel();
        } catch {}
        try {
          recognitionRef.current?.stop?.();
        } catch {}
      }
    }
    // Custom event for the CommandPalette "Ask the brain" entry.
    function onAsk() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("h-nerve:converse:open", onAsk as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(
        "h-nerve:converse:open",
        onAsk as EventListener,
      );
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  // Auto-scroll transcript to bottom on new turn
  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [turns.length, revealedChars]);

  // Line-by-line reveal of the latest brain turn.
  // Note: we deliberately keep `turns` out of this dependency array so the
  // reveal timer isn't reset every time the speech-synthesis word
  // boundary fires (which would otherwise stall the typewriter at the
  // first word).
  useEffect(() => {
    if (revealedTurnIndex == null) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      let done = false;
      setRevealedChars((c) => {
        // Read live text length via setTurns reader closure
        const turn = turnsRef.current[revealedTurnIndex];
        if (!turn || turn.role !== "brain") {
          done = true;
          return c;
        }
        if (c >= turn.text.length) {
          done = true;
          return c;
        }
        return Math.min(turn.text.length, c + 2);
      });
      if (!done) window.setTimeout(tick, 22);
    };
    const id = window.setTimeout(tick, 22);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [revealedTurnIndex]);

  // Keep a ref to turns so the reveal tick can read text length without
  // depending on the array reference.
  const turnsRef = useRef<Turn[]>(turns);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Voice synthesis with word tracker
  const speakAnswer = useCallback(
    (turnIndex: number, text: string) => {
      if (!voiceOut) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
      } catch {}
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = ar ? "ar-SA" : "en-US";
      utter.rate = 1.02;
      utter.pitch = 1.0;
      utter.volume = 0.95;

      // Word boundaries are reported as charIndex offsets into utter.text.
      // Map each charIndex to a word-counter position.
      // Pre-compute the cumulative word index for every character.
      const wordEdges: number[] = [];
      let inWord = false;
      let count = -1;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (/\s/.test(c) || c === "[" || c === "]") {
          if (inWord) {
            inWord = false;
          }
        } else {
          if (!inWord) {
            inWord = true;
            count++;
          }
        }
        wordEdges.push(count);
      }

      utter.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name && e.name !== "word") return;
        const wi = wordEdges[Math.min(e.charIndex, wordEdges.length - 1)] ?? -1;
        setSpokenPos({ turnIndex, wordIndex: wi });
      };
      utter.onend = () => {
        setSpokenPos((cur) =>
          cur && cur.turnIndex === turnIndex ? null : cur,
        );
      };
      try {
        window.speechSynthesis.speak(utter);
      } catch {}
    },
    [voiceOut, ar],
  );

  // Submit a question
  const submit = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || pending) return;
      setPending(true);
      const userTurn: Turn = {
        role: "user",
        text: q,
        ts: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, userTurn]);
      setDraft("");
      try {
        const res = await fetch("/api/converse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            question: q,
            scope: "default",
            locale: ar ? "ar" : "en",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "request failed");
        const brainTurn: Turn = {
          ...json.brainTurn,
        };
        setTurns((prev) => {
          const next = [...prev, brainTurn];
          const idx = next.length - 1;
          // Kick off the line-by-line reveal animation
          setRevealedTurnIndex(idx);
          setRevealedChars(0);
          // Speak after a tiny delay so the reveal has time to start
          window.setTimeout(() => speakAnswer(idx, brainTurn.text), 380);
          return next;
        });
      } catch (e: any) {
        const errorTurn: Turn = {
          role: "brain",
          text: ar
            ? `تعذّر الوصول إلى الدماغ: ${e?.message ?? ""}`
            : `Brain unreachable: ${e?.message ?? ""}`,
          ts: new Date().toISOString(),
          stub: true,
          confidence: 0,
        };
        setTurns((prev) => {
          const next = [...prev, errorTurn];
          setRevealedTurnIndex(next.length - 1);
          setRevealedChars(errorTurn.text.length);
          return next;
        });
      } finally {
        setPending(false);
      }
    },
    [pending, sessionId, ar, speakAnswer],
  );

  // Voice in
  const toggleListen = useCallback(() => {
    if (listening) {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
      setListening(false);
      return;
    }
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      // No SR support — flash a toast-like message in the draft
      setDraft(
        ar
          ? "المتصفح لا يدعم التعرف الصوتي."
          : "Your browser doesn't support voice input.",
      );
      return;
    }
    const r = new SR();
    r.lang = ar ? "ar-SA" : "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setDraft((finalText || interim).trim());
      if (finalText) {
        // small pause before submit so the user sees the recognized text
        window.setTimeout(() => submit(finalText), 220);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [listening, ar, submit]);

  if (!open) return null;

  // Slice the latest brain turn at the reveal cursor
  const visibleTurns = turns.map((t, i) => {
    if (i === revealedTurnIndex && t.role === "brain") {
      return { ...t, text: t.text.slice(0, revealedChars) };
    }
    return t;
  });

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
  );
}
