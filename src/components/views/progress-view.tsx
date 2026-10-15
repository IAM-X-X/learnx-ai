'use client';

import * as React from 'react';
import {
  TrendingUp,
  Flame,
  Target,
  Award,
  Loader2,
  BarChart3,
  PieChart as PieIcon,
  Trophy,
  Activity,
  Zap,
  ListChecks,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { api } from '@/lib/api-client';
import { useStudyGoal } from '@/lib/stores/use-study-goal';
import { useAchievements } from '@/lib/stores/use-achievements';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/time';
import type { SubjectMastery, DailyProgress, ScoreTrendPoint } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_COLORS: Record<string, string> = {
  notes: '#8b5cf6',
  flashcard: '#10b981',
  quiz: '#f59e0b',
  podcast: '#f43f5e',
  chat: '#06b6d4',
  study: '#6366f1',
};
const SUBJECT_COLORS: Record<string, string> = {
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  orange: '#f97316',
};

interface ProgressData {
  dailyProgress: DailyProgress[];
  scoreTrend: { date: string; score: number; total: number; title: string }[];
  subjectMastery: SubjectMastery[];
  activityByType: { type: string; count: number }[];
  totals: {
    totalXp30: number;
    totalActivity30: number;
    bestDay: { date: string; xp: number; count: number };
    avgQuizScore: number;
    totalAttempts: number;
  };
}

export function ProgressView() {
  const [data, setData] = React.useState<ProgressData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [goalData, setGoalData] = React.useState<{ todayXp: number; streakDays: number; todayActivityCount: number } | null>(null);
  const [statsData, setStatsData] = React.useState<{
    totalStudySets: number; totalFlashcards: number; quizzesTaken: number; averageScore: number; studyStreakDays: number;
  } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, gRes, sRes] = await Promise.all([
        api.get<{ progress: ProgressData }>('/api/progress'),
        api.get<{ goal: { todayXp: number; streakDays: number; todayActivityCount: number } }>('/api/goal'),
        api.get<{ stats: { totalStudySets: number; totalFlashcards: number; quizzesTaken: number; averageScore: number; studyStreakDays: number } }>('/api/stats'),
      ]);
      setData(pRes.progress);
      setGoalData(gRes.goal);
      setStatsData(sRes.stats);
    } catch (e) {
      toast.error('Failed to load progress', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const goal = useStudyGoal(goalData?.todayXp ?? 0, goalData?.streakDays ?? 0);

  // Feed stats into the achievements hook → fires celebratory toasts on unlock
  const achievementStats = data && statsData ? {
    studySets: statsData.totalStudySets,
    flashcards: statsData.totalFlashcards,
    quizzes: 0,
    dueFlashcards: 0,
    quizAttempts: statsData.quizzesTaken,
    averageScore: statsData.averageScore,
    streakDays: statsData.studyStreakDays,
    xp30: data.totals.totalXp30,
    activity30: data.totals.totalActivity30,
  } : null;
  const achievements = useAchievements(achievementStats);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!data || (data.totals.totalActivity30 === 0 && data.subjectMastery.length === 0)) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={TrendingUp}
          title="No progress data yet"
          description="Start studying — generate notes, review flashcards, or take a quiz — and your analytics will appear here."
        />
      </div>
    );
  }

  const goalProgress = Math.min(100, Math.round((goal.todayXp / goal.dailyTargetXp) * 100));
  const goalMet = goal.todayXp >= goal.dailyTargetXp;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Daily goal hero */}
      <Card className={cn(
        'overflow-hidden border-0 transition-colors',
        goalMet
          ? 'bg-gradient-to-br from-emerald-500/15 via-background to-primary/10'
          : 'bg-gradient-to-br from-primary/10 via-background to-accent/20',
      )}>
        <CardContent className="flex flex-col items-start gap-4 p-6 md:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl',
              goalMet ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary/15 text-primary',
            )}>
              {goalMet ? <Trophy className="h-7 w-7" /> : <Target className="h-7 w-7" />}
            </div>
            <div>
              <h2 className="text-xl font-bold md:text-2xl">
                {goalMet ? 'Daily goal smashed! 🎉' : 'Daily study goal'}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <strong className="text-foreground">{goal.todayXp} XP</strong> today · target{' '}
                <strong className="text-foreground">{goal.dailyTargetXp} XP</strong> ·{' '}
                {goalProgress}% complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-300">
              <Flame className="h-4 w-4" /> {goal.streakDays}-day streak
            </div>
            <GoalEditor current={goal.dailyTargetXp} onChange={goal.setTargetXp} />
          </div>
        </CardContent>
        <div className="px-6 pb-4 md:px-8">
          <Progress value={goalProgress} className={cn('h-2', goalMet && 'bg-emerald-500/20')} />
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Zap} label="XP (30 days)" value={data.totals.totalXp30.toLocaleString()} color="violet" />
        <KpiCard icon={Activity} label="Activities" value={data.totals.totalActivity30.toLocaleString()} color="cyan" />
        <KpiCard icon={Award} label="Avg quiz score" value={`${data.totals.avgQuizScore}%`} color="emerald" />
        <KpiCard icon={Trophy} label="Best day XP" value={data.totals.bestDay.xp.toString()} color="amber" sub={formatRelativeTime(data.totals.bestDay.date)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* XP over 30 days — area chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> XP — last 30 days
            </CardTitle>
            <CardDescription>Your daily study momentum</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyProgress} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickFormatter={(v) => v.slice(5)}
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
                    formatter={(v: number) => [`${v} XP`, 'XP']}
                  />
                  <Bar dataKey="xp" fill="#8b5cf6" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity by type — donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-primary" /> Activity mix
            </CardTitle>
            <CardDescription>What you've been doing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.activityByType.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No activity
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.activityByType.map((entry) => ({
                        ...entry,
                        fill: TYPE_COLORS[entry.type] || '#6366f1',
                      }))}
                      dataKey="count"
                      nameKey="type"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(v) => <span className="capitalize">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quiz score trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Quiz score trend
            </CardTitle>
            <CardDescription>Your last {data.scoreTrend.length} quiz attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {data.scoreTrend.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ListChecks className="h-8 w-8 opacity-30" />
                  Take a quiz to see your score trend
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.scoreTrend} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        fontSize: 12,
                      }}
                      formatter={(v: number, _n, p) => [`${v}%`, p.payload.title]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#10b981' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subject mastery bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" /> Subject mastery
            </CardTitle>
            <CardDescription>Where you're strongest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {data.subjectMastery.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects yet.</p>
            ) : (
              data.subjectMastery.map((s) => (
                <div key={s.subjectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: SUBJECT_COLORS[s.color] || '#8b5cf6' }}
                      />
                      <span className="font-medium">{s.subjectName}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{s.mastery}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.mastery}%`,
                        backgroundColor: SUBJECT_COLORS[s.color] || '#8b5cf6',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {s.studySets} sets · {s.flashcards} cards · {s.quizzesTaken} quizzes · avg {s.averageScore}%
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" /> Achievements
          </CardTitle>
          <CardDescription>
            {achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <Achievement
                  key={a.id}
                  icon={Icon}
                  name={a.name}
                  desc={a.desc}
                  unlocked={a.unlocked}
                  colorClass={a.color}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  sub?: string;
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
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Achievement({
  icon: Icon,
  name,
  desc,
  unlocked,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  desc: string;
  unlocked: boolean;
  colorClass: string;
}) {
  return (
    <div
      className={cn(
        'group flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
        unlocked
          ? 'border-primary/30 bg-primary/5 hover:shadow-md'
          : 'border-border bg-muted/30 opacity-60 grayscale',
      )}
      title={desc}
    >
      <div className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110',
        unlocked ? `${colorClass} bg-current/10` : 'text-muted-foreground bg-muted',
      )}>
        <Icon className={cn('h-5 w-5', !unlocked && 'opacity-40')} />
      </div>
      <p className="text-xs font-semibold">{name}</p>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </div>
  );
}

function GoalEditor({
  current,
  onChange,
}: {
  current: number;
  onChange: (n: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const presets = [50, 100, 200, 300];
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1">
        <Target className="h-4 w-4" /> Set goal
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-border bg-popover p-2 shadow-xl">
            <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Daily XP target</p>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => { onChange(p); setOpen(false); }}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-xs font-medium transition-all',
                    current === p
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {p} XP
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
