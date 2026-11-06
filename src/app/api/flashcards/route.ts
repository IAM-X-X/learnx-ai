import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sm2Update } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// GET /api/flashcards/due — all due flashcards across all sets (for study mode)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studySetId = searchParams.get('studySetId') || undefined;
    const dueOnly = searchParams.get('due') === 'true';

    const where: Record<string, unknown> = {};
    if (studySetId) where.studySetId = studySetId;
    if (dueOnly) where.dueAt = { lte: new Date() };

    const flashcards = await db.flashcard.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: { studySet: { select: { id: true, title: true } } },
    });
    return NextResponse.json({ flashcards });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
