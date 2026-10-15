'use client';

import * as React from 'react';
import { LayoutDashboard, Sparkles, Layers, ListChecks, Library } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/lib/types';

const BOTTOM_NAV: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'flashcards', label: 'Cards', icon: Layers },
  { id: 'quiz', label: 'Quiz', icon: ListChecks },
  { id: 'tutor', label: 'Tutor', icon: Sparkles },
  { id: 'library', label: 'Library', icon: Library },
];

export function MobileBottomNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-lg md:hidden h-14 pb-[env(safe-area-inset-bottom)]">
      {BOTTOM_NAV.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'scale-110')} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
