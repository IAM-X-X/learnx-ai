import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface PracticeCard {
  type: 'flashcard';
  id: string;
  front: string;
  back: string;
  studySetId: string;
  studySetTitle: string;
}
interface PracticeQuestion {
  type: 'quiz';
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  studySetId: string;
  studySetTitle: string;
  quizId: string;
}
export interface PracticeItem {
  type: 'flashcard' | 'quiz';
  // shared
  id: string;
  studySetId: string;
  studySetTitle: string;
  // flashcard fields
  front?: string;
  back?: string;
  // quiz fields
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  quizId?: string;
}

// GET /api/practice?limit=N — returns a mixed batch of due flashcards + quiz
// questions previously answered incorrectly (weak areas), shuffled.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 15, 3), 40);

    // 1. Due flashcards
    const dueCards = await db.flashcard.findMany({
      where: { dueAt: { lte: new Date() } },
      take: Math.ceil(limit / 2) + 5,
      include: { studySet: { select: { id: true, title: true } } },
      orderBy: { dueAt: 'asc' },
    });

    // 2. Quiz questions from the most recent attempts where the answer was wrong.
    //    We pull recent attempts, parse answersJson, collect incorrectly-answered
    //    questionIds, then load those questions.
    const recentAttempts = await db.quizAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { answersJson: true, quizId: true },
    });
    const wrongQuestionIds = new Set<string>();
    for (const a of recentAttempts) {
      try {
        const answers = JSON.parse(a.answersJson || '[]') as {
          questionId: string;
          correct: boolean;
        }[];
        for (const ans of answers) {
          if (!ans.correct) wrongQuestionIds.add(ans.questionId);
        }
      } catch {
        // ignore
      }
    }
    let wrongQuestions: Awaited<ReturnType<typeof db.quizQuestion.findMany>> = [];
    if (wrongQuestionIds.size > 0) {
      wrongQuestions = await db.quizQuestion.findMany({
        where: { id: { in: Array.from(wrongQuestionIds) } },
        take: Math.ceil(limit / 2) + 5,
        include: { quiz: { include: { studySet: { select: { id: true, title: true } } } } },
      });
    }

    // If not enough wrong questions, fill with random quiz questions
    if (wrongQuestions.length < Math.ceil(limit / 2)) {
      const extra = await db.quizQuestion.findMany({
        take: Math.ceil(limit / 2),
        include: { quiz: { include: { studySet: { select: { id: true, title: true } } } } },
        orderBy: { order: 'desc' },
      });
      // de-dup by id
      const seen = new Set(wrongQuestions.map((q) => q.id));
      for (const q of extra) {
        if (!seen.has(q.id)) {
          wrongQuestions.push(q);
          seen.add(q.id);
        }
      }
    }

    // Map to PracticeItem shape
    const cardItems: PracticeItem[] = dueCards.map((c) => ({
      type: 'flashcard' as const,
      id: c.id,
      front: c.front,
      back: c.back,
      studySetId: c.studySetId,
      studySetTitle: c.studySet?.title ?? 'Study set',
    }));
    const questionItems: PracticeItem[] = wrongQuestions.map((q) => ({
      type: 'quiz' as const,
      id: q.id,
      question: q.question,
      options: JSON.parse(q.optionsJson || '[]'),
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      quizId: q.quizId,
      studySetId: q.quiz?.studySet?.id ?? '',
      studySetTitle: q.quiz?.studySet?.title ?? 'Study set',
    }));

    // Interleave + shuffle
    const all = [...cardItems, ...questionItems];
    // deterministic-ish shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const batch = all.slice(0, limit);

    return NextResponse.json({
      practice: batch,
      counts: {
        flashcards: batch.filter((b) => b.type === 'flashcard').length,
        quizzes: batch.filter((b) => b.type === 'quiz').length,
        totalAvailable: all.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
