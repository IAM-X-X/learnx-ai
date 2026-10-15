'use client';

import * as React from 'react';
import {
  CalendarDays,
  Loader2,
  Layers,
  Flame,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
  BookOpen,
  ListChecks,
  Coffee,
  Lightbulb,
  CalendarPlus,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { downloadStudyPlanIcs } from '@/lib/ics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface ScheduleDay {
  date: string;
  count: number;
  overdue: number;
  studySets: { id: string; title: string; count: number }[];
}
interface ScheduleData {
  schedule: ScheduleDay[];
  forecast: { date: string; count: number }[];
  totals: { totalDue: number; totalUpcoming: number; horizonDays: number };
}

interface StudyPlan {
  goal: string;
  totalDays: number;
  dailyMinutes: number;
  tasks: { day: number; title: string; duration: string; focus: string; type: string }[];
  tips: string[];
}

const TYPE_META: Record<string, { icon: typeof BookOpen; color: string; label: string }> = {
  review: { icon: Layers, color: 'text-emerald-500 bg-emerald-500/10', label: 'Review' },
  learn: { icon: BookOpen, color: 'text-violet-500 bg-violet-500/10', label: 'Learn' },
  quiz: { icon: ListChecks, color: 'text-amber-500 bg-amber-500/10', label: 'Quiz' },
  rest: { icon: Coffee, color: 'text-cyan-500 bg-cyan-500/10', label: 'Rest' },
};

export function ScheduleView() {
  const [data, setData] = React.useState<ScheduleData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [plan, setPlan] = React.useState<StudyPlan | null>(null);
  const [planGoal, setPlanGoal] = React.useState('');
  const [planDays, setPlanDays] = React.useState(7);
  const [planMinutes, setPlanMinutes] = React.useState(30);
  const [planLoading, setPlanLoading] = React.useState(false);
  const setView = useAppStore((s) => s.setView);
  const setSelectedStudySetId = useAppStore((s) => s.setSelectedStudySetId);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ScheduleData>('/api/schedule?days=14');
      setData(res);
    } catch (e) {
      toast.error('Failed to load schedule', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleGeneratePlan() {
    if (!planGoal.trim()) {
      toast.error('Please describe your study goal');
      return;
    }
    setPlanLoading(true);
    try {
      const res = await api.post<{ plan: StudyPlan }>('/api/study-plan', {
        goal: planGoal.trim(),
        dailyMinutes: planMinutes,
        daysAhead: planDays,
      });
      setPlan(res.plan);
      toast.success('Study plan generated!');
    } catch (e) {
      toast.error('Plan generation failed', { description: (e as Error).message });
    } finally {
      setPlanLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const today = data.schedule[0];
  const hasAny = data.totals.totalDue > 0 || data.totals.totalUpcoming > 0;

  if (!hasAny) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={CalendarDays}
          title="No reviews scheduled"
          description="Your spaced-repetition calendar is empty. Create a study set and review some flashcards — future reviews will show up here automatically."
          action={
            <Button onClick={() => setView('library')} className="gap-1">
              Browse library <ChevronRight className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <CardContent className="flex flex-col items-start gap-4 p-6 md:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold md:text-2xl">Study schedule</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your spaced-repetition calendar — what's coming up next
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data.totals.totalDue > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-300">
                <Flame className="h-4 w-4" /> {data.totals.totalDue} due now
              </div>
            )}
            {data.totals.totalUpcoming > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">
                <Clock className="h-4 w-4" /> {data.totals.totalUpcoming} upcoming
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today card */}
      {today && today.count > 0 && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flame className="h-5 w-5 text-rose-500" /> Today
                </CardTitle>
                <CardDescription className="mt-1">
                  {today.count} card{today.count !== 1 ? 's' : ''} due for review
                  {today.overdue > 0 && <> · {today.overdue} overdue</>}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setSelectedStudySetId('__all__');
                  setView('flashcards');
                }}
                className="gap-1"
              >
                <Layers className="h-4 w-4" /> Study now
              </Button>
            </div>
          </CardHeader>
          {today.studySets.length > 0 && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
              {today.studySets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudySetId(s.id);
                    setView('flashcards');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {s.title} · {s.count}
                </button>
              ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 14-day grid */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Next 14 days</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
          {data.schedule.map((day, i) => {
            const date = new Date(day.date);
            const isToday = i === 0;
            const isPast = false; // all are today+
            const isFuture = i > 0;
            const intensity = Math.min(4, day.count);
            return (
              <Card
                key={day.date}
                className={cn(
                  'relative overflow-hidden transition-all hover:shadow-md',
                  isToday && 'ring-2 ring-primary/40',
                  day.count === 0 && 'opacity-60',
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {date.toLocaleDateString('en', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-bold leading-tight">{date.getDate()}</p>
                    </div>
                    {isToday && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">Now</Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    {day.count > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          'text-sm font-bold',
                          day.overdue > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-primary',
                        )}>
                          {day.count}
                        </span>
                        <span className="text-[10px] text-muted-foreground">cards</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" /> Free
                      </div>
                    )}
                  </div>
                  {/* intensity bar */}
                  <div className="mt-2 h-1 w-full rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        day.overdue > 0 ? 'bg-rose-500' : 'bg-primary',
                      )}
                      style={{ width: `${(intensity / 4) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 30-day forecast chart */}
      {data.forecast && data.forecast.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> 30-day review forecast
          </h3>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>How many flashcards are due each day — plan ahead</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.forecast} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v) => v.slice(8)}
                      interval={4}
                    />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${v} cards due`, 'Due']}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {data.forecast.map((entry, i) => {
                        const isToday = i === 0;
                        const isOverdue = isToday && entry.count > 0;
                        return (
                          <Cell
                            key={i}
                            fill={
                              isOverdue ? 'var(--destructive)' :
                              entry.count > 0 ? 'var(--primary)' :
                              'var(--muted-foreground)'
                            }
                            fillOpacity={entry.count > 0 ? 1 : 0.15}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming by study set */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Upcoming reviews by study set</h3>
        {(() => {
          const setMap: Record<string, { id: string; title: string; total: number; nextDue: string }> = {};
          for (const day of data.schedule) {
            for (const s of day.studySets) {
              if (!setMap[s.id]) setMap[s.id] = { id: s.id, title: s.title, total: 0, nextDue: day.date };
              setMap[s.id].total += s.count;
            }
          }
          const sets = Object.values(setMap).sort((a, b) => b.total - a.total);
          if (sets.length === 0) {
            return (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground text-center">
                  No upcoming reviews scheduled.
                </CardContent>
              </Card>
            );
          }
          return (
            <div className="space-y-2">
              {sets.map((s) => (
                <Card key={s.id} className="transition-all hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.total} card{s.total !== 1 ? 's' : ''} due in next 14 days
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStudySetId(s.id);
                        setView('flashcards');
                      }}
                      className="gap-1 shrink-0"
                    >
                      Review <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>

      {/* AI Study Plan Generator */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> AI study plan
        </h3>
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-4">
            {!plan && (
              <>
                <div>
                  <p className="text-sm font-medium">Generate a personalized study plan</p>
                  <p className="text-xs text-muted-foreground">
                    Describe your goal and LearnX AI will build a day-by-day plan using your current study sets.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-goal" className="text-xs">Your study goal</Label>
                    <Input
                      id="plan-goal"
                      placeholder="e.g. Ace my biology midterm next week"
                      value={planGoal}
                      onChange={(e) => setPlanGoal(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Days</Label>
                      <div className="flex items-center gap-2">
                        {[3, 7, 14, 21].map((d) => (
                          <button
                            key={d}
                            onClick={() => setPlanDays(d)}
                            className={cn(
                              'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all',
                              planDays === d
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:bg-muted',
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Daily minutes</Label>
                      <div className="flex items-center gap-2">
                        {[15, 30, 60, 90].map((m) => (
                          <button
                            key={m}
                            onClick={() => setPlanMinutes(m)}
                            className={cn(
                              'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all',
                              planMinutes === m
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:bg-muted',
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleGeneratePlan} disabled={planLoading || !planGoal.trim()} className="w-full gap-2">
                  {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {planLoading ? 'AI is planning your schedule...' : 'Generate my study plan'}
                </Button>
              </>
            )}
            {plan && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-primary" /> {plan.goal}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.totalDays}-day plan · {plan.dailyMinutes} min/day
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadStudyPlanIcs(plan)} className="gap-1">
                      <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPlan(null)} className="gap-1">
                      New plan
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                  {plan.tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No tasks generated. Try a different goal.</p>
                  )}
                  {plan.tasks.map((t) => {
                    const meta = TYPE_META[t.type] || TYPE_META.learn;
                    const Icon = meta.icon;
                    return (
                      <div key={t.day} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
                        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight truncate">
                            Day {t.day}: {t.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{t.focus}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{t.duration}</Badge>
                      </div>
                    );
                  })}
                </div>
                {plan.tips.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 p-3 space-y-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <Lightbulb className="h-3.5 w-3.5" /> Study tips
                    </p>
                    <ul className="space-y-1">
                      {plan.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-amber-800/80 dark:text-amber-200/80 flex items-start gap-1.5">
                          <span className="text-amber-500">•</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
