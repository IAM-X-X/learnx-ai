import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateStudyPlan } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/study-plan — generate a personalized study plan.
// body: { goal: string, dailyMinutes?: number, daysAhead?: number }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goal = (body.goal as string)?.trim();
    if (!goal) {
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }
    const dailyMinutes = Math.min(Math.max(Number(body.dailyMinutes) || 30, 10), 240);
    const daysAhead = Math.min(Math.max(Number(body.daysAhead) || 7, 3), 30);

    // Gather available study sets with their due-card counts and best quiz scores.
    const sets = await db.studySet.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { flashcards: true } },
        flashcards: {
          where: { dueAt: { lte: new Date() } },
          select: { id: true },
        },
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

    const availableSets = sets.map((s) => {
      const lastAttempt = s.quizzes.flatMap((q) => q.attempts)[0];
      const lastScore =
        lastAttempt && lastAttempt.totalQuestions > 0
          ? Math.round((lastAttempt.score / lastAttempt.totalQuestions) * 100)
          : null;
      return {
        title: s.title,
        cardsDue: s.flashcards.length,
        lastScore,
      };
    });

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
