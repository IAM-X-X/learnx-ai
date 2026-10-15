'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, NotebookPen, Layers, ListChecks, Headphones, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Markdown } from '@/components/markdown';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { StudySet } from '@/lib/types';

export function SharedView({ token, onExit }: { token: string; onExit: () => void }) {
  const [studySet, setStudySet] = React.useState<StudySet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ studySet: StudySet }>(`/api/shared/${token}`);
        setStudySet(res.studySet);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function copyLink() {
    const url = `${window.location.origin}/?s=${token}`;
    await navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !studySet) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Shared study set not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may have been revoked or never existed.
        </p>
        <Button onClick={onExit} className="mt-6 gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to LearnX AI
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Shared banner */}
      <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <CardContent className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-white">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <Badge variant="secondary" className="gap-1 mb-1">
                <ExternalLink className="h-3 w-3" /> Shared study set
              </Badge>
              <h2 className="text-xl font-bold leading-tight">{studySet.title}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1">
              Copy link
            </Button>
            <Button size="sm" onClick={onExit} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Open LearnX AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {studySet.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-primary" /> Study Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown content={studySet.notes} />
          </CardContent>
        </Card>
      )}

      {/* Flashcards preview */}
      {studySet.flashcards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-500" /> Flashcards ({studySet.flashcards.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {studySet.flashcards.slice(0, 12).map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">{c.front}</p>
                <p className="mt-1.5 text-xs text-muted-foreground border-t border-border pt-1.5">{c.back}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quiz preview */}
      {studySet.quizzes.length > 0 && studySet.quizzes[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-amber-500" /> Quiz Preview ({studySet.quizzes[0].questions.length} questions)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {studySet.quizzes[0].questions.slice(0, 5).map((q, i) => (
              <div key={q.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, idx) => (
                    <p key={idx} className={`text-xs ${idx === q.correctIndex ? 'text-emerald-600 dark:text-emerald-300 font-medium' : 'text-muted-foreground'}`}>
                      {String.fromCharCode(65 + idx)}. {opt}
                      {idx === q.correctIndex && ' ✓'}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Podcasts */}
      {studySet.podcasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-rose-500" /> Podcasts ({studySet.podcasts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studySet.podcasts.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.script.slice(0, 150)}...</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          <Sparkles className="inline h-4 w-4 text-primary mr-1" />
          Created with <strong>LearnX AI</strong> — turn anything into notes, flashcards, quizzes & podcasts.
        </p>
      </div>
    </div>
  );
}
