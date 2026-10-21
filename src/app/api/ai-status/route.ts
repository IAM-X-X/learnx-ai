import { NextResponse } from 'next/server';
import { chatComplete } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/ai-status — quick diagnostic that tells you which AI provider is
// configured and whether it's actually working. Useful for debugging on
// Vercel: if `provider: 'none'` and `working: false`, you need to set
// `GROQ_API_KEY` env var on Vercel.
export async function GET() {
  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
  const hasGroq = !!process.env.GROQ_API_KEY;

  let provider: 'zai' | 'groq' | 'none';
  if (isVercel) {
    provider = hasGroq ? 'groq' : 'none';
  } else {
    provider = 'zai';
  }

  let working = false;
  let lastError: string | null = null;
  let latencyMs: number | null = null;
  let sample = '';

  try {
    const t0 = Date.now();
    sample = await chatComplete(
      'You are a helpful assistant. Reply with exactly one word.',
      'Reply with the word: pong',
    );
    latencyMs = Date.now() - t0;
    working = !!sample;
  } catch (e) {
    lastError = (e as Error).message;
  }

  return NextResponse.json({
    environment: isVercel ? 'vercel' : 'sandbox',
    provider,
    groqConfigured: hasGroq,
    working,
    latencyMs,
    sample: sample.slice(0, 100),
    lastError,
    help: !working
      ? isVercel
        ? 'On Vercel, set GROQ_API_KEY env var (free at https://console.groq.com).'
        : 'In the sandbox, Z.AI should work. Check the dev.log for the error.'
      : null,
  });
}
