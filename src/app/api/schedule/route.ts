import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/schedule?days=14 — returns upcoming flashcard reviews grouped by day.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get('days')) || 14, 1), 60);

    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);
    horizon.setHours(23, 59, 59, 999);

    // All flashcards due within the horizon (includes overdue ones from the past)
    const cards = await db.flashcard.findMany({
      where: { dueAt: { lte: horizon } },
      select: {
        id: true,
        front: true,
        dueAt: true,
        repetitions: true,
        intervalDays: true,
        studySetId: true,
        studySet: { select: { id: true, title: true } },
      },
      orderBy: { dueAt: 'asc' },
    });

    // Group by date (YYYY-MM-DD)
    const byDate: Record<string, {
      date: string;
      count: number;
      overdue: number;
      studySets: Record<string, { id: string; title: string; count: number }>;
    }> = {};

    // Build the full date range
    const todayKey = new Date();
    todayKey.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(todayKey);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDate[key] = { date: key, count: 0, overdue: 0, studySets: {} };
    }

    for (const c of cards) {
      const due = new Date(c.dueAt);
      const dKey = new Date(due);
      dKey.setHours(0, 0, 0, 0);
      const key = dKey.toISOString().slice(0, 10);
      if (!byDate[key]) {
        // due beyond horizon — skip (shouldn't happen due to query filter)
        continue;
      }
      byDate[key].count++;
      const isOverdue = due < now;
      if (isOverdue) byDate[key].overdue++;
      const setId = c.studySet?.id || c.studySetId;
      const setTitle = c.studySet?.title || 'Unknown';
      if (!byDate[key].studySets[setId]) {
        byDate[key].studySets[setId] = { id: setId, title: setTitle, count: 0 };
      }
      byDate[key].studySets[setId].count++;
    }

    const schedule = Object.values(byDate).map((d) => ({
      date: d.date,
      count: d.count,
      overdue: d.overdue,
      studySets: Object.values(d.studySets),
    }));

    const totalDue = cards.filter((c) => new Date(c.dueAt) <= now).length;
    const totalUpcoming = cards.length - totalDue;

    // 30-day forecast — count cards due each day for the next 30 days
    const forecastDays = 30;
    const forecastSince = new Date();
    forecastSince.setHours(0, 0, 0, 0);
    const forecastHorizon = new Date(forecastSince);
    forecastHorizon.setDate(forecastHorizon.getDate() + forecastDays);
    forecastHorizon.setHours(23, 59, 59, 999);

    const forecastCards = await db.flashcard.findMany({
      where: { dueAt: { lte: forecastHorizon } },
      select: { dueAt: true },
    });
    const forecastMap: Record<string, number> = {};
    for (const c of forecastCards) {
      const d = new Date(c.dueAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      forecastMap[key] = (forecastMap[key] || 0) + 1;
    }
    const forecast: { date: string; count: number }[] = [];
    for (let i = 0; i < forecastDays; i++) {
      const d = new Date(forecastSince);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      forecast.push({ date: key, count: forecastMap[key] || 0 });
    }

    return NextResponse.json({
      schedule,
      forecast,
      totals: {
        totalDue,
        totalUpcoming,
        horizonDays: days,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
