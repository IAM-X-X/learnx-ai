import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/import — import a study set from exported JSON.
// body: { data: <exported json object> }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = body.data;
    if (!data || data.format !== 'learnx-studyset/v1') {
      return NextResponse.json({ error: 'Invalid file format. Expected a LearnX export.' }, { status: 400 });
    }

    // resolve/create subject
    let subjectId: string | null = null;
    if (data.subject?.name) {
      let subject = await db.subject.findFirst({ where: { name: data.subject.name } });
      if (!subject) {
        subject = await db.subject.create({
          data: {
            name: data.subject.name,
            color: data.subject.color || 'violet',
            icon: data.subject.icon || 'BookOpen',
          },
        });
      }
      subjectId = subject.id;
    }

    const set = await db.studySet.create({
      data: {
        title: data.title || 'Imported set',
        description: data.description || '',
        sourceType: data.sourceType || 'paste',
        sourceContent: data.sourceContent || '',
        notes: data.notes || '',
        tags: data.tags || '',
        subjectId,
        flashcards: {
          create: (data.flashcards || []).map((c: { front: string; back: string }) => ({
            front: c.front,
            back: c.back,
          })),
        },
        quizzes: {
          create: (data.quizzes || []).map((q: { title?: string; difficulty?: string; questions?: Array<{ type: string; question: string; options: string[]; correctIndex: number; explanation: string }> }) => ({
            title: q.title || 'Imported quiz',
            difficulty: q.difficulty || 'medium',
            questions: {
              create: (q.questions || []).map((qq) => ({
                type: qq.type === 'true_false' ? 'true_false' : 'multiple_choice',
                question: qq.question,
                optionsJson: JSON.stringify(qq.options || []),
                correctIndex: qq.correctIndex ?? 0,
                explanation: qq.explanation || '',
              })),
            },
          })),
        },
        podcasts: {
          create: (data.podcasts || []).map((p: { title?: string; script: string; voice?: string }) => ({
            title: p.title || 'Imported podcast',
            script: p.script,
            voice: p.voice || 'tongtong',
            audioBase64: '',
            durationSec: 0,
          })),
        },
      },
      include: { _count: { select: { flashcards: true, quizzes: true, podcasts: true } } },
    });

    return NextResponse.json({ studySet: set });
  } catch (e) {
    console.error('import error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
