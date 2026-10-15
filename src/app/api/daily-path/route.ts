import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDailyLearningPath } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// GET /api/daily-path — generate a personalized daily learning path.
export async function GET(_req: NextRequest) {
  try {
    const [dueCards, studySets, recentActivity, attempts] = await Promise.all([
      db.flashcard.count({ where: { dueAt: { lte: new Date() } } }),
      db.studySet.findMany({
        select: {
          id: true,
          title: true,
          notes: true,
          _count: { select: { flashcards: true } },
          flashcards: { where: { dueAt: { lte: new Date() } }, select: { id: true } },
          quizzes: {
            select: {
              attempts: { orderBy: { createdAt: 'desc' }, take: 1, select: { score: true, totalQuestions: true } },
            },
          },
        },
      }),
      db.studyActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { detail: true, createdAt: true },
      }),
      db.quizAttempt.findMany({ select: { score: true, totalQuestions: true } }),
    ]);

    // streak
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const recent = await db.studyActivity.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const daySet = new Set<string>();
    for (const a of recent) {
      const d = new Date(a.createdAt);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    let streakDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (daySet.has(key)) streakDays++;
      else if (i === 0) continue;
      else break;
    }

    // average score
    let avgScore = 0;
    if (attempts.length) {
      const pcts = attempts
        .filter((a) => a.totalQuestions > 0)
        .map((a) => (a.score / a.totalQuestions) * 100);
      avgScore = pcts.length ? Math.round(pcts.reduce((s, n) => s + n, 0) / pcts.length) : 0;
    }

    const setsForAI = studySets.map((s) => {
      const lastAttempt = s.quizzes.flatMap((q) => q.attempts)[0];
      const lastScore = lastAttempt && lastAttempt.totalQuestions > 0
        ? Math.round((lastAttempt.score / lastAttempt.totalQuestions) * 100)
        : null;
      const hasNotes = s.notes && s.notes.trim().length > 0;
      const progress = Math.min(100, Math.round(
        (hasNotes ? 40 : 0) +
        (s._count.flashcards > 0 ? 30 : 0) +
        (lastScore !== null ? lastScore * 0.3 : 0),
      ));
      return { title: s.title, cardsDue: s.flashcards.length, lastScore, progress };
    });

    const path = await generateDailyLearningPath({
      dueCards,
      totalStudySets: studySets.length,
      studySets: setsForAI,
      streakDays,
      avgScore,
      recentActivity: recentActivity.map((a) => `${a.detail}`),
    });

    return NextResponse.json({ path });
  } catch (e) {
    console.error('daily-path error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
