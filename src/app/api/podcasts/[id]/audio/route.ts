import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/podcasts/[id]/audio — stream the base64-stored WAV audio.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const podcast = await db.podcast.findUnique({ where: { id } });
    if (!podcast) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (!podcast.audioBase64) {
      return NextResponse.json({ error: 'no audio generated' }, { status: 404 });
    }
    const buffer = Buffer.from(podcast.audioBase64, 'base64');
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
