import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeStudySetQuizzes } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const studySet = await db.studySet.findUnique({
      where: { id },
      include: {
        subject: true,
        flashcards: { orderBy: { createdAt: 'asc' } },
        quizzes: {
          include: {
            questions: { orderBy: { order: 'asc' } },
            attempts: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        podcasts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!studySet) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ studySet: serializeStudySetQuizzes(studySet) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.description === 'string') data.description = body.description;
    if (typeof body.notes === 'string') data.notes = body.notes;
    if (typeof body.favorite === 'boolean') data.favorite = body.favorite;
    if (typeof body.tags === 'string') data.tags = body.tags;
    if (body.subjectId !== undefined) data.subjectId = body.subjectId || null;
    const studySet = await db.studySet.update({ where: { id }, data, include: { subject: true } });
    return NextResponse.json({ studySet });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.studySet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
