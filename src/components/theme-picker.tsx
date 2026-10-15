'use client';

import * as React from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'learnx:accent-color';

// Each accent is defined by CSS variable overrides applied to :root.
interface AccentDef {
  id: string;
  name: string;
  // light mode primary + ring
  primary: string;
  ring: string;
  sidebarPrimary: string;
  sidebarRing: string;
  // dark mode primary
  primaryDark: string;
  ringDark: string;
  sidebarPrimaryDark: string;
  sidebarRingDark: string;
  swatch: string; // for the picker preview
}

const ACCENTS: AccentDef[] = [
  {
    id: 'violet',
    name: 'Violet',
    primary: 'oklch(0.5 0.22 285)',
    ring: 'oklch(0.5 0.22 285)',
    sidebarPrimary: 'oklch(0.5 0.22 285)',
    sidebarRing: 'oklch(0.5 0.22 285)',
    primaryDark: 'oklch(0.66 0.22 285)',
    ringDark: 'oklch(0.66 0.22 285)',
    sidebarPrimaryDark: 'oklch(0.66 0.22 285)',
    sidebarRingDark: 'oklch(0.66 0.22 285)',
    swatch: '#8b5cf6',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    primary: 'oklch(0.5 0.15 160)',
    ring: 'oklch(0.5 0.15 160)',
    sidebarPrimary: 'oklch(0.5 0.15 160)',
    sidebarRing: 'oklch(0.5 0.15 160)',
    primaryDark: 'oklch(0.68 0.17 160)',
    ringDark: 'oklch(0.68 0.17 160)',
    sidebarPrimaryDark: 'oklch(0.68 0.17 160)',
    sidebarRingDark: 'oklch(0.68 0.17 160)',
    swatch: '#10b981',
  },
  {
    id: 'rose',
    name: 'Rose',
    primary: 'oklch(0.55 0.22 10)',
    ring: 'oklch(0.55 0.22 10)',
    sidebarPrimary: 'oklch(0.55 0.22 10)',
    sidebarRing: 'oklch(0.55 0.22 10)',
    primaryDark: 'oklch(0.7 0.22 10)',
    ringDark: 'oklch(0.7 0.22 10)',
    sidebarPrimaryDark: 'oklch(0.7 0.22 10)',
    sidebarRingDark: 'oklch(0.7 0.22 10)',
    swatch: '#f43f5e',
  },
  {
    id: 'amber',
    name: 'Amber',
    primary: 'oklch(0.6 0.16 60)',
    ring: 'oklch(0.6 0.16 60)',
    sidebarPrimary: 'oklch(0.6 0.16 60)',
    sidebarRing: 'oklch(0.6 0.16 60)',
    primaryDark: 'oklch(0.75 0.17 65)',
    ringDark: 'oklch(0.75 0.17 65)',
    sidebarPrimaryDark: 'oklch(0.75 0.17 65)',
    sidebarRingDark: 'oklch(0.75 0.17 65)',
    swatch: '#f59e0b',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    primary: 'oklch(0.55 0.14 200)',
    ring: 'oklch(0.55 0.14 200)',
    sidebarPrimary: 'oklch(0.55 0.14 200)',
    sidebarRing: 'oklch(0.55 0.14 200)',
    primaryDark: 'oklch(0.7 0.15 200)',
    ringDark: 'oklch(0.7 0.15 200)',
    sidebarPrimaryDark: 'oklch(0.7 0.15 200)',
    sidebarRingDark: 'oklch(0.7 0.15 200)',
    swatch: '#06b6d4',
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    primary: 'oklch(0.55 0.24 320)',
    ring: 'oklch(0.55 0.24 320)',
    sidebarPrimary: 'oklch(0.55 0.24 320)',
    sidebarRing: 'oklch(0.55 0.24 320)',
    primaryDark: 'oklch(0.7 0.24 320)',
    ringDark: 'oklch(0.7 0.24 320)',
    sidebarPrimaryDark: 'oklch(0.7 0.24 320)',
    sidebarRingDark: 'oklch(0.7 0.24 320)',
    swatch: '#d946ef',
  },
];

function applyAccent(accent: AccentDef) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const vars: Record<string, string> = {
    '--primary': isDark ? accent.primaryDark : accent.primary,
    '--ring': isDark ? accent.ringDark : accent.ring,
    '--sidebar-primary': isDark ? accent.sidebarPrimaryDark : accent.sidebarPrimary,
    '--sidebar-ring': isDark ? accent.sidebarRingDark : accent.sidebarRing,
    '--chart-1': isDark ? accent.primaryDark : accent.primary,
  };
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export function ThemePicker() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string>('violet');

  // Load saved accent on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const accent = ACCENTS.find((a) => a.id === saved);
        if (accent) {
          setSelected(saved);
          applyAccent(accent);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Re-apply when dark mode toggles
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const accent = ACCENTS.find((a) => a.id === selected);
      if (accent) applyAccent(accent);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [selected]);

  function pick(accent: AccentDef) {
    setSelected(accent.id);
    applyAccent(accent);
    try { localStorage.setItem(STORAGE_KEY, accent.id); } catch { /* ignore */ }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" title="Theme color">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Pick accent color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Accent color</p>
        <div className="grid grid-cols-3 gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => pick(a)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:bg-muted',
                selected === a.id ? 'border-primary ring-1 ring-primary/30' : 'border-border',
              )}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: a.swatch }}
              >
                {selected === a.id && <Check className="h-4 w-4 text-white" />}
              </span>
              <span className="text-[10px] font-medium">{a.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Saved on this device
        </p>
      </PopoverContent>
    </Popover>
  );
}
