// Shared serializers that convert Prisma rows into the API-facing shape
// (e.g. optionsJson -> options[]).

import type { Quiz, QuizAttempt, QuizQuestion } from '@/lib/types';

interface PrismaQuestion {
  id: string;
  quizId: string;
  type: string;
  question: string;
  optionsJson: string;
  correctIndex: number;
  explanation: string;
  order: number;
}

interface PrismaAttempt {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answersJson: string;
  durationSec: number;
  createdAt: Date;
}

export function serializeQuestion(q: PrismaQuestion): QuizQuestion {
  let options: string[] = [];
  try {
    options = JSON.parse(q.optionsJson || '[]');
  } catch {
    options = [];
  }
  return {
    id: q.id,
    quizId: q.quizId,
    type: (q.type === 'true_false' ? 'true_false' : 'multiple_choice') as QuizQuestion['type'],
    question: q.question,
    options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    order: q.order,
  };
}

export function serializeAttempt(a: PrismaAttempt): QuizAttempt {
  let answers: { questionId: string; selectedIndex: number; correct: boolean }[] = [];
  try {
    answers = JSON.parse(a.answersJson || '[]');
  } catch {
    answers = [];
  }
  return {
    id: a.id,
    quizId: a.quizId,
    score: a.score,
    totalQuestions: a.totalQuestions,
    answers,
    durationSec: a.durationSec,
    createdAt: a.createdAt.toISOString(),
  };
}

interface PrismaQuiz {
  id: string;
  studySetId: string;
  title: string;
  difficulty: string;
  createdAt: Date;
  questions?: PrismaQuestion[];
  attempts?: PrismaAttempt[];
}

export function serializeQuiz(quiz: PrismaQuiz): Quiz {
  return {
    id: quiz.id,
    studySetId: quiz.studySetId,
    title: quiz.title,
    difficulty: (quiz.difficulty as Quiz['difficulty']) || 'medium',
    createdAt: quiz.createdAt.toISOString(),
    questions: (quiz.questions || []).map(serializeQuestion),
    attempts: (quiz.attempts || []).map(serializeAttempt),
  };
}

/** Walk a Prisma study-set payload and convert quiz questions/attempts
 *  and podcasts into the API-facing shape (also drops the huge audioBase64). */
export function serializeStudySetRelations<T extends {
  quizzes?: PrismaQuiz[];
  podcasts?: Array<{
    id: string;
    studySetId: string;
    title: string;
    script: string;
    audioBase64: string;
    voice: string;
    durationSec: number;
    createdAt: Date;
  }>;
}>(set: T): T & { quizzes: Quiz[] } {
  return {
    ...set,
    quizzes: (set.quizzes || []).map(serializeQuiz),
    podcasts: (set.podcasts || []).map((p) => ({
      id: p.id,
      studySetId: p.studySetId,
      title: p.title,
      script: p.script,
      hasAudio: !!p.audioBase64,
      voice: p.voice,
      durationSec: p.durationSec,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

// Back-compat alias.
export const serializeStudySetQuizzes = serializeStudySetRelations;
