import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/stats — dashboard analytics
export async function GET(_req: NextRequest) {
  try {
    const [totalStudySets, totalFlashcards, totalQuizzes, dueFlashcards, quizAttempts, activities] =
      await Promise.all([
        db.studySet.count(),
        db.flashcard.count(),
        db.quiz.count(),
        db.flashcard.count({ where: { dueAt: { lte: new Date() } } }),
        db.quizAttempt.count(),
        db.studyActivity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: { studySet: { select: { id: true, title: true } } },
        }),
      ]);

    // average score across all attempts
    const attempts = await db.quizAttempt.findMany();
    let averageScore = 0;
    if (attempts.length) {
      const pcts = attempts
        .filter((a: Record<string, unknown>) => Number(a.totalQuestions) > 0)
        .map((a: Record<string, unknown>) => (Number(a.score) / Number(a.totalQuestions)) * 100);
      averageScore = pcts.length ? Math.round(pcts.reduce((s: number, n: number) => s + n, 0) / pcts.length) : 0;
    }

    // study streak: count distinct days in last 14 with activity
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const recent = await db.studyActivity.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const daySet = new Set<string>();
    for (const a of recent) {
      const d = new Date(String(a.createdAt));
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    // compute current streak from today backwards
    let studyStreakDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (daySet.has(key)) studyStreakDays++;
      else if (i === 0) {
        // today not active yet — streak still counts if yesterday was
        continue;
      } else break;
    }

    // weekly activity counts
    const weekly: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = recent.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      weekly.push({ date: d.toISOString().slice(0, 10), count });
    }

    // 12-week heatmap (84 days) — GitHub-style contribution graph
    const heatmap: { date: string; count: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      // need activities for the full 84 days, so query a wider window
      const count = 0; // filled below from extended recent
      heatmap.push({ date: d.toISOString().slice(0, 10), count });
    }

    // re-query a wider window for the heatmap (84 days)
    const heatmapSince = new Date();
    heatmapSince.setDate(heatmapSince.getDate() - 84);
    const heatmapActivities = await db.studyActivity.findMany({
      where: { createdAt: { gte: heatmapSince } },
      select: { createdAt: true },
    });
    const heatmapMap: Record<string, number> = {};
    for (const a of heatmapActivities) {
      const d = new Date(String(a.createdAt));
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      heatmapMap[key] = (heatmapMap[key] || 0) + 1;
    }
    const heatmapFilled = heatmap.map((h) => ({ ...h, count: heatmapMap[h.date] || 0 }));

    // longest streak (over the 84-day window)
    let longestStreak = 0;
    let currentRun = 0;
    for (const h of heatmapFilled) {
      if (h.count > 0) {
        currentRun++;
        if (currentRun > longestStreak) longestStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }

    return NextResponse.json({
      stats: {
        totalStudySets,
        totalFlashcards,
        totalQuizzes,
        dueFlashcards,
        quizzesTaken: quizAttempts,
        averageScore,
        studyStreakDays,
        longestStreak,
        recentActivity: activities.map((a: Record<string, unknown>) => ({
          id: a.id,
          studySetId: a.studySetId,
          type: a.type,
          detail: a.detail,
          score: a.score,
          createdAt: a.createdAt,
          studySet: null,
        })),
        weeklyActivity: weekly,
        heatmap: heatmapFilled,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
