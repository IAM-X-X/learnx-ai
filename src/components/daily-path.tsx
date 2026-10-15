'use client';

import * as React from 'react';
import {
  Sparkles,
  Loader2,
  RotateCw,
  Layers,
  ListChecks,
  BookOpen,
  Coffee,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DailyPathTask {
  title: string;
  reason: string;
  type: 'review' | 'quiz' | 'learn' | 'rest';
  estimatedMinutes: number;
}
interface DailyPath {
  greeting: string;
  summary: string;
  tasks: DailyPathTask[];
  tip: string;
}

const TYPE_META: Record<string, { icon: typeof BookOpen; color: string; label: string }> = {
  review: { icon: Layers, color: 'text-emerald-500 bg-emerald-500/10', label: 'Review' },
  quiz: { icon: ListChecks, color: 'text-amber-500 bg-amber-500/10', label: 'Quiz' },
  learn: { icon: BookOpen, color: 'text-violet-500 bg-violet-500/10', label: 'Learn' },
  rest: { icon: Coffee, color: 'text-cyan-500 bg-cyan-500/10', label: 'Rest' },
};

export function DailyPath() {
  const [path, setPath] = React.useState<DailyPath | null>(null);
  const [loading, setLoading] = React.useState(true);
  const setView = useAppStore((s) => s.setView);
  const setSelectedStudySetId = useAppStore((s) => s.setSelectedStudySetId);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ path: DailyPath }>('/api/daily-path');
      setPath(res.path);
    } catch (e) {
      toast.error('Could not load your learning path', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!path || path.tasks.length === 0) return null;

  return (
    <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20 overflow-hidden">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="pb-2 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Today&apos;s learning path
            </CardTitle>
            <p className="mt-1 text-sm font-medium leading-snug">{path.greeting}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{path.summary}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={load} title="Refresh">
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 relative">
        {path.tasks.map((task, i) => {
          const meta = TYPE_META[task.type] || TYPE_META.learn;
          const Icon = meta.icon;
          return (
            <button
              key={i}
              onClick={() => {
                // Route to the relevant view based on type
                if (task.type === 'review') {
                  setSelectedStudySetId('__all__');
                  setView('flashcards');
                } else if (task.type === 'quiz') {
                  setView('quiz');
                } else if (task.type === 'learn') {
                  setView('library');
                }
              }}
              className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card/70 p-3 text-left backdrop-blur transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm"
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5', meta.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{task.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{task.reason}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-start mt-0.5">
                <Badge variant="outline" className="text-[10px] whitespace-nowrap">{task.estimatedMinutes}m</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
        {path.tip && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80">{path.tip}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
