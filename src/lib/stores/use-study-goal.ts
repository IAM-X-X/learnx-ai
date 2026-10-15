'use client';

import * as React from 'react';
import type { StudyGoal } from '@/lib/types';

const STORAGE_KEY = 'learnx:study-goal';
const DEFAULT_TARGET = 100; // XP/day

interface GoalState extends StudyGoal {
  setTargetXp: (n: number) => void;
}

export function useStudyGoal(todayXp: number, streakDays: number) {
  const [targetXp, setTargetXpState] = React.useState<number>(DEFAULT_TARGET);

  // Load target from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.target === 'number') setTargetXpState(parsed.target);
      }
    } catch {
      // ignore
    }
  }, []);

  const setTargetXp = React.useCallback((n: number) => {
    const clamped = Math.min(Math.max(n, 20), 500);
    setTargetXpState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ target: clamped }));
    } catch {
      // ignore
    }
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const state: GoalState = {
    dailyTargetXp: targetXp,
    todayXp: todayXp,
    streakDays,
    lastGoalDate: today,
    setTargetXp,
  };
  return state;
}
