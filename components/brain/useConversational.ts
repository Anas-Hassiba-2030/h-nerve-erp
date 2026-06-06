// useConversational — stateful logic for the Conversational overlay.
//
// Extracted verbatim from Conversational.tsx: owns the open/transcript
// state, the ⌘J/ESC keybind, voice in (SpeechRecognition) and voice out
// (speechSynthesis with word tracking), the line-by-line reveal timer, and
// the question submit flow. The component stays mostly-rendering.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
export type Turn = {
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

// Pick a young, soft, feminine voice for the spoken answer. Browsers ship
// different voice sets, so we match the locale first, then walk an ORDERED
// preference list of the youngest / cutest-sounding female voices available
// across Chrome / Edge / Safari / Android (and Arabic), falling back to any
// female-named voice, then any locale voice, then anything.
function pickWarmFemaleVoice(
  voices: SpeechSynthesisVoice[],
  ar: boolean,
): SpeechSynthesisVoice | null {
  if (!voices?.length) return null;
  const prefix = ar ? "ar" : "en";
  const inLocale = voices.filter((v) => v.lang?.toLowerCase().startsWith(prefix));
  const pool = inLocale.length ? inLocale : voices;

  // Ordered "young + cute + soft" preference. The first voice in the pool that
  // matches the earliest pattern wins, so the most youthful-sounding voices are
  // chosen before generic female ones.
  const PREFERRED: RegExp[] = ar
    ? [
        // Arabic young-female voices (Edge/Windows + Google + common names).
        /salma/i, /amany/i, /hoda/i, /laila|layla/i, /hala/i, /maryam/i, /zahra/i,
        /google.*arabic/i,
      ]
    : [
        // English young, soft, feminine voices in priority order.
        /jenny/i,          // Microsoft Jenny — young, warm, soft
        /aria/i,           // Microsoft Aria — youthful
        /ava/i,            // Apple Ava (premium) — young
        /samantha/i,       // Apple Samantha — warm female
        /serena/i,
        /allison/i,
        /zira/i,           // Microsoft Zira — clear female
        /michelle|sonia/i,
        /google us english/i,
        /google uk english female/i,
      ];

  // Generic feminine fallback patterns.
  const FEMALE =
    /female|woman|girl|samantha|victoria|karen|tessa|fiona|moira|serena|allison|ava|susan|zira|aria|jenny|michelle|sonia|google (uk|us) english|hoda|salma|amira|laila|hala|maryam|zahra/i;

  for (const pat of PREFERRED) {
    const hit = pool.find((v) => pat.test(v.name));
    if (hit) return hit;
  }
  return (
    pool.find((v) => FEMALE.test(v.name)) ||
    pool.find((v) => /google/i.test(v.name)) ||
    pool[0] ||
    voices[0] ||
    null
  );
}

export function useConversational({ locale = "ar" }: { locale?: "ar" | "en" }) {
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
  // Available TTS voices load asynchronously; cache them + refresh on change.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // The currently-playing cloud-TTS audio element (when the real voice is used),
  // so we can stop it on close / ESC / new answer. Null when idle or when the
  // browser-voice fallback is being used.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [spokenPos, setSpokenPos] = useState<SpokenPos>(null);

  // Load the browser's TTS voices (populated asynchronously) so we can pick a
  // warm female voice for spoken answers.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
  }, []);
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
        // Stop any in-flight TTS (browser voice + cloud audio)
        try {
          window.speechSynthesis?.cancel();
        } catch {}
        try {
          audioRef.current?.pause();
        } catch {}
        audioRef.current = null;
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

  // Stop any playback when the overlay closes or the voice is muted — covers
  // the ✕ close button (not just ESC) and the speaker toggle.
  useEffect(() => {
    if (open && voiceOut) return;
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    try {
      audioRef.current?.pause();
    } catch {}
    audioRef.current = null;
  }, [open, voiceOut]);

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
    async (turnIndex: number, text: string) => {
      if (!voiceOut) return;
      if (typeof window === "undefined") return;
      // Stop anything already playing (browser speech or cloud audio).
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      try {
        audioRef.current?.pause();
      } catch {}
      audioRef.current = null;

      // 1) Try the REAL cloud voice first. When a TTS provider is configured
      //    server-side (/api/tts → lib/ai/tts.ts), it returns mp3 audio we play
      //    directly. When it isn't, the route 501s and we fall back to the
      //    browser's built-in voice below — so nothing breaks without a key.
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: ar ? "ar" : "en" }),
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 0) {
            const blob = new Blob([buf], {
              type: res.headers.get("Content-Type") || "audio/mpeg",
            });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            const cleanup = () => {
              try {
                URL.revokeObjectURL(url);
              } catch {}
              if (audioRef.current === audio) audioRef.current = null;
            };
            audio.onended = () => {
              cleanup();
              setSpokenPos((cur) =>
                cur && cur.turnIndex === turnIndex ? null : cur,
              );
            };
            audio.onerror = cleanup;
            await audio.play();
            return; // real cloud voice is playing — done
          }
        }
      } catch {
        // network / playback failure — fall through to the browser voice
      }

      // 2) Browser-voice fallback (also drives the per-word highlight).
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = ar ? "ar-SA" : "en-US";
      // Warm female voice: a touch slower and higher-pitched for a soft,
      // pleasant delivery rather than the flat default.
      const voice = pickWarmFemaleVoice(
        voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices(),
        ar,
      );
      if (voice) utter.voice = voice;
      // Young, cute, soft delivery: higher pitch reads as more youthful/feminine,
      // and a gently relaxed rate keeps it soft rather than rushed. (Tunable —
      // raise pitch toward 1.6 for cuter, lower toward 1.2 for more mature.)
      utter.rate = 0.96;
      utter.pitch = 1.45;
      utter.volume = 1.0;

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

  // Slice the latest brain turn at the reveal cursor
  const visibleTurns = turns.map((t, i) => {
    if (i === revealedTurnIndex && t.role === "brain") {
      return { ...t, text: t.text.slice(0, revealedChars) };
    }
    return t;
  });

  return {
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
  };
}
