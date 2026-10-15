'use client';

import * as React from 'react';
import {
  FileText,
  ArrowLeft,
  Loader2,
  Sparkles,
  Plus,
  Clock,
  ListTree,
  BookMarked,
  HelpCircle,
  Copy,
  Check,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import type { StudySet, Summary as SummaryType, Subject } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SummaryView({
  subjects,
}: {
  subjects: Subject[];
}) {
  const selectedId = useAppStore((s) => s.selectedStudySetId);
  const setSelectedStudySetId = useAppStore((s) => s.setSelectedStudySetId);
  const [sets, setSets] = React.useState<StudySet[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);

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

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  if (selectedId) {
    return (
      <SummaryStudio
        studySetId={selectedId}
        onExit={() => setSelectedStudySetId(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <CardContent className="flex flex-col items-start gap-3 p-6 md:p-8">
          <Badge className="gap-1" variant="secondary">
            <Sparkles className="h-3 w-3" /> Quick summaries
          </Badge>
          <h2 className="text-xl font-bold md:text-2xl">
            Get the <span className="gradient-text">TL;DR</span> in seconds
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Pick any study set and LearnX AI will generate a concise overview, the key points,
            a vocabulary glossary, and self-check questions — perfect for revision before a test.
          </p>
        </CardContent>
      </Card>

      {loadingList ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No study sets to summarize"
          description="Create a study set first — then come back here for an instant TL;DR."
          action={
            <CreateStudySetDialog
              subjects={subjects}
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
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Pick a study set</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => (
              <StudySetCard key={s.id} studySet={s} onDeleted={loadList} onToggleFavorite={loadList} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStudio({
  studySetId,
  onExit,
}: {
  studySetId: string;
  onExit: () => void;
}) {
  const [summary, setSummary] = React.useState<SummaryType | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [style, setStyle] = React.useState<'brief' | 'standard' | 'detailed'>('standard');
  const [studySet, setStudySet] = React.useState<StudySet | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await api.post<{ summary: SummaryType }>(`/api/study-sets/${studySetId}/summary`, {
        style,
      });
      setSummary(res.summary);
      toast.success('Summary generated');
    } catch (e) {
      toast.error('Summary failed', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate on first load
  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ studySet: StudySet }>(`/api/study-sets/${studySetId}`);
        setStudySet(res.studySet);
      } catch {
        // ignore
      }
      generate();
    })();
  }, [studySetId]);

  function handleCopy() {
    if (!summary) return;
    const text = [
      `TL;DR\n${summary.tldr}\n`,
      `Key Points\n${summary.keyPoints.map((p) => `- ${p}`).join('\n')}\n`,
      `Key Terms\n${summary.keyTerms.map((t) => `- ${t.term}: ${t.definition}`).join('\n')}\n`,
      `Questions for Self\n${summary.questionsForSelf.map((q) => `- ${q}`).join('\n')}\n`,
      `Estimated study time: ${summary.estimatedMinutes} min`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Summary copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onExit} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{studySet?.title || 'Summary'}</h2>
          <p className="text-sm text-muted-foreground">AI-generated TL;DR & key takeaways</p>
        </div>
        {summary && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" onClick={generate} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? 'Generating...' : 'Regenerate'}
            </Button>
          </div>
        )}
      </div>

      {/* Style picker */}
      <div className="flex flex-wrap items-center gap-2">
        {(['brief', 'standard', 'detailed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            disabled={loading}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all disabled:opacity-50',
              style === s
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            {s}
          </button>
        ))}
        {!summary && !loading && (
          <Button onClick={generate} size="sm" className="gap-1 ml-auto">
            <Sparkles className="h-4 w-4" /> Generate
          </Button>
        )}
      </div>

      {loading && !summary && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {summary && (
        <div className="space-y-4 animate-float-up">
          {/* TL;DR */}
          <Card className="border-0 bg-gradient-to-br from-primary/10 via-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                TL;DR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[15px] leading-relaxed">{summary.tldr}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> ~{summary.estimatedMinutes} min read
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Key points */}
          {summary.keyPoints.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <ListTree className="h-4 w-4" />
                  </div>
                  Key Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Key terms */}
            {summary.keyTerms.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
                      <BookMarked className="h-4 w-4" />
                    </div>
                    Key Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.keyTerms.map((t, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5">
                      <p className="text-sm font-semibold">{t.term}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t.definition}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Self questions */}
            {summary.questionsForSelf.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    Questions for Self
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.questionsForSelf.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 shrink-0 text-base">🤔</span>
                      <span className="leading-relaxed">{q}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    Try answering these out loud or in the AI Tutor to check your understanding.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
