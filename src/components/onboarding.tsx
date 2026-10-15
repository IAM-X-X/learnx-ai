'use client';

import * as React from 'react';
import {
  Brain,
  Sparkles,
  Layers,
  ListChecks,
  Headphones,
  TrendingUp,
  ArrowRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { Subject } from '@/lib/types';

const STORAGE_KEY = 'learnx:onboarding-dismissed';

interface OnboardingProps {
  subjects: Subject[];
  onDismiss: () => void;
  onCreated: () => void;
}

const STEPS = [
  { icon: Sparkles, title: 'Create a study set', desc: 'Paste notes, a topic, a URL, or upload a file', color: 'text-violet-500 bg-violet-500/10' },
  { icon: Layers, title: 'AI makes flashcards', desc: 'Spaced repetition schedules your reviews', color: 'text-emerald-500 bg-emerald-500/10' },
  { icon: ListChecks, title: 'Take AI quizzes', desc: 'Test yourself, track your scores', color: 'text-amber-500 bg-amber-500/10' },
  { icon: Headphones, title: 'Listen to podcasts', desc: 'AI narrates your material on the go', color: 'text-rose-500 bg-rose-500/10' },
  { icon: TrendingUp, title: 'Track progress', desc: 'XP, streaks, goals & achievements', color: 'text-cyan-500 bg-cyan-500/10' },
];

export function Onboarding({ subjects, onDismiss, onCreated }: OnboardingProps) {
  const setView = useAppStore((s) => s.setView);
  const [seeding, setSeeding] = React.useState(false);

  function handleDismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    onDismiss();
  }

  async function handleTryDemo() {
    setSeeding(true);
    try {
      await api.post('/api/seed', {});
      toast.success('Demo study set ready!');
      onCreated();
      handleDismiss();
    } catch (e) {
      toast.error('Demo failed', { description: (e as Error).message });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-12 -bottom-20 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 z-10 h-8 w-8"
        onClick={handleDismiss}
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="relative flex flex-col items-center gap-6 p-6 md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl brand-gradient text-white shadow-xl shadow-primary/20">
          <Brain className="h-8 w-8" />
        </div>
        <div className="text-center max-w-2xl">
          <Badge className="gap-1 mb-3" variant="secondary">
            <Sparkles className="h-3 w-3" /> Welcome to LearnX AI
          </Badge>
          <h2 className="text-2xl font-bold leading-tight md:text-3xl">
            Turn anything into <span className="gradient-text">notes, flashcards, quizzes & podcasts</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Give LearnX AI any topic, article, or pasted notes and it instantly builds everything
            you need to master it — powered by AI, completely free, no sign-up.
          </p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-3 text-center backdrop-blur transition-all hover:shadow-md"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold leading-tight">{step.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <CreateStudySetDialog
            subjects={subjects}
            onCreated={() => { onCreated(); handleDismiss(); }}
            trigger={
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" /> Create your first study set
              </Button>
            }
          />
          <Button size="lg" variant="secondary" onClick={handleTryDemo} disabled={seeding} className="gap-2">
            {seeding ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
            {seeding ? 'Generating demo...' : 'Try a demo'}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Free to start · No sign-up · Your data stays on this device
        </p>
      </CardContent>
    </Card>
  );
}

/** Returns true if onboarding has been dismissed before (localStorage). */
export function isOnboardingDismissed(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}
