import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/search?q=<query> — global search across study sets, notes, flashcards, and chat sessions.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ results: { studySets: [], flashcards: [], sessions: [] } });
    }

    const [studySets, flashcards, sessions] = await Promise.all([
      db.studySet.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { notes: { contains: q } },
            { tags: { contains: q } },
            { sourceContent: { contains: q } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          subject: { select: { name: true, color: true } },
          _count: { select: { flashcards: true } },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      db.flashcard.findMany({
        where: {
          OR: [
            { front: { contains: q } },
            { back: { contains: q } },
          ],
        },
        select: {
          id: true,
          front: true,
          back: true,
          studySetId: true,
          studySet: { select: { id: true, title: true } },
        },
        take: 10,
      }),
      db.chatSession.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { subject: { contains: q } },
            { messages: { some: { content: { contains: q } } } },
          ],
        },
        select: {
          id: true,
          title: true,
          subject: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      results: {
        studySets: studySets.map((s) => ({ ...s, subject: s.subject ? { name: s.subject.name, color: s.subject.color } : null })),
        flashcards: flashcards.map((f) => ({
          id: f.id,
          front: f.front,
          back: f.back,
          studySetId: f.studySetId,
          studySetTitle: '',
        })),
        sessions: sessions.map((s: Record<string, unknown>) => ({
          id: s.id,
          title: s.title,
          subject: s.subject,
          updatedAt: s.updatedAt,
          messageCount: 0,
        })),
        total: studySets.length + flashcards.length + sessions.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
