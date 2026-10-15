import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/transcribe — accepts base64-encoded audio (from the browser mic)
// and returns the transcribed text using ASR.
// body: { audio: "base64-encoded-data", format?: "wav" | "webm" | "mp3" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const audio = body.audio as string | undefined;
    if (!audio) {
      return NextResponse.json({ error: 'audio (base64) is required' }, { status: 400 });
    }
    // strip any data-URL prefix
    const clean = audio.replace(/^data:[^;]+;base64,/, '');
    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({ file_base64: clean });
    const text = (response as { text?: string }).text ?? '';
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error('transcribe error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
