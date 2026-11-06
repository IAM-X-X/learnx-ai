import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeQuiz } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        attempts: { orderBy: { createdAt: 'desc' }, take: 20 },
        studySet: { select: { id: true, title: true } },
      },
    });
    if (!quiz) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ quiz: serializeQuiz(quiz) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.quiz.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
