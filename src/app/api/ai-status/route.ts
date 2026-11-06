import { NextResponse } from 'next/server';
import { chatComplete } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/ai-status — quick diagnostic that tells you which AI provider is
// configured and whether it's actually working. Useful for debugging on any
// public cloud (Vercel, Cloudflare Pages, Netlify, etc.): if `provider: 'none'`
// and `working: false`, you need to set the `GROQ_API_KEY` env var.
export async function GET() {
  // Detect any public cloud platform (not just Vercel)
  const platform = detectPlatform();
  const isPublicCloud = platform !== 'sandbox';
  const hasGroq = !!process.env.GROQ_API_KEY;

  let provider: 'zai' | 'groq' | 'none';
  if (isPublicCloud) {
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
    environment: platform,
    provider,
    groqConfigured: hasGroq,
    working,
    latencyMs,
    sample: sample.slice(0, 100),
    lastError,
    help: !working
      ? isPublicCloud
        ? `On ${platform}, set GROQ_API_KEY env var (free at https://console.groq.com/keys). See /settings → AI Engine Status.`
        : 'In the sandbox, Z.AI should work. Check the dev.log for the error.'
      : null,
  });
}

/** Returns the hosting platform name. */
function detectPlatform(): string {
  if (process.env.CF_PAGES === '1' || !!process.env.CF_PAGES_COMMIT_HASH) return 'cloudflare';
  if (process.env.VERCEL === '1' || !!process.env.VERCEL_ENV) return 'vercel';
  if (process.env.NETLIFY === 'true') return 'netlify';
  if (process.env.RENDER) return 'render';
  return 'sandbox';
}
