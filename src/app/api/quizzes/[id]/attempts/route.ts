import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/quizzes/[id]/attempts — list attempts
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const attempts = await db.quizAttempt.findMany({
      where: { quizId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ attempts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/quizzes/[id]/attempts — record a new attempt
// body: { answers: [{ questionId, selectedIndex, correct }], durationSec }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const durationSec = Number(body.durationSec) || 0;

    const score = answers.filter((a: { correct: boolean }) => a.correct).length;
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: { questions: true, studySet: { select: { id: true, title: true } } },
    });
    if (!quiz) return NextResponse.json({ error: 'quiz not found' }, { status: 404 });

    const attempt = await db.quizAttempt.create({
      data: {
        quizId: id,
        score,
        totalQuestions: quiz.questions.length || answers.length,
        answersJson: JSON.stringify(answers),
        durationSec,
      },
    });

    await db.studyActivity.create({
      data: {
        studySetId: quiz.studySetId,
        type: 'quiz',
        detail: `Quiz attempt: ${score}/${quiz.questions.length}`,
        score: quiz.questions.length ? Math.round((score / quiz.questions.length) * 100) : 0,
      },
    });

    return NextResponse.json({ attempt });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
