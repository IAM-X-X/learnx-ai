import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/goal — returns today's XP and recent streak.
 * The target itself is stored client-side (localStorage) so users can change it
 * without needing a user account. Here we just compute today's XP.
 */
export async function GET(_req: NextRequest) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayActivities = await db.studyActivity.findMany({
      where: { createdAt: { gte: start } },
      select: { type: true, score: true },
    });
    const xpMap: Record<string, number> = {
      notes: 20,
      flashcard: 5,
      quiz: 10,
      podcast: 15,
      chat: 3,
      study: 10,
    };
    let todayXp = 0;
    for (const a of todayActivities) {
      todayXp += xpMap[a.type] ?? 5;
      if (a.type === 'quiz') todayXp += Math.round(a.score / 5);
    }

    // streak: count consecutive days back from today with >=1 activity
    const since = new Date();
    since.setDate(since.getDate() - 30);
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
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (daySet.has(key)) streakDays++;
      else if (i === 0) continue;
      else break;
    }

    return NextResponse.json({
      goal: {
        todayXp,
        streakDays,
        todayActivityCount: todayActivities.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
