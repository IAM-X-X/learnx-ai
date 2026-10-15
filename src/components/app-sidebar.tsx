'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  NotebookPen,
  Layers,
  ListChecks,
  Headphones,
  Library,
  Brain,
  X,
  TrendingUp,
  FileText,
  Zap,
  Dumbbell,
  CalendarDays,
  Keyboard,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/stores/app-store';
import type { ViewMode } from '@/lib/types';
import { PremiumDialog } from '@/components/premium-dialog';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: 'new';
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Your study overview' },
  { id: 'tutor', label: 'AI Tutor', icon: Sparkles, description: 'Chat with your AI tutor' },
  { id: 'notes', label: 'Notes', icon: NotebookPen, description: 'Generate study notes' },
  { id: 'summary', label: 'Summarize', icon: FileText, description: 'Quick TL;DR & key points', badge: 'new' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, description: 'Spaced repetition' },
  { id: 'quiz', label: 'Quiz', icon: ListChecks, description: 'Test your knowledge' },
  { id: 'practice', label: 'Practice', icon: Dumbbell, description: 'Adaptive mixed review', badge: 'new' },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays, description: 'Review calendar', badge: 'new' },
  { id: 'podcast', label: 'Podcast', icon: Headphones, description: 'Listen on the go' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, description: 'Analytics & goals', badge: 'new' },
  { id: 'library', label: 'Library', icon: Library, description: 'All your study sets' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, description: 'Profile & preferences' },
];

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 h-screen w-72 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-primary/20">
              <Brain className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight">
                LearnX <span className="gradient-text">AI</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Learn anything, faster</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-7 -translate-y-1/2 w-1 rounded-r-full bg-primary"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'bg-sidebar-accent/60 text-sidebar-foreground/80 group-hover:text-primary group-hover:bg-sidebar-accent',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex flex-1 flex-col min-w-0">
                  <span className="leading-tight flex items-center gap-1.5">
                    {item.label}
                    {item.badge === 'new' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        <Zap className="h-2.5 w-2.5" /> New
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">{item.description}</span>
                </span>
                {active && (
                  <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
          <PremiumDialog />
          <div className="rounded-xl bg-gradient-to-br from-primary/10 via-accent/15 to-primary/5 p-3 ring-1 ring-inset ring-primary/10">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold">Free to start</p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              No sign-up required. Go Premium for ad-free studying.
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Keyboard className="h-3 w-3" /> Shortcuts
            <kbd className="rounded border border-border bg-muted px-1 text-[9px]">?</kbd>
          </button>
        </div>
      </aside>
    </>
  );
}
