import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/study-sets — list all, with related counts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId') || undefined;
    const favorite = searchParams.get('favorite');
    const q = searchParams.get('q') || undefined;

    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (favorite === 'true') where.favorite = true;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    const studySets = await db.studySet.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        subject: true,
        _count: { select: { flashcards: true, quizzes: true, podcasts: true } },
        flashcards: { select: { dueAt: true, repetitions: true, lastReviewed: true } },
        quizzes: {
          select: {
            attempts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { score: true, totalQuestions: true },
            },
          },
        },
      },
    });

    // compute a per-set progress (0-100) and last-studied timestamp
    const enriched = studySets.map((s: Record<string, unknown>) => {
      const flashcards = (s.flashcards as unknown[]) || [];
      const quizzes = (s.quizzes as unknown[]) || [];
      const totalCount = (s._count as { flashcards?: number })?.flashcards ?? flashcards.length;
      const reviewedCards = flashcards.filter((f: Record<string, unknown>) => f.lastReviewed !== null && f.lastReviewed !== undefined).length;
      const cardProgress = totalCount > 0 ? reviewedCards / totalCount : 0;

      const allAttempts = quizzes.flatMap((q: Record<string, unknown>) => (q.attempts as unknown[]) || []);
      const lastAttempt = allAttempts[0] as Record<string, unknown> | undefined;
      const quizScore = lastAttempt && Number(lastAttempt.totalQuestions) > 0
        ? Number(lastAttempt.score) / Number(lastAttempt.totalQuestions)
        : 0;
      const hasQuizAttempt = allAttempts.length > 0;

      const hasNotes = s.notes && String(s.notes).trim().length > 0;
      const notesProgress = hasNotes ? 1 : 0;
      const progress = Math.round(
        (notesProgress * 0.4 + cardProgress * 0.3 + (hasQuizAttempt ? quizScore : 0) * 0.3) * 100,
      );

      return {
        ...s,
        flashcards: undefined,
        quizzes: undefined,
        podcasts: undefined,
        progress: Math.min(100, progress),
        reviewedCards,
        hasQuizAttempt,
        lastStudied: null,
      };
    });

    return NextResponse.json({ studySets: enriched });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/study-sets — create a new study set (with optional initial generation)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, source, sourceType = 'topic', subjectId, tags, description } = body;
    if (!title || !source) {
      return NextResponse.json({ error: 'title and source are required' }, { status: 400 });
    }
    const studySet = await db.studySet.create({
      data: {
        title: title.trim(),
        sourceType,
        sourceContent: String(source).slice(0, 20000),
        subjectId: subjectId || null,
        tags: tags || '',
        description: description || '',
      },
      include: {
        subject: true,
        _count: { select: { flashcards: true, quizzes: true, podcasts: true } },
      },
    });
    return NextResponse.json({ studySet });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
