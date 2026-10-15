'use client';

import * as React from 'react';
import {
  Dumbbell,
  Loader2,
  Sparkles,
  ArrowRight,
  RotateCw,
  Trophy,
  Check,
  X,
  Layers,
  ListChecks,
  Brain,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PracticeItem {
  type: 'flashcard' | 'quiz';
  id: string;
  studySetId: string;
  studySetTitle: string;
  front?: string;
  back?: string;
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  quizId?: string;
}

interface PracticeBatch {
  practice: PracticeItem[];
  counts: { flashcards: number; quizzes: number; totalAvailable: number };
}

export function PracticeView() {
  const [batch, setBatch] = React.useState<PracticeItem[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [stats, setStats] = React.useState({ correct: 0, wrong: 0, done: 0 });
  const [results, setResults] = React.useState<Record<string, boolean>>({});
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const loadBatch = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PracticeBatch>('/api/practice?limit=15');
      setBatch(res.practice);
    } catch (e) {
      toast.error('Failed to load practice', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  function start() {
    if (!batch || batch.length === 0) return;
    setActive(true);
    setIndex(0);
    setFlipped(false);
    setSelectedAnswer(null);
    setRevealed(false);
    setStats({ correct: 0, wrong: 0, done: 0 });
    setResults({});
    setDone(false);
  }

  const current = batch?.[index];

  // Submit a flashcard review (SRS) — quality >= 3 = correct
  async function reviewCard(quality: number) {
    if (!current || current.type !== 'flashcard' || submitting) return;
    setSubmitting(true);
    const isCorrect = quality >= 3;
    try {
      await api.patch(`/api/flashcards/${current.id}/review`, { quality });
    } catch {
      // non-fatal
    }
    recordResult(isCorrect);
    setSubmitting(false);
  }

  // Submit a quiz answer
  function answerQuestion(idx: number) {
    if (!current || current.type !== 'quiz' || revealed) return;
    setSelectedAnswer(idx);
  }

  function revealAnswer() {
    if (!current || current.type !== 'quiz' || selectedAnswer === null) return;
    const isCorrect = selectedAnswer === current.correctIndex;
    setRevealed(true);
    recordResult(isCorrect);
  }

  function recordResult(isCorrect: boolean) {
    setResults((r) => ({ ...r, [current.id]: isCorrect }));
    setStats((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
      done: s.done + 1,
    }));
  }

  function next() {
    if (!batch) return;
    setFlipped(false);
    setSelectedAnswer(null);
    setRevealed(false);
    if (index + 1 < batch.length) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  }

  function restart() {
    loadBatch().then(() => start());
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!batch || batch.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Dumbbell}
          title="Nothing to practice yet"
          description="Practice mixes your due flashcards with quiz questions you've previously gotten wrong — so you focus on what needs work. Create a study set, review some flashcards, and take a quiz to build your practice queue."
        />
      </div>
    );
  }

  // Finished screen
  if (done) {
    const total = stats.done;
    const acc = total ? Math.round((stats.correct / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl',
              acc >= 80 ? 'bg-emerald-500/15 text-emerald-500' : acc >= 50 ? 'bg-amber-500/15 text-amber-500' : 'bg-rose-500/15 text-rose-500',
            )}>
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">
              {acc >= 80 ? 'Excellent work!' : acc >= 50 ? 'Solid session!' : 'Keep practicing!'}
            </h2>
            <div className="text-4xl font-bold gradient-text">{acc}%</div>
            <p className="text-muted-foreground">
              You got <strong>{stats.correct}</strong> right out of <strong>{total}</strong>
              {stats.wrong > 0 && <> · {stats.wrong} to review</>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setActive(false); setDone(false); }} className="gap-1">
                Back
              </Button>
              <Button onClick={restart} className="gap-1">
                <RotateCw className="h-4 w-4" /> Practice again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing screen
  if (!active) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
          <CardContent className="flex flex-col items-start gap-4 p-6 md:p-8">
            <Badge className="gap-1" variant="secondary">
              <Dumbbell className="h-3 w-3" /> Adaptive practice
            </Badge>
            <h2 className="text-xl font-bold md:text-2xl">
              Train your <span className="gradient-text">weak spots</span>
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Practice mixes due flashcards with quiz questions you've missed before —
              so every minute you spend here targets the material you're most likely to forget.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Layers className="h-4 w-4 text-emerald-500" />
                <strong>{batch.filter((b) => b.type === 'flashcard').length}</strong>
                <span className="text-muted-foreground">flashcards</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <ListChecks className="h-4 w-4 text-amber-500" />
                <strong>{batch.filter((b) => b.type === 'quiz').length}</strong>
                <span className="text-muted-foreground">quiz questions</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Brain className="h-4 w-4 text-primary" />
                <strong>{batch.length}</strong>
                <span className="text-muted-foreground">total</span>
              </div>
            </div>
            <Button onClick={start} size="lg" className="gap-2">
              <Flame className="h-4 w-4" /> Start practice session
            </Button>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Tip: Practice uses spaced repetition + your past mistakes. Do a short session daily for the best retention.
        </p>
      </div>
    );
  }

  // Active session
  if (!current) return null;
  const progress = Math.round((index / batch.length) * 100);
  const isCard = current.type === 'flashcard';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {isCard ? <Layers className="h-3 w-3" /> : <ListChecks className="h-3 w-3" />}
            {isCard ? 'Flashcard' : 'Quiz'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {index + 1} / {batch.length} · {current.studySetTitle}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" /> {stats.correct}
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-300">
            <X className="h-3.5 w-3.5" /> {stats.wrong}
          </span>
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Card / Question */}
      {isCard ? (
        <div className="flip-card h-72 sm:h-80" onClick={() => !revealed && setFlipped((v) => !v)}>
          <div className={cn('flip-card-inner', flipped && 'flipped')}>
            <div className="flip-card-face">
              <Card className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background p-6 transition-colors hover:border-primary/50">
                <Badge variant="outline" className="absolute left-4 top-4 gap-1">
                  <Brain className="h-3 w-3" /> Recall this
                </Badge>
                <CardContent className="flex h-full flex-col items-center justify-center p-0 text-center">
                  <p className="text-lg font-medium leading-relaxed sm:text-xl">{current.front}</p>
                  <p className="mt-4 text-xs text-muted-foreground">Click to reveal answer</p>
                </CardContent>
              </Card>
            </div>
            <div className="flip-card-face">
              <Card className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-background p-6">
                <Badge variant="outline" className="absolute left-4 top-4 gap-1 text-emerald-600 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> Answer
                </Badge>
                <CardContent className="flex h-full flex-col items-center justify-center p-0 text-center">
                  <p className="text-base leading-relaxed sm:text-lg">{current.back}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <Card className="min-h-[18rem]">
          <CardContent className="p-6 space-y-4">
            <Badge variant="outline" className="gap-1">
              <ListChecks className="h-3 w-3" /> Multiple choice
            </Badge>
            <p className="text-lg font-medium leading-snug">{current.question}</p>
            <div className="space-y-2">
              {current.options?.map((opt, idx) => {
                const isCorrect = revealed && idx === current.correctIndex;
                const isWrong = revealed && idx === selectedAnswer && idx !== current.correctIndex;
                const isSelected = selectedAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => answerQuestion(idx)}
                    disabled={revealed}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all disabled:cursor-default',
                      isCorrect && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                      isWrong && 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300',
                      !revealed && isSelected && 'border-primary bg-primary/10 text-primary',
                      !revealed && !isSelected && 'border-border hover:border-primary/40 hover:bg-muted',
                      revealed && !isCorrect && !isWrong && 'border-border opacity-60',
                    )}
                  >
                    <span className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                      isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                      isWrong ? 'border-rose-500 bg-rose-500 text-white' :
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                    )}>
                      {isCorrect ? <Check className="h-4 w-4" /> : isWrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
            {revealed && current.explanation && (
              <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                <strong>Explanation:</strong> {current.explanation}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {isCard ? (
          flipped ? (
            <div className={cn('grid grid-cols-2 gap-2', !flipped && 'pointer-events-none opacity-40')}>
              <Button variant="outline" onClick={() => reviewCard(2)} disabled={submitting} className="gap-1 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300">
                <X className="h-4 w-4" /> Didn't know
              </Button>
              <Button onClick={() => reviewCard(5)} disabled={submitting} className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                <Check className="h-4 w-4" /> Got it
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Flip the card to rate your recall
            </p>
          )
        ) : !revealed ? (
          <Button onClick={revealAnswer} disabled={selectedAnswer === null} className="w-full gap-1">
            Check answer <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={next} className="w-full gap-1">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {isCard && flipped && (
          <Button onClick={next} variant="ghost" size="sm" className="w-full text-xs">
            Skip this card
          </Button>
        )}
      </div>
    </div>
  );
}
