import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateNotes } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// POST /api/study-sets/[id]/notes — generate (or regenerate) notes from the set's source.
// Saves a snapshot of the *previous* notes to NoteVersion before overwriting.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const difficulty = (body.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'intermediate';
    const length = (body.length as 'brief' | 'standard' | 'detailed') || 'standard';
    const language = (body.language as string) || 'en';

    const set = await db.studySet.findUnique({ where: { id } });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Snapshot the previous notes before regenerating (if any)
    if (set.notes && set.notes.trim().length > 0) {
      await db.noteVersion.create({
        data: {
          studySetId: id,
          notes: set.notes,
          difficulty,
          length,
          language,
        },
      });
      // keep at most the 10 most recent versions
      const versions = await db.noteVersion.findMany({
        where: { studySetId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (versions.length > 10) {
        const toDelete = versions.slice(10).map((v) => v.id);
        await db.noteVersion.deleteMany({ where: { id: { in: toDelete } } });
      }
    }

    const notes = await generateNotes({
      title: set.title,
      source: set.sourceContent,
      difficulty,
      length,
      language,
    });

    const updated = await db.studySet.update({
      where: { id },
      data: { notes },
    });

    await db.studyActivity.create({
      data: { studySetId: id, type: 'notes', detail: `Generated notes (${length}, ${difficulty})` },
    });

    return NextResponse.json({ studySet: updated });
  } catch (e) {
    console.error('notes generation error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
