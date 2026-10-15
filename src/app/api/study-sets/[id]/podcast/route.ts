import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePodcastScript, synthesizeSpeechChunks } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/study-sets/[id]/podcast — generate a podcast script (and optionally audio).
// body: { generateAudio?: boolean, voice?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const generateAudio = body.generateAudio === true;
    const voice = (body.voice as string) || 'jam';

    const set = await db.studySet.findUnique({ where: { id } });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const notesSource = set.notes || set.sourceContent;
    const script = await generatePodcastScript({ title: set.title, notes: notesSource });

    let audioBase64 = '';
    let durationSec = 0;
    let audioError = '';
    if (generateAudio) {
      try {
        const { buffer, durationSec: d } = await synthesizeSpeechChunks(script, voice, 1.0);
        if (buffer.length === 0) {
          audioError = 'Audio generation failed — the TTS service may be rate-limited. Please try again in a minute.';
        } else {
          audioBase64 = buffer.toString('base64');
          durationSec = d;
        }
      } catch (err) {
        console.error('podcast audio failed', err);
        audioError = (err as Error).message;
      }
    }

    // Replace previous podcasts for the set to keep things tidy
    const podcast = await db.podcast.create({
      data: {
        studySetId: id,
        title: `Podcast: ${set.title}`,
        script,
        audioBase64,
        voice,
        durationSec,
      },
    });

    await db.studyActivity.create({
      data: { studySetId: id, type: 'podcast', detail: `Generated podcast${generateAudio ? (audioBase64 ? ' (with audio)' : ' (audio failed)') : ''}` },
    });

    return NextResponse.json({
      podcast: {
        id: podcast.id,
        studySetId: podcast.studySetId,
        title: podcast.title,
        script: podcast.script,
        hasAudio: !!audioBase64,
        voice: podcast.voice,
        durationSec: podcast.durationSec,
        createdAt: podcast.createdAt.toISOString(),
      },
      audioError: audioError || undefined,
    });
  } catch (e) {
    console.error('podcast generation error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
