import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateFlashcards } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// POST /api/study-sets/[id]/flashcards — generate flashcards OR add a manual one.
// body: { count?: number }              — AI-generate N cards (replaces existing)
// body: { manual: true, front, back }  — add a single manual card (appends)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Manual add (append)
    if (body.manual === true && body.front && body.back) {
      const card = await db.flashcard.create({
        data: {
          studySetId: id,
          front: String(body.front).trim(),
          back: String(body.back).trim(),
        },
      });
      return NextResponse.json({ flashcard: card });
    }

    // AI generate (replaces existing)
    const count = Math.min(Math.max(Number(body.count) || 10, 1), 30);

    const set = await db.studySet.findUnique({ where: { id } });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const source = [set.notes, set.sourceContent].filter(Boolean).join('\n\n') || set.sourceContent;
    const cards = await generateFlashcards({ source, count });

    // Replace existing flashcards for this set
    await db.flashcard.deleteMany({ where: { studySetId: id } });
    const created = await db.flashcard.createMany({
      data: cards.map((c) => ({
        studySetId: id,
        front: c.front,
        back: c.back,
      })),
    });

    const flashcards = await db.flashcard.findMany({ where: { studySetId: id }, orderBy: { createdAt: 'asc' } });

    await db.studyActivity.create({
      data: { studySetId: id, type: 'flashcard', detail: `Generated ${created.count} flashcards` },
    });

    return NextResponse.json({ flashcards, count: created.count });
  } catch (e) {
    console.error('flashcard generation error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
