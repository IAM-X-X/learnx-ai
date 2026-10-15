'use client';

import { create } from 'zustand';
import type { StudySet, ViewMode } from '@/lib/types';

interface AppState {
  view: ViewMode;
  selectedStudySetId: string | null;
  selectedQuizId: string | null;
  sessionId: string | null;
  // the fully-loaded study set object (when a detail view is open)
  activeStudySet: StudySet | null;
  sidebarOpen: boolean;
  setView: (v: ViewMode) => void;
  setSelectedStudySetId: (id: string | null) => void;
  setSelectedQuizId: (id: string | null) => void;
  setSessionId: (id: string | null) => void;
  setActiveStudySet: (s: StudySet | null) => void;
  setSidebarOpen: (open: boolean) => void;
  openStudySet: (id: string, view?: ViewMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  selectedStudySetId: null,
  selectedQuizId: null,
  sessionId: null,
  activeStudySet: null,
  sidebarOpen: false,
  setView: (v) => set({ view: v }),
  setSelectedStudySetId: (id) => set({ selectedStudySetId: id }),
  setSelectedQuizId: (id) => set({ selectedQuizId: id }),
  setSessionId: (id) => set({ sessionId: id }),
  setActiveStudySet: (s) => set({ activeStudySet: s }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openStudySet: (id, view = 'notes') =>
    set({ selectedStudySetId: id, view, sidebarOpen: false }),
}));
