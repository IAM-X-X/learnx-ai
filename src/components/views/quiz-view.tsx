'use client';

import * as React from 'react';
import {
  ListChecks,
  ArrowLeft,
  Loader2,
  Sparkles,
  Plus,
  Trophy,
  Check,
  X,
  Clock,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { Quiz, QuizQuestion, StudySet, Subject } from '@/lib/types';
import { cn } from '@/lib/utils';

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
};

export function QuizView({
  subjects: _subjects,
}: {
  subjects?: Subject[];
}) {
  const selectedId = useAppStore((s) => s.selectedStudySetId);
  const setSelectedStudySetId = useAppStore((s) => s.setSelectedStudySetId);
  const [sets, setSets] = React.useState<StudySet[]>([]);
  const [active, setActive] = React.useState<StudySet | null>(null);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [taking, setTaking] = React.useState<Quiz | null>(null);

  const loadList = React.useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get<{ studySets: StudySet[] }>('/api/study-sets');
      setSets(res.studySets);
    } catch (e) {
      toast.error('Failed to load', { description: (e as Error).message });
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = React.useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.get<{ studySet: StudySet }>(`/api/study-sets/${id}`);
      setActive(res.studySet);
    } catch (e) {
      toast.error('Failed to load', { description: (e as Error).message });
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  React.useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else { setActive(null); setTaking(null); }
  }, [selectedId, loadDetail]);

  if (selectedId && taking && active) {
    return <QuizTaker quiz={taking} onExit={() => setTaking(null)} studySetTitle={active.title} />;
  }

  if (selectedId && active) {
    return (
      <QuizList
        studySet={active}
        loading={loadingDetail}
        onBack={() => { setSelectedStudySetId(null); setActive(null); }}
        onTake={(q) => setTaking(q)}
        onGenerated={() => loadDetail(active.id)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Quizzes & tests</h2>
          <p className="text-sm text-muted-foreground">
            AI-generated quizzes for every study set. Test yourself and track your scores.
          </p>
        </div>
      </div>

      {loadingList ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No quizzes yet"
          description="Create a study set and LearnX AI will generate quizzes automatically."
          action={
            <CreateStudySetDialog
              subjects={_subjects || []}
              onCreated={loadList}
              trigger={
                <Button size="lg" className="gap-2">
                  <Plus className="h-4 w-4" /> Create study set
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <StudySetCard key={s.id} studySet={s} onDeleted={loadList} onToggleFavorite={loadList} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizList({
  studySet,
  loading,
  onBack,
  onTake,
  onGenerated,
}: {
  studySet: StudySet;
  loading: boolean;
  onBack: () => void;
  onTake: (q: Quiz) => void;
  onGenerated: () => void;
}) {
  const [generating, setGenerating] = React.useState(false);
  const [genOpts, setGenOpts] = React.useState({ count: 8, difficulty: 'medium' as 'easy' | 'medium' | 'hard', mixTypes: true });

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await api.post<{ quiz: Quiz }>(`/api/study-sets/${studySet.id}/quiz`, genOpts);
      toast.success('Quiz generated!');
      onGenerated();
      onTake(res.quiz);
    } catch (e) {
      toast.error('Generation failed', { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{studySet.title}</h2>
          <p className="text-sm text-muted-foreground">Quizzes & tests</p>
        </div>
      </div>

      {/* Generate new quiz */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Generate a new quiz
          </CardTitle>
          <CardDescription>AI creates fresh questions from your notes every time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Questions</label>
              <select
                value={genOpts.count}
                onChange={(e) => setGenOpts((o) => ({ ...o, count: Number(e.target.value) }))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {[5, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Difficulty</label>
              <select
                value={genOpts.difficulty}
                onChange={(e) => setGenOpts((o) => ({ ...o, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Types</label>
              <button
                onClick={() => setGenOpts((o) => ({ ...o, mixTypes: !o.mixTypes }))}
                className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm"
              >
                {genOpts.mixTypes ? 'Mixed (MC + T/F)' : 'Multiple choice only'}
              </button>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="gap-1">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating...' : 'Generate quiz'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing quizzes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Existing quizzes</h3>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : studySet.quizzes.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No quizzes yet"
            description="Generate your first quiz above — it takes about 15 seconds."
          />
        ) : (
          studySet.quizzes.map((q, i) => {
            const bestAttempt = q.attempts[0];
            const bestScore = bestAttempt
              ? Math.round((bestAttempt.score / (bestAttempt.totalQuestions || 1)) * 100)
              : null;
            return (
              <Card key={q.id} className="transition-all hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{q.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={DIFFICULTY_COLOR[q.difficulty]}>
                          {q.difficulty}
                        </Badge>
                        <span>{q.questions.length} questions</span>
                        <span>· {q.attempts.length} attempts</span>
                        {bestScore !== null && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                            <Award className="h-3 w-3" /> best: {bestScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => onTake(q)} size="sm" className="gap-1 shrink-0">
                    {q.attempts.length > 0 ? 'Retake' : 'Start'} <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function QuizTaker({
  quiz,
  onExit,
  studySetTitle,
}: {
  quiz: Quiz;
  onExit: () => void;
  studySetTitle: string;
}) {
  // re-fetch quiz with full questions to ensure options loaded
  const [fullQuiz, setFullQuiz] = React.useState<Quiz>(quiz);
  const [loading, setLoading] = React.useState(!quiz.questions?.length);
  const [current, setCurrent] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [startTime] = React.useState(Date.now());
  const [score, setScore] = React.useState(0);
  const [, setTick] = React.useState(0);

  // Live timer: re-render every second while the quiz is in progress
  React.useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  React.useEffect(() => {
    if (!quiz.questions?.length) {
      (async () => {
        try {
          const res = await api.get<{ quiz: Quiz }>(`/api/quizzes/${quiz.id}`);
          setFullQuiz(res.quiz);
        } catch (e) {
          toast.error('Failed to load quiz', { description: (e as Error).message });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [quiz]);

  const questions: QuizQuestion[] = fullQuiz.questions || [];
  const q = questions[current];

  function selectAnswer(qId: string, idx: number) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qId]: idx }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const formatted = questions.map((qq) => ({
      questionId: qq.id,
      selectedIndex: answers[qq.id] ?? -1,
      correct: answers[qq.id] === qq.correctIndex,
    }));
    const correct = formatted.filter((f) => f.correct).length;
    setScore(correct);
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    try {
      await api.post(`/api/quizzes/${quiz.id}/attempts`, { answers: formatted, durationSec });
      toast.success(`Scored ${correct}/${questions.length}`);
    } catch (e) {
      toast.error('Failed to save attempt', { description: (e as Error).message });
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  function retry() {
    setAnswers({});
    setSubmitted(false);
    setCurrent(0);
    setScore(0);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="This quiz has no questions"
        action={<Button onClick={onExit}>Back</Button>}
      />
    );
  }

  const progress = Math.round(((current + 1) / questions.length) * 100);
  const allAnswered = questions.every((qq) => answers[qq.id] !== undefined);

  if (submitted) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl',
              pct >= 80 ? 'bg-emerald-500/15 text-emerald-500' : pct >= 50 ? 'bg-amber-500/15 text-amber-500' : 'bg-rose-500/15 text-rose-500',
            )}>
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">
              {pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!'}
            </h2>
            <div className="text-4xl font-bold gradient-text">{pct}%</div>
            <p className="text-muted-foreground">
              You scored <strong>{score}</strong> out of <strong>{questions.length}</strong> in{' '}
              {Math.round((Date.now() - startTime) / 1000)}s
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onExit} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to quizzes
              </Button>
              <Button onClick={retry} className="gap-1">
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Review */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Review answers</h3>
          {questions.map((qq, i) => {
            const sel = answers[qq.id];
            const correct = sel === qq.correctIndex;
            return (
              <Card key={qq.id} className={cn('border-l-4', correct ? 'border-l-emerald-500' : 'border-l-rose-500')}>
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-sm">
                    {i + 1}. {qq.question}
                  </p>
                  <div className="space-y-1">
                    {qq.options.map((opt, idx) => {
                      const isCorrect = idx === qq.correctIndex;
                      const isSel = idx === sel;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
                            isCorrect && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                            isSel && !isCorrect && 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
                            !isCorrect && !isSel && 'text-muted-foreground',
                          )}
                        >
                          {isCorrect ? (
                            <Check className="h-4 w-4 shrink-0" />
                          ) : isSel ? (
                            <X className="h-4 w-4 shrink-0" />
                          ) : (
                            <span className="h-4 w-4 shrink-0" />
                          )}
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                  {qq.explanation && (
                    <p className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                      <strong>Explanation:</strong> {qq.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> {Math.floor((Date.now() - startTime) / 60000)}:{String(Math.floor(((Date.now() - startTime) / 1000) % 60)).padStart(2, '0')}
          <span className="mx-1 opacity-30">·</span>
          {current + 1} / {questions.length}
        </Badge>
      </div>

      <Progress value={progress} className="h-1.5" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={DIFFICULTY_COLOR[fullQuiz.difficulty]}>
              {fullQuiz.difficulty}
            </Badge>
            <Badge variant="outline">{q.type === 'true_false' ? 'True / False' : 'Multiple Choice'}</Badge>
          </div>
          <CardTitle className="text-lg leading-snug">{q.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt, idx) => {
            const selected = answers[q.id] === idx;
            return (
              <button
                key={idx}
                onClick={() => selectAnswer(q.id, idx)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/40 hover:bg-muted',
                )}
              >
                <span className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                )}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <p className="text-xs text-muted-foreground">
          {Object.keys(answers).length} / {questions.length} answered
        </p>
        {current + 1 < questions.length ? (
          <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!allAnswered || submitting} className="gap-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}
