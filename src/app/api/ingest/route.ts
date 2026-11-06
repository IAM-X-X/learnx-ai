import { NextRequest, NextResponse } from 'next/server';
import { invokeFunction, isPublicCloud } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/ingest — extract text from a URL OR an uploaded file (TXT/MD).
// body can be:
//   { url: string }                              — extract web page content
//   { fileBase64: string, fileName?: string }    — extract file content (TXT/MD/JSON/CSV)
//
// NOTE: PDF parsing is NOT available on Cloudflare Pages (Edge Runtime) because
// pdf-parse uses Node.js APIs (node:module, createRequire) that aren't available
// in the Edge Runtime. PDF uploads return a clear error. TXT/MD/CSV/JSON files
// work fine. The Z.AI page_reader (URL ingestion) also only works in the sandbox.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ----- URL ingestion -----
    if (body.url && typeof body.url === 'string') {
      let normalized = body.url.trim();
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = 'https://' + normalized;
      }
      try {
        new URL(normalized);
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }

      let result;
      try {
        result = await invokeFunction<{ data?: { title?: string; html?: string; url?: string; publishedTime?: string } }>('page_reader', { url: normalized });
      } catch (aiErr) {
        console.error('AI call failed:', aiErr);
        return NextResponse.json(
          {
            error: 'AI service unavailable.',
            reason:
              isPublicCloud()
                ? 'URL ingestion uses the Z.AI internal page_reader function, which is only reachable from the dev sandbox. It is not available on any public cloud (Vercel, Cloudflare Pages, Netlify, etc.). Try a file upload (TXT/MD) instead, or run locally.'
                : (aiErr as Error).message,
          },
          { status: 503 },
        );
      }
      const data = result?.data;
      if (!data || !data.html) {
        return NextResponse.json({ error: 'Could not extract content from that URL.' }, { status: 422 });
      }
      const text = data.html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      return NextResponse.json({
        title: data.title || normalized,
        text,
        url: data.url || normalized,
        publishedTime: data.publishedTime,
      });
    }

    // ----- File ingestion (TXT / MD / CSV / JSON — NO PDF on Edge Runtime) -----
    if (body.fileBase64 && typeof body.fileBase64 === 'string') {
      const fileName = (body.fileName as string) || 'upload';
      const clean = body.fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(clean, 'base64');
      const lower = fileName.toLowerCase();

      let text = '';

      if (lower.endsWith('.pdf')) {
        // PDF parsing requires Node.js APIs (pdf-parse uses node:module,
        // createRequire) that aren't available in the Edge Runtime.
        return NextResponse.json(
          {
            error: 'PDF parsing is not available on Cloudflare Pages (Edge Runtime). Please paste the text directly, or upload a TXT/MD/CSV/JSON file instead.',
            hint: 'You can copy text from your PDF using any PDF reader (Ctrl+A, Ctrl+C), then paste it into the "Paste text" option.',
          },
          { status: 422 },
        );
      }

      // plain text / markdown / csv / json — all work fine on Edge Runtime
      text = buffer.toString('utf-8').replace(/\s+/g, ' ').trim();

      if (!text) {
        return NextResponse.json({ error: 'No text could be extracted from that file.' }, { status: 422 });
      }

      // Derive a title from the filename
      const title = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80);

      return NextResponse.json({
        title,
        text: text.slice(0, 20000),
        url: '',
      });
    }

    return NextResponse.json({ error: 'Provide either a `url` or a `fileBase64`.' }, { status: 400 });
  } catch (e) {
    console.error('ingest error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
