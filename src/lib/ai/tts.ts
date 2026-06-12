// lib/ai/tts.ts — the brain's spoken voice (the "real voice").
//
// FREE BY DEFAULT — no API key required. The spoken answer is synthesized with
// a real, natural female voice (AWS Polly, served via StreamElements' public
// endpoint), which is a big step up from the robotic built-in browser voice.
//
// Pick the voice you like with ONE env var (no code change, no key):
//   TTS_VOICE   — Salli (default — soft, young, cute US female), Kimberly
//                 (breathy), Joanna (warm), Kendra, Amy/Emma (British),
//                 Nicole (Australian). Arabic answers default to Zeina.
//
// OPTIONAL PREMIUM — if you later want studio-grade / custom voices, set an
// ElevenLabs key and it takes over automatically:
//   ELEVENLABS_API_KEY  — enables ElevenLabs
//   ELEVENLABS_VOICE_ID — any voice from your ElevenLabs library
//   ELEVENLABS_MODEL_ID — defaults to eleven_multilingual_v2
//
// synthesizeSpeech() NEVER throws and returns null only when every provider
// fails, in which case the client falls back to the browser voice. So this is
// always safe to call.

export type TtsResult = { audio: ArrayBuffer; contentType: string } | null;

// ── Free provider (StreamElements → AWS Polly), no key ──────────────────────

const STREAMELEMENTS_URL = "https://api.streamelements.com/kappa/v2/speech";
// Default: the softest / youngest-sounding free female voice. Override anytime
// with TTS_VOICE (Kimberly = breathier, Joanna = warmer/mature, Amy = British).
const DEFAULT_FREE_VOICE_EN = "Salli"; // soft, young, cute US female
const DEFAULT_FREE_VOICE_AR = "Zeina"; // the Arabic Polly female voice

/** Split long text into <=maxLen chunks at sentence/word boundaries so the
 *  free endpoint (which caps request length) never truncates the answer. */
function splitForTts(text: string, maxLen = 480): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > maxLen) {
    // Prefer a sentence end, then a space, before the hard limit.
    let cut = rest.lastIndexOf(". ", maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf("، ", maxLen); // Arabic comma
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf(" ", maxLen);
    if (cut <= 0) cut = maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function concatAudio(parts: Uint8Array[], contentType: string): TtsResult {
  if (!parts.length) return null;
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return { audio: out.buffer, contentType };
}

async function synthesizeFree(text: string, lang: "ar" | "en"): Promise<TtsResult> {
  const voice =
    process.env.TTS_VOICE?.trim() ||
    (lang === "ar" ? DEFAULT_FREE_VOICE_AR : DEFAULT_FREE_VOICE_EN);
  const chunks = splitForTts(text);
  if (!chunks.length) return null;

  const parts: Uint8Array[] = [];
  for (const chunk of chunks) {
    const url = `${STREAMELEMENTS_URL}?voice=${encodeURIComponent(
      voice,
    )}&text=${encodeURIComponent(chunk)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        // A UA header avoids the occasional bot block on the public endpoint.
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HNerve/1.0)" },
      });
      if (!res.ok) break; // play whatever we have so far
      const ab = await res.arrayBuffer();
      if (ab.byteLength) parts.push(new Uint8Array(ab));
    } catch {
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  return concatAudio(parts, "audio/mpeg");
}

// ── Optional premium provider (ElevenLabs), only when a key is set ──────────

const EL_DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // "Bella" — young soft female
const EL_DEFAULT_MODEL_ID = "eleven_multilingual_v2";

async function synthesizeElevenLabs(text: string): Promise<TtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || EL_DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || EL_DEFAULT_MODEL_ID;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Synthesize `text` to spoken audio. Premium (ElevenLabs) is used when a key is
 * set; otherwise the FREE Polly voice is used. Returns null only if everything
 * fails (caller then uses the browser voice). Never throws.
 */
export async function synthesizeSpeech(
  text: string,
  lang: "ar" | "en",
): Promise<TtsResult> {
  const clean = (text || "").replace(/\s+/g, " ").trim().slice(0, 2500);
  if (!clean) return null;

  // Premium first when configured — fall back to free if it fails.
  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    const premium = await synthesizeElevenLabs(clean);
    if (premium) return premium;
  }
  return synthesizeFree(clean, lang);
}
