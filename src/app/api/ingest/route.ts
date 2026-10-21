import { NextRequest, NextResponse } from 'next/server';
import { invokeFunction } from '@/lib/zai-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// pdf-parse v1 runs debug code on import (looking for a test PDF). We work
// around this by importing it lazily inside the handler and disabling the
// debug mode via an env flag.
let _pdfParse: ((buf: Buffer) => Promise<{ text: string }>) | null = null;
async function getPdfParse() {
  if (_pdfParse) return _pdfParse;
  // The debug code in pdf-parse v1 checks `!module.parent`. Setting
  // `isDebugMode` off requires a workaround — we use createRequire to load it.
  const mod = await import('node:module');
  const require = (mod.default || (mod as unknown as { createRequire: (o: string) => NodeRequire })).createRequire(import.meta.url);
  // point to the package's lib directly to avoid the index.js debug block
  const lib = require('pdf-parse/lib/pdf-parse.js');
  _pdfParse = lib.default || lib;
  return _pdfParse;
}

// POST /api/ingest — extract text from a URL OR an uploaded file (PDF/TXT/MD).
// body can be:
//   { url: string }                              — extract web page content
//   { fileBase64: string, fileName?: string }    — extract file content (PDF/TXT/MD)
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
      let result: { data?: { title?: string; html?: string; url?: string; publishedTime?: string } };
      try {
        result = await invokeFunction<{ data?: { title?: string; html?: string; url?: string; publishedTime?: string } }>('page_reader', { url: normalized });
      } catch (aiErr) {
        console.error('AI call failed:', aiErr);
        return NextResponse.json(
          {
            error: 'AI service unavailable.',
            reason:
              process.env.VERCEL === '1'
                ? 'URL ingestion uses the Z.AI internal page_reader function, which is only reachable from the dev sandbox. It is not available on Vercel (or any public cloud). Try a file upload (PDF/TXT/MD) instead, or run locally.'
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

    // ----- File ingestion (PDF / TXT / MD) -----
    if (body.fileBase64 && typeof body.fileBase64 === 'string') {
      const fileName = (body.fileName as string) || 'upload';
      const clean = body.fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(clean, 'base64');
      const lower = fileName.toLowerCase();

      let text = '';
      // PDF
      if (lower.endsWith('.pdf')) {
        try {
          const pdfParse = await getPdfParse();
          const pdfData = await pdfParse(buffer);
          text = (pdfData.text || '').replace(/\s+/g, ' ').trim();
        } catch (e) {
          console.error('pdf parse failed', e);
          return NextResponse.json({ error: 'Could not parse that PDF. It may be scanned or corrupted.' }, { status: 422 });
        }
      } else {
        // plain text / markdown / csv / json
        text = buffer.toString('utf-8').replace(/\s+/g, ' ').trim();
      }

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
