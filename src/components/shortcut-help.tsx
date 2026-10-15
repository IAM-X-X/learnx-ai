'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['Alt', '1'], label: 'Dashboard' },
      { keys: ['Alt', '2'], label: 'AI Tutor' },
      { keys: ['Alt', '3'], label: 'Notes' },
      { keys: ['Alt', '4'], label: 'Summarize' },
      { keys: ['Alt', '5'], label: 'Flashcards' },
      { keys: ['Alt', '6'], label: 'Quiz' },
      { keys: ['Alt', '7'], label: 'Practice' },
      { keys: ['Alt', '8'], label: 'Schedule' },
      { keys: ['Alt', '9'], label: 'Podcast' },
      { keys: ['Alt', '0'], label: 'Progress' },
      { keys: ['Alt', 'L'], label: 'Library' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['?'], label: 'Show this help' },
      { keys: ['Esc'], label: 'Close dialogs' },
    ],
  },
];

export function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Navigate faster with these shortcuts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.title}
              </p>
              <div className="space-y-1.5">
                {g.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-center text-[11px] text-muted-foreground pt-2 border-t">
            Tip: the command palette (⌘K) also lets you jump anywhere by name.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
