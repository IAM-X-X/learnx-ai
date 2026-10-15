'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  NotebookPen,
  FileText,
  Layers,
  ListChecks,
  Headphones,
  TrendingUp,
  Library,
  Moon,
  Sun,
  Search,
  FileDown,
  Upload,
  Dumbbell,
  CalendarDays,
  MessageSquare,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAppStore } from '@/lib/stores/app-store';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { StudySet } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { setView, setSelectedStudySetId, setSessionId } = useAppStore();
  const { setTheme } = useTheme();
  const [studySets, setStudySets] = React.useState<StudySet[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<{
    studySets: { id: string; title: string; description: string; subject: { name: string; color: string } | null; _count: { flashcards: number } }[];
    flashcards: { id: string; front: string; back: string; studySetId: string; studySetTitle: string }[];
    sessions: { id: string; title: string; subject: string; updatedAt: string; messageCount: number }[];
    total: number;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load study sets when palette opens
  React.useEffect(() => {
    if (open) {
      api.get<{ studySets: StudySet[] }>('/api/study-sets')
        .then((r) => setStudySets(r.studySets))
        .catch(() => {});
      setSearchQuery('');
      setSearchResults(null);
    }
  }, [open]);

  // Debounced global search
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{
          results: {
            studySets: { id: string; title: string; description: string; subject: { name: string; color: string } | null; _count: { flashcards: number } }[];
            flashcards: { id: string; front: string; back: string; studySetId: string; studySetTitle: string }[];
            sessions: { id: string; title: string; subject: string; updatedAt: string; messageCount: number }[];
            total: number;
          }
        }>(`/api/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.results);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function go(v: 'dashboard' | 'tutor' | 'notes' | 'summary' | 'flashcards' | 'quiz' | 'practice' | 'schedule' | 'podcast' | 'progress' | 'library') {
    setView(v);
    setSelectedStudySetId(null);
    onOpenChange(false);
  }

  function openSet(id: string, view: 'notes' | 'flashcards' | 'quiz' | 'podcast' | 'summary') {
    setSelectedStudySetId(id);
    setView(view);
    onOpenChange(false);
  }

  async function handleExport() {
    onOpenChange(false);
    toast.info('Tip: open a study set and use the Export option from the Library or notes view.');
  }

  function handleImportClick() {
    onOpenChange(false);
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.post('/api/import', { data });
      toast.success(`Imported "${data.title || 'study set'}"`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error('Import failed', { description: (err as Error).message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput
          placeholder="Type a command or search study sets, cards, chats..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>{searchQuery.length >= 2 ? 'No matches found.' : 'No results found.'}</CommandEmpty>

          {/* Global search results (when query >= 2 chars) */}
          {searchResults && searchResults.total > 0 && (
            <>
              {searchResults.studySets.length > 0 && (
                <CommandGroup heading="Study sets">
                  {searchResults.studySets.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`set ${s.title}`}
                      onSelect={() => openSet(s.id, 'notes')}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      <span className="truncate">{s.title}</span>
                      {s.subject && (
                        <span className="ml-auto text-[10px] text-muted-foreground">{s.subject.name}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults.flashcards.length > 0 && (
                <CommandGroup heading="Flashcards">
                  {searchResults.flashcards.map((f) => (
                    <CommandItem
                      key={f.id}
                      value={`card ${f.front}`}
                      onSelect={() => { setSelectedStudySetId(f.studySetId); setView('flashcards'); onOpenChange(false); }}
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      <span className="truncate">{f.front}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{f.studySetTitle}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults.sessions.length > 0 && (
                <CommandGroup heading="Chat sessions">
                  {searchResults.sessions.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`chat ${s.title}`}
                      onSelect={() => { setSessionId(s.id); setView('tutor'); onOpenChange(false); }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span className="truncate">{s.title}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{s.messageCount} msgs</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}

          {/* Default navigation (only when not searching) */}
          {(!searchResults || searchResults.total === 0) && (
            <>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go('dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+1</span>
            </CommandItem>
            <CommandItem onSelect={() => go('tutor')}>
              <Sparkles className="mr-2 h-4 w-4" /> AI Tutor
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+2</span>
            </CommandItem>
            <CommandItem onSelect={() => go('notes')}>
              <NotebookPen className="mr-2 h-4 w-4" /> Notes
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+3</span>
            </CommandItem>
            <CommandItem onSelect={() => go('summary')}>
              <FileText className="mr-2 h-4 w-4" /> Summarize
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+4</span>
            </CommandItem>
            <CommandItem onSelect={() => go('flashcards')}>
              <Layers className="mr-2 h-4 w-4" /> Flashcards
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+5</span>
            </CommandItem>
            <CommandItem onSelect={() => go('quiz')}>
              <ListChecks className="mr-2 h-4 w-4" /> Quiz
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+6</span>
            </CommandItem>
            <CommandItem onSelect={() => go('practice')}>
              <Dumbbell className="mr-2 h-4 w-4" /> Practice
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+7</span>
            </CommandItem>
            <CommandItem onSelect={() => go('schedule')}>
              <CalendarDays className="mr-2 h-4 w-4" /> Schedule
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+8</span>
            </CommandItem>
            <CommandItem onSelect={() => go('podcast')}>
              <Headphones className="mr-2 h-4 w-4" /> Podcast
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+9</span>
            </CommandItem>
            <CommandItem onSelect={() => go('progress')}>
              <TrendingUp className="mr-2 h-4 w-4" /> Progress
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+0</span>
            </CommandItem>
            <CommandItem onSelect={() => go('library')}>
              <Library className="mr-2 h-4 w-4" /> Library
              <span className="ml-auto text-[10px] text-muted-foreground">Alt+L</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {studySets.length > 0 && (
            <>
              <CommandGroup heading="Open study set">
                {studySets.slice(0, 8).map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`${s.title} open`}
                    onSelect={() => openSet(s.id, 'notes')}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span className="truncate">{s.title}</span>
                    {s.subject && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {s.subject.name}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" /> Import study set (JSON)
            </CommandItem>
            <CommandItem onSelect={handleExport}>
              <FileDown className="mr-2 h-4 w-4" /> Export a study set
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => { setTheme('light'); onOpenChange(false); }}>
              <Sun className="mr-2 h-4 w-4" /> Light mode
            </CommandItem>
            <CommandItem onSelect={() => { setTheme('dark'); onOpenChange(false); }}>
              <Moon className="mr-2 h-4 w-4" /> Dark mode
            </CommandItem>
          </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
