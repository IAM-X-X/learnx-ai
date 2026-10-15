'use client';

import * as React from 'react';
import {
  Layers,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  Plus,
  RotateCw,
  Check,
  X,
  AlertCircle,
  Trophy,
  Brain,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { Flashcard, StudySet, Subject } from '@/lib/types';
import { cn } from '@/lib/utils';

export function FlashcardsView({
  subjects: _subjects,
}: {
  subjects?: Subject[];
}) {
  const selectedId = useAppStore((s) => s.selectedStudySetId);
  const setSelectedStudySetId = useAppStore((s) => s.setSelectedStudySetId);
  const [sets, setSets] = React.useState<StudySet[]>([]);
  const [dueAll, setDueAll] = React.useState<Flashcard[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadSets = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ studySets: StudySet[] }>('/api/study-sets');
      setSets(res.studySets.filter((s) => (s._count?.flashcards ?? 0) > 0));
    } catch (e) {
      toast.error('Failed to load', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDueAll = React.useCallback(async () => {
    try {
      const res = await api.get<{ flashcards: (Flashcard & { studySet: { id: string; title: string } })[] }>(
        '/api/flashcards?due=true',
      );
      setDueAll(res.flashcards);
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    loadSets();
    loadDueAll();
  }, [loadSets, loadDueAll]);

  if (selectedId) {
    return <FlashcardStudy studySetId={selectedId} onExit={() => setSelectedStudySetId(null)} onDone={() => { loadSets(); loadDueAll(); }} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Due cards banner */}
      {dueAll.length > 0 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-rose-500/10 via-background to-amber-500/10">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{dueAll.length} cards due for review</h3>
                <p className="text-sm text-muted-foreground">
                  Across all your study sets — keep your streak alive!
                </p>
              </div>
            </div>
            <Button
              onClick={() => setSelectedStudySetId('__all__')}
              className="gap-2"
            >
              <Layers className="h-4 w-4" /> Study all due
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Study sets with flashcards</h2>
          <p className="text-sm text-muted-foreground">
            Pick a set to study, or generate new cards for an existing set.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No flashcards yet"
          description="Create a study set and LearnX AI will generate flashcards automatically with spaced-repetition scheduling."
          action={
            <CreateStudySetDialog
              subjects={_subjects || []}
              onCreated={loadSets}
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
            <StudySetCard key={s.id} studySet={s} onDeleted={loadSets} onToggleFavorite={loadSets} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlashcardStudy({
  studySetId,
  onExit,
  onDone,
}: {
  studySetId: string;
  onExit: () => void;
  onDone: () => void;
}) {
  const isAllMode = studySetId === '__all__';
  const [cards, setCards] = React.useState<(Flashcard & { studySet?: { id: string; title: string } })[]>([]);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [reviewing, setReviewing] = React.useState(false);
  const [stats, setStats] = React.useState({ studied: 0, correct: 0, again: 0 });
  const [done, setDone] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addFront, setAddFront] = React.useState('');
  const [addBack, setAddBack] = React.useState('');
  const [editingCardId, setEditingCardId] = React.useState<string | null>(null);

  const loadCards = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = isAllMode
        ? '/api/flashcards?due=true'
        : `/api/flashcards?studySetId=${studySetId}`;
      const res = await api.get<{ flashcards: (Flashcard & { studySet?: { id: string; title: string } })[] }>(url);
      setCards(res.flashcards);
      setIndex(0);
      setFlipped(false);
      setStats({ studied: 0, correct: 0, again: 0 });
      setDone(res.flashcards.length === 0);
    } catch (e) {
      toast.error('Failed to load cards', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [isAllMode, studySetId]);

  React.useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Keyboard shortcuts: Space=flip, 1-4=rate
  React.useEffect(() => {
    if (done || loading || addOpen) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (flipped && e.key === '1') {
        e.preventDefault();
        reviewCard(2);
      } else if (flipped && e.key === '2') {
        e.preventDefault();
        reviewCard(3);
      } else if (flipped && e.key === '3') {
        e.preventDefault();
        reviewCard(4);
      } else if (flipped && e.key === '4') {
        e.preventDefault();
        reviewCard(5);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, loading, addOpen, flipped, index, cards.length]);

  const current = cards[index];

  async function reviewCard(quality: number) {
    if (!current || reviewing) return;
    setReviewing(true);
    try {
      await api.patch(`/api/flashcards/${current.id}/review`, { quality });
      setStats((s) => ({
        studied: s.studied + 1,
        correct: quality >= 3 ? s.correct + 1 : s.correct,
        again: quality < 3 ? s.again + 1 : s.again,
      }));
      // advance
      if (index + 1 < cards.length) {
        setIndex((i) => i + 1);
        setFlipped(false);
      } else {
        setDone(true);
        onDone();
      }
    } catch (e) {
      toast.error('Review failed', { description: (e as Error).message });
    } finally {
      setReviewing(false);
    }
  }

  async function handleGenerate() {
    if (isAllMode) return;
    setGenerating(true);
    try {
      await api.post(`/api/study-sets/${studySetId}/flashcards`, { count: 12 });
      toast.success('New flashcards generated');
      loadCards();
    } catch (e) {
      toast.error('Generation failed', { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveManual() {
    if (!addFront.trim() || !addBack.trim()) return;
    try {
      if (editingCardId) {
        await api.patch(`/api/flashcards/${editingCardId}`, { front: addFront, back: addBack });
        toast.success('Flashcard updated');
      } else {
        await api.post(`/api/study-sets/${studySetId}/flashcards`, { manual: true, front: addFront, back: addBack });
        toast.success('Flashcard added');
      }
      setAddOpen(false);
      setEditingCardId(null);
      setAddFront('');
      setAddBack('');
      loadCards();
    } catch (e) {
      toast.error('Save failed', { description: (e as Error).message });
    }
  }

  function handleEditCurrent() {
    if (!current) return;
    setEditingCardId(current.id);
    setAddFront(current.front);
    setAddBack(current.back);
    setAddOpen(true);
  }

  async function handleDeleteCurrent() {
    if (!current) return;
    try {
      await api.del(`/api/flashcards/${current.id}`);
      toast.success('Flashcard deleted');
      // advance to next or finish
      if (index + 1 < cards.length) {
        setCards((c) => c.filter((_, i) => i !== index));
      } else {
        setCards((c) => c.filter((_, i) => i !== index));
        setIndex((i) => Math.max(0, i - 1));
      }
    } catch (e) {
      toast.error('Delete failed', { description: (e as Error).message });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (done) {
    const acc = stats.studied ? Math.round((stats.correct / stats.studied) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-0 bg-gradient-to-br from-emerald-500/10 via-background to-primary/10">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Session complete!</h2>
            <p className="text-muted-foreground">Great work. Here's your session summary:</p>
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              <SummaryStat label="Studied" value={stats.studied} />
              <SummaryStat label="Recalled" value={`${acc}%`} />
              <SummaryStat label="To review" value={stats.again} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onExit} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={loadCards} className="gap-1">
                <RefreshCw className="h-4 w-4" /> Study again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={Layers}
          title={isAllMode ? 'No cards due for review' : 'No flashcards in this set'}
          description={
            isAllMode
              ? 'You\'re all caught up! Come back later or generate new cards.'
              : 'Generate flashcards from this study set\'s notes to start studying.'
          }
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={onExit} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {!isAllMode && (
                <Button onClick={handleGenerate} disabled={generating} className="gap-1">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate cards
                </Button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  const progress = Math.round((index / cards.length) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {index + 1} / {cards.length}
          </Badge>
          {!isAllMode && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)} className="gap-1" title="Add a manual card">
                <Plus className="h-4 w-4" /> Add
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditCurrent} title="Edit this card">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDeleteCurrent} title="Delete this card">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating...' : 'AI cards'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Add/edit manual card dialog */}
      {addOpen && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" /> {editingCardId ? 'Edit flashcard' : 'Add a flashcard'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Front (question)</Label>
              <Textarea
                value={addFront}
                onChange={(e) => setAddFront(e.target.value)}
                placeholder="e.g. What is the powerhouse of the cell?"
                className="min-h-[60px] resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Back (answer)</Label>
              <Textarea
                value={addBack}
                onChange={(e) => setAddBack(e.target.value)}
                placeholder="e.g. The mitochondria"
                className="min-h-[60px] resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAddOpen(false); setEditingCardId(null); setAddFront(''); setAddBack(''); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveManual} disabled={!addFront.trim() || !addBack.trim()} className="gap-1">
                {editingCardId ? 'Save' : 'Add card'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flashcard */}
      <div className="flip-card h-72 sm:h-80" onClick={() => setFlipped((v) => !v)}>
        <div className={cn('flip-card-inner', flipped && 'flipped')}>
          {/* Front */}
          <div className="flip-card-face">
            <Card className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background p-6 transition-colors hover:border-primary/50">
              <Badge variant="outline" className="absolute left-4 top-4 gap-1">
                <Brain className="h-3 w-3" /> Question
              </Badge>
              <CardContent className="flex h-full flex-col items-center justify-center p-0 text-center">
                <p className="text-lg font-medium leading-relaxed sm:text-xl">{current.front}</p>
                <p className="mt-4 text-xs text-muted-foreground">Click or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Space</kbd> to reveal</p>
              </CardContent>
            </Card>
          </div>
          {/* Back */}
          <div className="flip-card-face">
            <Card className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-background p-6 transition-colors hover:border-emerald-500/50">
              <Badge variant="outline" className="absolute left-4 top-4 gap-1 text-emerald-600 dark:text-emerald-300">
                <Check className="h-3 w-3" /> Answer
              </Badge>
              <CardContent className="flex h-full flex-col items-center justify-center p-0 text-center">
                <p className="text-base leading-relaxed sm:text-lg">{current.back}</p>
                <p className="mt-3 text-xs text-muted-foreground">Rate your recall below</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div className={cn('grid grid-cols-4 gap-2 transition-opacity', !flipped && 'pointer-events-none opacity-40')}>
        <RateButton quality={1} label="Again" desc="<1m" color="rose" onClick={() => reviewCard(1)} disabled={reviewing} />
        <RateButton quality={3} label="Hard" desc="6m" color="amber" onClick={() => reviewCard(3)} disabled={reviewing} />
        <RateButton quality={4} label="Good" desc="1d+" color="cyan" onClick={() => reviewCard(4)} disabled={reviewing} />
        <RateButton quality={5} label="Easy" desc="4d+" color="emerald" onClick={() => reviewCard(5)} disabled={reviewing} />
      </div>

      {/* Session stats */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>{stats.correct} recalled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span>{stats.again} to review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RotateCw className="h-4 w-4 text-primary" />
          <span>{stats.studied} total</span>
        </div>
      </div>
    </div>
  );
}

function RateButton({
  label,
  desc,
  color,
  onClick,
  disabled,
}: {
  quality: number;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const colorMap: Record<string, string> = {
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-300',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-300',
    cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-xl border py-3 transition-all disabled:opacity-50',
        colorMap[color],
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] opacity-80">{desc}</span>
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
