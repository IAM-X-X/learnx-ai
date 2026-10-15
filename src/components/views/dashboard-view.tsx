'use client';

import * as React from 'react';
import {
  Layers,
  ListChecks,
  NotebookPen,
  Headphones,
  Flame,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
  Plus,
  Loader2,
  Brain,
  Headphones as HeadphonesIcon,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Heatmap } from '@/components/heatmap';
import { Onboarding, isOnboardingDismissed } from '@/components/onboarding';
import { DailyPath } from '@/components/daily-path';
import { getUserProfile } from '@/components/onboarding-wizard';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import type { DashboardStats, StudySet } from '@/lib/types';
import { StudySetCard } from '@/components/study-set-card';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const setView = useAppStore((s) => s.setView);
  const openStudySet = useAppStore((s) => s.openStudySet);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [recentSets, setRecentSets] = React.useState<StudySet[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subjects, setSubjects] = React.useState<{ id: string; name: string }[]>([]);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, setsRes, subjRes] = await Promise.all([
        api.get<{ stats: DashboardStats }>('/api/stats'),
        api.get<{ studySets: StudySet[] }>('/api/study-sets'),
        api.get<{ subjects: { id: string; name: string }[] }>('/api/subjects'),
      ]);
      setStats(statsRes.stats);
      setRecentSets(setsRes.studySets.slice(0, 6));
      setSubjects(subjRes.subjects);
    } catch (e) {
      toast.error('Failed to load dashboard', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Show onboarding only after loading completes and there are no study sets.
  React.useEffect(() => {
    if (!loading && (!stats || stats.totalStudySets === 0) && !isOnboardingDismissed()) {
      setShowOnboarding(true);
    }
  }, [loading, stats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const isEmpty = !stats || stats.totalStudySets === 0;
  const totalWeekly = stats ? stats.weeklyActivity.reduce((n, d) => n + d.count, 0) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Onboarding for first-time users */}
      {showOnboarding && isEmpty && (
        <Onboarding
          subjects={subjects}
          onDismiss={() => setShowOnboarding(false)}
          onCreated={load}
        />
      )}

      {/* Hero */}
      <HeroSection
        studyStreak={stats?.studyStreakDays ?? 0}
        dueCards={stats?.dueFlashcards ?? 0}
        onStudy={() => setView('flashcards')}
        subjects={subjects}
      />

      {isEmpty && !showOnboarding && (
        <EmptyState
          icon={Brain}
          title="Welcome to LearnX AI"
          description="Create your first study set and let AI turn it into notes, flashcards, quizzes, and a podcast — all in seconds. Free forever."
          action={
            <div className="flex items-center gap-2">
              <CreateStudySetDialog
                subjects={[]}
                onCreated={load}
                trigger={
                  <Button size="lg" className="gap-2">
                    <Plus className="h-4 w-4" /> Create your first study set
                  </Button>
                }
              />
              <Button variant="outline" size="lg" className="gap-2" onClick={() => seedDemo(load)}>
                <Sparkles className="h-4 w-4" /> Try a demo
              </Button>
            </div>
          }
        />
      )}

      {!isEmpty && stats && (
        <>
          {/* AI Daily Learning Path */}
          <DailyPath />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={NotebookPen} label="Study Sets" value={stats.totalStudySets} color="violet" onClick={() => setView('library')} />
            <StatCard icon={Layers} label="Flashcards" value={stats.totalFlashcards} color="emerald" onClick={() => setView('flashcards')} />
            <StatCard icon={ListChecks} label="Quizzes" value={stats.totalQuizzes} color="amber" onClick={() => setView('quiz')} />
            <StatCard icon={Flame} label="Due Cards" value={stats.dueFlashcards} color="rose" onClick={() => setView('flashcards')} />
            <StatCard icon={TrendingUp} label="Avg Score" value={`${stats.averageScore}%`} color="cyan" onClick={() => setView('quiz')} />
            <StatCard icon={Flame} label="Streak" value={`${stats.studyStreakDays}d`} color="orange" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              icon={Sparkles}
              title="Ask AI Tutor"
              description="Get instant explanations"
              onClick={() => setView('tutor')}
              gradient="from-violet-500/15 to-violet-500/5"
              iconColor="text-violet-500"
            />
            <QuickActionCard
              icon={Layers}
              title="Study Cards"
              description={`${stats.dueFlashcards} due today`}
              onClick={() => setView('flashcards')}
              gradient="from-emerald-500/15 to-emerald-500/5"
              iconColor="text-emerald-500"
            />
            <QuickActionCard
              icon={ListChecks}
              title="Take a Quiz"
              description="Test your knowledge"
              onClick={() => setView('quiz')}
              gradient="from-amber-500/15 to-amber-500/5"
              iconColor="text-amber-500"
            />
            <QuickActionCard
              icon={Headphones}
              title="Listen & Learn"
              description="AI-generated podcasts"
              onClick={() => setView('podcast')}
              gradient="from-rose-500/15 to-rose-500/5"
              iconColor="text-rose-500"
            />
          </div>

          {/* Streak heatmap */}
          {stats.heatmap && stats.heatmap.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-4 w-4 text-amber-500" /> Study consistency
                </CardTitle>
                <CardDescription>
                  {stats.studyStreakDays}-day current streak
                  {stats.longestStreak ? ` · ${stats.longestStreak}-day best` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Heatmap data={stats.heatmap} />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent study sets */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent study sets</h2>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView('library')}>
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {recentSets.map((s) => (
                  <StudySetCard key={s.id} studySet={s} onDeleted={load} onToggleFavorite={load} />
                ))}
              </div>
            </div>

            {/* Side: weekly activity + recent activity */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-primary" /> This week
                  </CardTitle>
                  <CardDescription>
                    {totalWeekly} {totalWeekly === 1 ? 'activity' : 'activities'} this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2 h-28">
                    {stats.weeklyActivity.map((d) => {
                      const max = Math.max(1, ...stats.weeklyActivity.map((x) => x.count));
                      const h = Math.round((d.count / max) * 100);
                      const active = d.count > 0;
                      return (
                        <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                          <div className="relative flex w-full items-end justify-center h-full">
                            <div
                              className={cn(
                                'w-full max-w-[28px] rounded-t-md transition-all',
                                active
                                  ? 'bg-gradient-to-t from-primary/40 to-primary'
                                  : 'bg-muted-foreground/15',
                              )}
                              style={{ height: `${active ? Math.max(8, h) : 6}%` }}
                              title={`${d.count} activities`}
                            />
                            {active && (
                              <span className="absolute -top-4 text-[9px] font-semibold text-primary">
                                {d.count}
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px]',
                            active ? 'text-foreground font-medium' : 'text-muted-foreground',
                          )}>
                            {new Date(d.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-primary" /> Recent activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
                  {stats.recentActivity.length === 0 && (
                    <p className="text-xs text-muted-foreground">No activity yet.</p>
                  )}
                  {stats.recentActivity.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 text-sm">
                      <ActivityDot type={a.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          <span className="font-medium capitalize">{a.type}</span>
                          <span className="text-muted-foreground"> · {a.detail}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(a.createdAt).toLocaleString()}
                          {a.studySet && <> · {a.studySet.title}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HeroSection({
  studyStreak,
  dueCards,
  onStudy,
  subjects,
}: {
  studyStreak: number;
  dueCards: number;
  onStudy: () => void;
  subjects: { id: string; name: string }[];
}) {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -left-12 -bottom-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />
      <CardContent className="relative flex flex-col items-start gap-4 p-6 md:p-8 text-white">
        {(() => {
          const profile = getUserProfile();
          const greeting = profile?.name ? `Hey ${profile.name}! 👋` : 'Your free AI study companion';
          return (
            <Badge className="gap-1 border-white/20 bg-white/15 text-white backdrop-blur" variant="secondary">
              <Sparkles className="h-3 w-3" /> {greeting}
            </Badge>
          );
        })()}
        <h2 className="text-2xl font-bold leading-snug md:text-4xl drop-shadow-sm">
          Turn anything into <span className="bg-gradient-to-r from-amber-200 via-emerald-200 to-cyan-200 bg-clip-text text-transparent">notes, flashcards, quizzes &amp; podcasts</span>
        </h2>
        <p className="max-w-2xl text-sm text-white/80 md:text-base">
          LearnX AI takes any topic, article, or pasted notes and instantly builds everything you need
          to master it — powered by AI, completely free.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <CreateStudySetDialog
            subjects={subjects}
            trigger={
              <Button size="lg" className="gap-2 bg-white text-violet-700 hover:bg-white/90 shadow-lg">
                <Plus className="h-4 w-4" /> Create study set
              </Button>
            }
          />
          {dueCards > 0 && (
            <Button size="lg" variant="secondary" className="gap-2 bg-white/15 text-white border-white/20 backdrop-blur hover:bg-white/25" onClick={onStudy}>
              <Flame className="h-4 w-4 text-amber-300" /> Study {dueCards} due cards
            </Button>
          )}
          {studyStreak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
              <Flame className="h-4 w-4 text-amber-300" /> {studyStreak}-day streak
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    violet: 'text-violet-500 bg-violet-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    cyan: 'text-cyan-500 bg-cyan-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:shadow-md disabled:opacity-100 disabled:hover:shadow-none"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </button>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  gradient,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  gradient: string;
  iconColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br ${gradient} p-4 text-left transition-all hover:shadow-lg hover:-translate-y-0.5`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ActivityDot({ type }: { type: string }) {
  const map: Record<string, string> = {
    notes: 'bg-violet-500',
    flashcard: 'bg-emerald-500',
    quiz: 'bg-amber-500',
    podcast: 'bg-rose-500',
    chat: 'bg-cyan-500',
    study: 'bg-primary',
  };
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${map[type] || 'bg-muted-foreground'}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

async function seedDemo(after: () => void) {
  toast.loading('Generating demo study set...', { id: 'seed' });
  try {
    await api.post('/api/seed', {});
    toast.success('Demo set ready!', { id: 'seed' });
    after();
  } catch (e) {
    toast.error('Demo failed', { id: 'seed', description: (e as Error).message });
  }
}
