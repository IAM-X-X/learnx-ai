import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/study-sets/[id]/export — download a study set as JSON.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // lazy import to avoid TS unused warnings
    const { db } = await import('@/lib/db');
    const set = await db.studySet.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, color: true, icon: true } },
        flashcards: { select: { front: true, back: true } },
        quizzes: {
          include: {
            questions: {
              select: {
                type: true,
                question: true,
                optionsJson: true,
                correctIndex: true,
                explanation: true,
              },
            },
          },
        },
        podcasts: { select: { title: true, script: true, voice: true } },
      },
    });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const exportData = {
      format: 'learnx-studyset/v1',
      exportedAt: new Date().toISOString(),
      title: set.title,
      description: set.description,
      sourceType: set.sourceType,
      sourceContent: set.sourceContent,
      notes: set.notes,
      tags: set.tags,
      subject: set.subject
        ? { name: set.subject.name, color: set.subject.color, icon: set.subject.icon }
        : null,
      flashcards: set.flashcards,
      quizzes: set.quizzes.map((q) => ({
        title: q.title,
        difficulty: q.difficulty,
        questions: q.questions.map((qq) => ({
          type: qq.type,
          question: qq.question,
          options: JSON.parse(qq.optionsJson || '[]'),
          correctIndex: qq.correctIndex,
          explanation: qq.explanation,
        })),
      })),
      podcasts: set.podcasts.map((p) => ({ title: p.title, script: p.script, voice: p.voice })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const safeName = set.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'studyset';
    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${safeName}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
