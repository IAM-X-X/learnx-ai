import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/progress — detailed analytics for the Progress view.
export async function GET(_req: NextRequest) {
  try {
    // 1. Daily XP / activity for the last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const activities = await db.studyActivity.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, score: true, createdAt: true, studySetId: true },
      orderBy: { createdAt: 'asc' },
    });

    const daily: Record<string, { xp: number; count: number }> = {};
    for (const a of activities) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // XP rules: notes=20, flashcard=5, quiz=10 + score, podcast=15, chat=3, study=10
      const xpMap: Record<string, number> = {
        notes: 20,
        flashcard: 5,
        quiz: 10 + Math.round(a.score / 5),
        podcast: 15,
        chat: 3,
        study: 10,
      };
      const xp = xpMap[a.type] ?? 5;
      if (!daily[key]) daily[key] = { xp: 0, count: 0 };
      daily[key].xp += xp;
      daily[key].count += 1;
    }

    // build 30-day series with zeros filled in
    const dailyProgress = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyProgress.push({
        date: key,
        xp: daily[key]?.xp ?? 0,
        count: daily[key]?.count ?? 0,
      });
    }

    // 2. Quiz score trend (last 20 attempts)
    const attempts = await db.quizAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { quiz: { include: { studySet: { select: { title: true } } } } },
    });
    const scoreTrend = attempts
      .map((a) => ({
        date: a.createdAt.toISOString().slice(0, 10),
        score: a.totalQuestions ? Math.round((a.score / a.totalQuestions) * 100) : 0,
        total: a.totalQuestions,
        title: a.quiz?.studySet?.title ?? 'Quiz',
      }))
      .reverse();

    // 3. Subject mastery breakdown
    const subjects = await db.subject.findMany({
      include: {
        studySets: {
          include: {
            flashcards: true,
            quizzes: { include: { attempts: true } },
          },
        },
      },
    });
    const subjectMastery = subjects.map((s) => {
      const allAttempts = s.studySets.flatMap((set) => set.quizzes.flatMap((q) => q.attempts));
      const quizzesTaken = allAttempts.length;
      const avgScore = allAttempts.length
        ? Math.round(
            (allAttempts
              .filter((a) => a.totalQuestions > 0)
              .map((a) => (a.score / a.totalQuestions) * 100)
              .reduce((sum, n) => sum + n, 0) /
              allAttempts.filter((a) => a.totalQuestions > 0).length || 1),
          )
        : 0;
      const flashcards = s.studySets.reduce((n, set) => n + set.flashcards.length, 0);
      // mastery: weighted blend of avg score, flashcard coverage, and having quizzes
      const coverage = Math.min(100, flashcards * 5);
      const mastery = Math.round(
        avgScore * 0.6 + coverage * 0.3 + (quizzesTaken > 0 ? 10 : 0),
      );
      return {
        subjectId: s.id,
        subjectName: s.name,
        color: s.color,
        studySets: s.studySets.length,
        flashcards,
        quizzesTaken,
        averageScore: avgScore,
        mastery: Math.min(100, mastery),
      };
    });

    // 4. Activity by type (for donut chart)
    const typeCounts: Record<string, number> = {};
    for (const a of activities) {
      typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    }
    const activityByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

    // 5. Totals
    const totalXp30 = dailyProgress.reduce((n, d) => n + d.xp, 0);
    const totalActivity30 = dailyProgress.reduce((n, d) => n + d.count, 0);
    const bestDay = dailyProgress.reduce(
      (best, d) => (d.xp > best.xp ? d : best),
      { date: '', xp: 0, count: 0 },
    );
    const avgQuizScore = attempts.length
      ? Math.round(attempts.reduce((n, a) => n + (a.totalQuestions ? (a.score / a.totalQuestions) * 100 : 0), 0) / attempts.length)
      : 0;

    return NextResponse.json({
      progress: {
        dailyProgress,
        scoreTrend,
        subjectMastery,
        activityByType,
        totals: {
          totalXp30,
          totalActivity30,
          bestDay,
          avgQuizScore,
          totalAttempts: attempts.length,
        },
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
