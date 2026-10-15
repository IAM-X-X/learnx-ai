// Shared TypeScript types for LearnX AI.

export type ViewMode =
  | 'dashboard'
  | 'tutor'
  | 'notes'
  | 'summary'
  | 'flashcards'
  | 'quiz'
  | 'practice'
  | 'schedule'
  | 'podcast'
  | 'progress'
  | 'library'
  | 'settings';

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  _count?: { studySets: number };
}

export interface Flashcard {
  id: string;
  studySetId: string;
  front: string;
  back: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  lastReviewed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  order: number;
}

export interface Quiz {
  id: string;
  studySetId: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
  durationSec: number;
  createdAt: string;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  sourceType: 'text' | 'topic' | 'paste';
  sourceContent: string;
  notes: string;
  subjectId: string | null;
  subject: Subject | null;
  tags: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  flashcards: Flashcard[];
  quizzes: Quiz[];
  podcasts: Podcast[];
  // computed in list endpoint (not present on detail)
  progress?: number;
  reviewedCards?: number;
  hasQuizAttempt?: boolean;
  lastStudied?: string | null;
  _count?: {
    flashcards: number;
    quizzes: number;
    podcasts: number;
  };
}

export interface Podcast {
  id: string;
  studySetId: string;
  title: string;
  script: string;
  hasAudio: boolean;
  voice: string;
  durationSec: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  _count?: { messages: number };
}

export interface DashboardStats {
  totalStudySets: number;
  totalFlashcards: number;
  totalQuizzes: number;
  dueFlashcards: number;
  quizzesTaken: number;
  averageScore: number;
  studyStreakDays: number;
  longestStreak?: number;
  recentActivity: StudyActivity[];
  weeklyActivity: { date: string; count: number }[];
  heatmap?: { date: string; count: number }[];
}

export interface StudyActivity {
  id: string;
  studySetId: string | null;
  type: string;
  detail: string;
  score: number;
  createdAt: string;
  studySet?: { id: string; title: string } | null;
}

/** A generated TL;DR summary of a study set. */
export interface Summary {
  tldr: string;
  keyPoints: string[];
  keyTerms: { term: string; definition: string }[];
  questionsForSelf: string[];
  estimatedMinutes: number;
}

/** Per-day XP / activity for analytics. */
export interface DailyProgress {
  date: string; // YYYY-MM-DD
  xp: number;
  count: number;
}

/** Quiz score trend point. */
export interface ScoreTrendPoint {
  date: string;
  score: number; // percentage
  total: number; // total questions
}

/** Subject mastery breakdown for analytics. */
export interface SubjectMastery {
  subjectId: string | null;
  subjectName: string;
  color: string;
  studySets: number;
  flashcards: number;
  quizzesTaken: number;
  averageScore: number;
  mastery: number; // 0-100
}

/** Daily study goal state. */
export interface StudyGoal {
  dailyTargetXp: number;
  todayXp: number;
  streakDays: number;
  lastGoalDate: string | null;
}

