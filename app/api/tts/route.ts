// app/api/tts/route.ts
//
// HTTP entrypoint for the brain's spoken voice. The conversational overlay is a
// client component, so it POSTs the answer text here and plays back the audio.
//
// POST /api/tts  { text, lang? }
//   200 audio/mpeg  — synthesized speech (when a cloud TTS provider is configured)
//   501             — no provider configured / call failed → client falls back
//                     to the browser's built-in speechSynthesis voice
//
// See lib/ai/tts.ts for the provider seam (ElevenLabs when ELEVENLABS_API_KEY
// is set, otherwise null → browser-voice fallback).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { synthesizeSpeech } from "@/lib/ai/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const text = String(body?.text ?? "").trim();
  const lang: "ar" | "en" = body?.lang === "ar" ? "ar" : "en";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = await synthesizeSpeech(text, lang);
  if (!result) {
    // No provider configured (or it failed). 501 signals the client to use its
    // browser-voice fallback rather than treating this as a hard error.
    return new NextResponse(null, { status: 501 });
  }

  return new NextResponse(result.audio, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "no-store",
    },
  });
}
