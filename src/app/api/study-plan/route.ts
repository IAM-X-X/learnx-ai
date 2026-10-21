import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient } from '@/lib/db';
import { generateStudyPlan } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/study-plan — generate a personalized study plan.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goal = (body.goal as string)?.trim();
    if (!goal) {
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }
    const dailyMinutes = Math.min(Math.max(Number(body.dailyMinutes) || 30, 10), 240);
    const daysAhead = Math.min(Math.max(Number(body.daysAhead) || 7, 3), 30);

    // Get study sets (basic data, no relations)
    const sets = await db.studySet.findMany({
      select: { id: true, title: true },
    });

    // Get per-set data with raw SQL
    const availableSets = [];
    for (const s of sets) {
      // Count due flashcards
      const dueResult = await rawClient.execute({
        sql: 'SELECT COUNT(*) as count FROM "Flashcard" WHERE "studySetId" = ? AND "dueAt" <= ?',
        args: [s.id, new Date().toISOString()],
      });
      const cardsDue = Number((dueResult.rows[0] as Record<string, unknown>)?.count || 0);

      // Get last quiz attempt
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

      availableSets.push({ title: s.title, cardsDue, lastScore });
    }

    const plan = await generateStudyPlan({ goal, availableSets, dailyMinutes, daysAhead });

    await db.studyActivity.create({
      data: { type: 'study', detail: `Generated study plan: ${goal.slice(0, 60)}` },
    });

    return NextResponse.json({ plan });
  } catch (e) {
    console.error('study-plan error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
