import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateNotes, generateFlashcards, generateQuiz } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/seed — create a sample subject + study set with generated content.
// Use only when DB is empty / for a quick demo.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = (body.topic as string) || 'The Cell: Structure & Function';
    const source = (body.source as string) ||
      'The cell is the basic structural and functional unit of life. All living organisms are composed of cells. There are two broad categories: prokaryotic cells (bacteria and archaea, no nucleus) and eukaryotic cells (plants, animals, fungi, protists, with a membrane-bound nucleus). Key organelles include the nucleus (houses DNA), mitochondria (energy via ATP), endoplasmic reticulum (protein & lipid synthesis), Golgi apparatus (packaging), and chloroplasts in plants (photosynthesis). The cell membrane is selectively permeable. The cell cycle includes interphase (G1, S, G2) and mitosis (prophase, metaphase, anaphase, telophase) followed by cytokinesis.';

    // create or reuse subject
    let subject = await db.subject.findFirst({ where: { name: 'Biology' } });
    if (!subject) {
      subject = await db.subject.create({ data: { name: 'Biology', color: 'emerald', icon: 'Bio' } });
    }

    const set = await db.studySet.create({
      data: {
        title: topic,
        description: 'Seed study set',
        sourceType: 'paste',
        sourceContent: source,
        subjectId: subject.id,
        tags: 'biology, cells',
      },
    });

    // generate content (best-effort, fail-soft)
    let notes = '';
    let flashcardsCount = 0;
    let quizCount = 0;
    try {
      notes = await generateNotes({ title: topic, source, difficulty: 'intermediate', length: 'standard' });
      await db.studySet.update({ where: { id: set.id }, data: { notes } });
    } catch (e) {
      console.error('seed notes failed', e);
    }
    try {
      const cards = await generateFlashcards({ source: notes || source, count: 8 });
      await db.flashcard.createMany({
        data: cards.map((c) => ({ studySetId: set.id, front: c.front, back: c.back })),
      });
      flashcardsCount = cards.length;
    } catch (e) {
      console.error('seed flashcards failed', e);
    }
    try {
      const qs = await generateQuiz({ source: notes || source, count: 6, difficulty: 'medium', mixTypes: true });
      await db.quiz.create({
        data: {
          studySetId: set.id,
          title: `Quiz: ${topic}`,
          difficulty: 'medium',
          questions: {
            create: qs.map((q, i) => ({
              type: q.type === 'true_false' ? 'true_false' : 'multiple_choice',
              question: q.question,
              optionsJson: JSON.stringify(q.options),
              correctIndex: q.correctIndex,
              explanation: q.explanation,
              order: i,
            })),
          },
        },
      });
      quizCount = qs.length;
    } catch (e) {
      console.error('seed quiz failed', e);
    }

    return NextResponse.json({
      ok: true,
      studySetId: set.id,
      notesGenerated: !!notes,
      flashcardsCount,
      quizCount,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
