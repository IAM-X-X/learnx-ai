'use client';

import * as React from 'react';
import {
  NotebookPen,
  Layers,
  ListChecks,
  Headphones,
  Star,
  MoreVertical,
  Trash2,
  Pencil,
  FileDown,
  Clock,
  Share2,
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/stores/app-store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { StudySet } from '@/lib/types';
import { ProgressRing } from '@/components/progress-ring';
import { formatRelativeTime } from '@/lib/time';

const COLOR_MAP: Record<string, string> = {
  violet: 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-300',
  emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-300',
  amber: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-300',
  rose: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-300',
  cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-300',
  orange: 'from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-300',
};

export function StudySetCard({
  studySet,
  onDeleted,
  onToggleFavorite,
}: {
  studySet: StudySet;
  onDeleted?: () => void;
  onToggleFavorite?: () => void;
}) {
  const openStudySet = useAppStore((s) => s.openStudySet);
  const currentView = useAppStore((s) => s.view);
  const colorClass =
    COLOR_MAP[studySet.subject?.color || 'violet'] || COLOR_MAP.violet;

  // When opening from a feature view (summary/flashcards/quiz/podcast), stay in that view.
  const openView: 'notes' | 'summary' | 'flashcards' | 'quiz' | 'podcast' =
    currentView === 'summary' || currentView === 'flashcards' || currentView === 'quiz' || currentView === 'podcast'
      ? (currentView as 'summary' | 'flashcards' | 'quiz' | 'podcast')
      : 'notes';

  async function handleDelete() {
    try {
      await api.del(`/api/study-sets/${studySet.id}`);
      toast.success('Study set deleted');
      onDeleted?.();
    } catch (e) {
      toast.error('Delete failed', { description: (e as Error).message });
    }
  }

  function handleExport() {
    // Triggers a browser download of the study set JSON.
    const a = document.createElement('a');
    a.href = `/api/study-sets/${studySet.id}/export`;
    a.download = `${studySet.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'studyset'}.json`;
    a.click();
    toast.success('Exporting study set...');
  }

  async function handleShare() {
    try {
      const res = await api.post<{ token: string }>(`/api/study-sets/${studySet.id}/share`, {});
      const url = `${window.location.origin}/?s=${res.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard!', {
        description: 'Anyone with this link can view your study set (read-only).',
      });
    } catch (e) {
      toast.error('Share failed', { description: (e as Error).message });
    }
  }

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className={cn('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r', colorClass)} />
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              onClick={() => openStudySet(studySet.id, openView)}
              className="text-left"
            >
              <h3 className="font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">
                {studySet.title}
              </h3>
            </button>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {studySet.subject && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  {studySet.subject.name}
                </Badge>
              )}
              {studySet.lastStudied && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeTime(studySet.lastStudied)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {typeof studySet.progress === 'number' && (
              <div className="mr-1 hidden sm:block" title={`Mastery ${studySet.progress}%`}>
                <ProgressRing value={studySet.progress} size={38} />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleShare}
              title="Share link"
            >
              <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleFavorite}
            >
              <Star
                className={cn(
                  'h-4 w-4 transition-all',
                  studySet.favorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground hover:text-amber-400',
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openStudySet(studySet.id, openView)}>
                  <Pencil className="h-4 w-4 mr-2" /> Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" /> Share link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <FileDown className="h-4 w-4 mr-2" /> Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
          {studySet.description ||
            studySet.sourceContent.slice(0, 160) ||
            'No description.'}
        </p>
      </CardContent>
      <CardFooter className="pb-4 pt-0">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            <StatChip icon={NotebookPen} count={studySet.notes ? 1 : 0} label="Notes" onClick={() => openStudySet(studySet.id, 'notes')} />
            <StatChip icon={Layers} count={studySet._count?.flashcards ?? 0} label="Flashcards" onClick={() => openStudySet(studySet.id, 'flashcards')} />
            <StatChip icon={ListChecks} count={studySet._count?.quizzes ?? 0} label="Quizzes" onClick={() => openStudySet(studySet.id, 'quiz')} />
            <StatChip icon={Headphones} count={studySet._count?.podcasts ?? 0} label="Podcasts" onClick={() => openStudySet(studySet.id, 'podcast')} />
          </div>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}

function StatChip({
  icon: Icon,
  count,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
            count > 0
              ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
              : 'border-border text-muted-foreground opacity-60 hover:opacity-100',
          )}
        >
          <Icon className="h-3 w-3" />
          {count}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {count} {label}
      </TooltipContent>
    </Tooltip>
  );
}
