import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient } from '@/lib/db';
import { generateDailyLearningPath } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// GET /api/daily-path — generate a personalized daily learning path.
export async function GET(_req: NextRequest) {
  try {
    const now = new Date();

    // Get all the data we need with separate queries (no Prisma relations)
    const [dueCards, studySets, recentActivity, attempts, recent] = await Promise.all([
      db.flashcard.count({ where: { dueAt: { lte: now } } }),
      db.studySet.findMany({ select: { id: true, title: true, notes: true } }),
      db.studyActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.quizAttempt.findMany(),
      db.studyActivity.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 14 * 86400000) } },
      }),
    ]);

    // Get per-set data with raw SQL
    const setsForAI = [];
    for (const s of studySets) {
      // Count flashcards for this set
      const cardCountResult = await rawClient.execute({
        sql: 'SELECT COUNT(*) as count FROM "Flashcard" WHERE "studySetId" = ?',
        args: [s.id],
      });
      const totalCards = Number((cardCountResult.rows[0] as Record<string, unknown>)?.count || 0);

      // Count due flashcards
      const dueResult = await rawClient.execute({
        sql: 'SELECT COUNT(*) as count FROM "Flashcard" WHERE "studySetId" = ? AND "dueAt" <= ?',
        args: [s.id, now.toISOString()],
      });
      const cardsDue = Number((dueResult.rows[0] as Record<string, unknown>)?.count || 0);

      // Get last quiz attempt for this set
      const lastAttemptResult = await rawClient.execute({
        sql: `SELECT qa.score, qa."totalQuestions" FROM "QuizAttempt" qa
              JOIN "Quiz" q ON qa."quizId" = q.id
              WHERE q."studySetId" = ?
              ORDER BY qa."createdAt" DESC LIMIT 1`,
        args: [s.id],
      });
      const lastAttemptRow = lastAttemptResult.rows[0] as Record<string, unknown> | undefined;
      const lastScore = lastAttemptRow && Number(lastAttemptRow.totalQuestions) > 0
        ? Math.round((Number(lastAttemptRow.score) / Number(lastAttemptRow.totalQuestions)) * 100)
        : null;

      const hasNotes = s.notes && String(s.notes).trim().length > 0;
      const progress = Math.min(100, Math.round(
        (hasNotes ? 40 : 0) +
        (totalCards > 0 ? 30 : 0) +
        (lastScore !== null ? lastScore * 0.3 : 0),
      ));

      setsForAI.push({ title: s.title, cardsDue, lastScore, progress });
    }

    // streak
    const daySet = new Set<string>();
    for (const a of recent) {
      const d = new Date(String(a.createdAt));
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
        .filter((a: Record<string, unknown>) => Number(a.totalQuestions) > 0)
        .map((a: Record<string, unknown>) => (Number(a.score) / Number(a.totalQuestions)) * 100);
      avgScore = pcts.length ? Math.round(pcts.reduce((s: number, n: number) => s + n, 0) / pcts.length) : 0;
    }

    // Generate the AI path, but fall back to a sensible default if the
    // upstream AI call fails (network, rate limit, 5xx, etc.) — this keeps
    // the dashboard usable even when the AI service is degraded.
    let path;
    try {
      path = await generateDailyLearningPath({
        dueCards,
        totalStudySets: studySets.length,
        studySets: setsForAI,
        streakDays,
        avgScore,
        recentActivity: recentActivity.map((a: Record<string, unknown>) => String(a.detail)),
      });
    } catch (aiErr) {
      console.error('daily-path AI failed, using fallback:', aiErr);
      path = {
        greeting: streakDays > 0 ? `Great ${streakDays}-day streak! Keep it going.` : 'Ready to learn?',
        summary: dueCards > 0
          ? `You have ${dueCards} flashcards due for review.`
          : 'No urgent reviews — a good time to learn something new.',
        tasks: dueCards > 0
          ? [{ title: `Review ${dueCards} due flashcards`, reason: 'Spaced repetition keeps your memory sharp', type: 'review', estimatedMinutes: 10 }]
          : setsForAI.length > 0
            ? [{ title: `Study: ${setsForAI[0].title}`, reason: 'Pick up where you left off', type: 'learn', estimatedMinutes: 15 }]
            : [],
        tip: 'Consistency beats intensity. A few minutes daily works better than long cramming sessions.',
      };
    }

    return NextResponse.json({ path });
  } catch (e) {
    console.error('daily-path error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
