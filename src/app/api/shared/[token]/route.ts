import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeStudySetRelations } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

// GET /api/shared/[token] — public read-only view of a shared study set.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const set = await db.studySet.findFirst({
      where: { shareToken: token },
      include: {
        subject: true,
        flashcards: { orderBy: { createdAt: 'asc' } },
        quizzes: {
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
        podcasts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!set) return NextResponse.json({ error: 'not found or not shared' }, { status: 404 });
    return NextResponse.json({ studySet: serializeStudySetRelations(set) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
