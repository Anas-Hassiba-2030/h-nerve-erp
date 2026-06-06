// lib/ai/tts.ts — cloud text-to-speech seam (the "real voice").
//
// When ELEVENLABS_API_KEY is set, the brain's spoken answers use a real,
// designed female voice instead of whatever voices the user's browser happens
// to ship. The voice is configurable:
//   ELEVENLABS_API_KEY    — your ElevenLabs key (required to enable)
//   ELEVENLABS_VOICE_ID   — the voice to speak with (defaults to a young, soft
//                           female voice from the ElevenLabs shared library)
//   ELEVENLABS_MODEL_ID   — defaults to eleven_multilingual_v2 (handles ar + en)
//
// With NO key set, synthesizeSpeech() returns null and the client gracefully
// falls back to the browser's built-in speechSynthesis voice. This mirrors the
// provider seam in lib/brain/embeddings.ts: real provider when configured,
// safe local fallback otherwise — so nothing breaks when the key is absent.

export type TtsResult = { audio: ArrayBuffer; contentType: string } | null;

// "Bella" — a young, soft, warm female voice from the ElevenLabs default
// library. Override with ELEVENLABS_VOICE_ID to use any custom/cloned voice.
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

export function ttsConfig() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return {
    enabled: Boolean(key),
    apiKey: key ?? null,
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID,
    modelId: process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
  };
}

/**
 * Synthesize `text` to spoken audio via ElevenLabs. Returns the audio bytes +
 * content-type, or null when no provider is configured or the call fails (the
 * caller then falls back to the browser voice). Never throws.
 */
export async function synthesizeSpeech(
  text: string,
  _lang: "ar" | "en",
): Promise<TtsResult> {
  const cfg = ttsConfig();
  if (!cfg.enabled || !cfg.apiKey) return null;

  // Bound length so a runaway answer can't drive cost or latency.
  const clean = (text || "").replace(/\s+/g, " ").trim().slice(0, 2500);
  if (!clean) return null;

  // Don't let a hung provider hang the request — abort and fall back.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": cfg.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: clean,
          model_id: cfg.modelId,
          // Soft, warm, expressive young-female delivery. Tunable:
          //  • lower stability  → more emotional / playful
          //  • higher style     → more expressive
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.45,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const audio = await res.arrayBuffer();
    if (!audio || audio.byteLength === 0) return null;
    return { audio, contentType: res.headers.get("Content-Type") || "audio/mpeg" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
