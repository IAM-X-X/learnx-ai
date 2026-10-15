'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Flame, Zap, Award, Trophy, Target, Activity, CheckCircle2 } from 'lucide-react';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  // returns true if unlocked, given current stats
  check: (stats: {
    studySets: number;
    flashcards: number;
    quizzes: number;
    dueFlashcards: number;
    quizAttempts: number;
    averageScore: number;
    streakDays: number;
    xp30: number;
    activity30: number;
  }) => boolean;
}

const STORAGE_KEY = 'learnx:unlocked-achievements';

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-set', name: 'First Steps', desc: 'Created your first study set', icon: CheckCircle2, color: 'text-violet-500', check: (s) => s.studySets >= 1 },
  { id: 'first-quiz', name: 'Quiz Rookie', desc: 'Took your first quiz', icon: Award, color: 'text-emerald-500', check: (s) => s.quizAttempts >= 1 },
  { id: 'streak-3', name: 'On Fire', desc: '3-day study streak', icon: Flame, color: 'text-amber-500', check: (s) => s.streakDays >= 3 },
  { id: 'streak-7', name: 'Week Warrior', desc: '7-day study streak', icon: Flame, color: 'text-rose-500', check: (s) => s.streakDays >= 7 },
  { id: 'xp-100', name: 'Centurion', desc: 'Earned 100 XP this month', icon: Zap, color: 'text-violet-500', check: (s) => s.xp30 >= 100 },
  { id: 'xp-500', name: 'XP Master', desc: 'Earned 500 XP this month', icon: Zap, color: 'text-primary', check: (s) => s.xp30 >= 500 },
  { id: 'score-80', name: 'High Achiever', desc: '80%+ average quiz score', icon: Trophy, color: 'text-amber-500', check: (s) => s.averageScore >= 80 },
  { id: 'cards-50', name: 'Card Collector', desc: '50+ flashcards total', icon: CheckCircle2, color: 'text-emerald-500', check: (s) => s.flashcards >= 50 },
  { id: 'active-week', name: 'Active Week', desc: '20+ activities this month', icon: Activity, color: 'text-cyan-500', check: (s) => s.activity30 >= 20 },
  { id: 'sets-5', name: 'Library Builder', desc: 'Created 5 study sets', icon: Target, color: 'text-violet-500', check: (s) => s.studySets >= 5 },
];

function getUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveUnlocked(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

/**
 * Checks for newly-unlocked achievements and fires celebratory toasts.
 * Returns the full list with `unlocked` flags for rendering.
 */
export function useAchievements(stats: {
  studySets: number;
  flashcards: number;
  quizzes: number;
  dueFlashcards: number;
  quizAttempts: number;
  averageScore: number;
  streakDays: number;
  xp30: number;
  activity30: number;
} | null) {
  const [unlocked, setUnlocked] = React.useState<Set<string>>(new Set());

  // Load from localStorage on mount
  React.useEffect(() => {
    setUnlocked(getUnlocked());
  }, []);

  // Check for new unlocks when stats change
  React.useEffect(() => {
    if (!stats) return;
    const prev = getUnlocked();
    const newlyUnlocked: AchievementDef[] = [];
    for (const a of ACHIEVEMENTS) {
      if (!prev.has(a.id) && a.check(stats)) {
        newlyUnlocked.push(a);
        prev.add(a.id);
      }
    }
    if (newlyUnlocked.length > 0) {
      saveUnlocked(prev);
      setUnlocked(new Set(prev));
      // Fire celebratory toasts
      for (const a of newlyUnlocked) {
        const Icon = a.icon;
        toast.success(`Achievement unlocked: ${a.name}!`, {
          description: a.desc,
          duration: 5000,
          icon: <Icon className={`h-4 w-4 ${a.color}`} />,
        });
      }
    }
  }, [stats]);

  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}
