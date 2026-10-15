import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateQuiz } from '@/lib/ai';
import { serializeQuiz } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

// POST /api/study-sets/[id]/quiz — generate a quiz from the set's notes + source.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 8, 1), 20);
    const difficulty = (body.difficulty as 'easy' | 'medium' | 'hard') || 'medium';
    const mixTypes = body.mixTypes !== false;

    const set = await db.studySet.findUnique({ where: { id } });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const source = [set.notes, set.sourceContent].filter(Boolean).join('\n\n') || set.sourceContent;
    const questions = await generateQuiz({ source, count, difficulty, mixTypes });

    // Create a new Quiz with questions (keep old quizzes for history)
    const quiz = await db.quiz.create({
      data: {
        studySetId: id,
        title: `Quiz: ${set.title}`,
        difficulty,
        questions: {
          create: questions.map((q, i) => ({
            type: q.type === 'true_false' ? 'true_false' : 'multiple_choice',
            question: q.question,
            optionsJson: JSON.stringify(q.options),
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            order: i,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
      },
    });

    await db.studyActivity.create({
      data: { studySetId: id, type: 'quiz', detail: `Generated quiz (${difficulty}, ${questions.length} Q)` },
    });

    return NextResponse.json({ quiz: serializeQuiz(quiz) });
  } catch (e) {
    console.error('quiz generation error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
