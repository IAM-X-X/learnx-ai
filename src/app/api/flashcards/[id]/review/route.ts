import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sm2Update } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// PATCH /api/flashcards/[id]/review — record a spaced-repetition review.
// body: { quality: 0|1|2|3|4|5 }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { quality } = await req.json();
    const q = Math.min(Math.max(Number(quality) || 0, 0), 5);

    const card = await db.flashcard.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const next = sm2Update({
      repetitions: card.repetitions,
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
      quality: q,
    });

    const updated = await db.flashcard.update({
      where: { id },
      data: {
        repetitions: next.repetitions,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        dueAt: next.dueAt,
        lastReviewed: new Date(),
      },
    });

    if (q >= 3) {
      await db.studyActivity.create({
        data: {
          studySetId: card.studySetId,
          type: 'flashcard',
          detail: 'Reviewed card',
          score: q,
        },
      });
    }

    return NextResponse.json({ flashcard: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.flashcard.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
