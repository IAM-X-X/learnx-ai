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
    const enriched = studySets.map((s) => {
      const totalCards = s._count.flashcards;
      const reviewedCards = s.flashcards.filter((f) => f.lastReviewed !== null).length;
      const cardProgress = totalCards > 0 ? reviewedCards / totalCards : 0;

      const allAttempts = s.quizzes.flatMap((q) => q.attempts);
      const lastAttempt = allAttempts[0];
      const quizScore = lastAttempt && lastAttempt.totalQuestions > 0
        ? lastAttempt.score / lastAttempt.totalQuestions
        : 0;
      const hasQuizAttempt = allAttempts.length > 0;

      // weighted progress: 40% notes-generated + 30% cards-reviewed + 30% quiz-score
      const hasNotes = s.notes && s.notes.trim().length > 0;
      const notesProgress = hasNotes ? 1 : 0;
      const progress = Math.round(
        (notesProgress * 0.4 + cardProgress * 0.3 + (hasQuizAttempt ? quizScore : 0) * 0.3) * 100,
      );

      // last studied: most recent of flashcard review or quiz attempt
      const lastReviewed = s.flashcards
        .map((f) => f.lastReviewed)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        ...s,
        flashcards: undefined,
        quizzes: undefined,
        progress: Math.min(100, progress),
        reviewedCards,
        hasQuizAttempt,
        lastStudied: lastReviewed ? lastReviewed.toISOString() : null,
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
