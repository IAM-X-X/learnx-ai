'use client';

import * as React from 'react';
import { Menu, Sparkles, Heart, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemePicker } from '@/components/theme-picker';
import { CreateStudySetDialog } from '@/components/create-study-set-dialog';
import { CommandPalette } from '@/components/command-palette';
import { ShortcutHelp } from '@/components/shortcut-help';
import { SharedView } from '@/components/shared-view';
import { InstallPrompt } from '@/components/install-prompt';
import { AdBanner } from '@/components/ad-banner';
import { PremiumDialog } from '@/components/premium-dialog';
import { OnboardingWizard, isOnboardingComplete } from '@/components/onboarding-wizard';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { DashboardView } from '@/components/views/dashboard-view';
import { TutorView } from '@/components/views/tutor-view';
import { NotesView } from '@/components/views/notes-view';
import { SummaryView } from '@/components/views/summary-view';
import { FlashcardsView } from '@/components/views/flashcards-view';
import { QuizView } from '@/components/views/quiz-view';
import { PracticeView } from '@/components/views/practice-view';
import { ScheduleView } from '@/components/views/schedule-view';
import { PodcastView } from '@/components/views/podcast-view';
import { ProgressView } from '@/components/views/progress-view';
import { LibraryView } from '@/components/views/library-view';
import { SettingsView } from '@/components/views/settings-view';
import { useAppStore } from '@/lib/stores/app-store';
import { api } from '@/lib/api-client';
import { usePremium } from '@/lib/stores/use-premium';
import type { Subject } from '@/lib/types';

type ViewId = 'dashboard' | 'tutor' | 'notes' | 'summary' | 'flashcards' | 'quiz' | 'practice' | 'schedule' | 'podcast' | 'progress' | 'library';

export default function Home() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [shareToken, setShareToken] = React.useState<string | null>(null);
  // `null` = unknown (still checking localStorage); prevents the dashboard
  // from flashing before the onboarding wizard can mount.
  const [showOnboarding, setShowOnboarding] = React.useState<boolean | null>(null);
  const initPremium = usePremium((s) => s.init);

  // Initialize premium state from localStorage on mount
  React.useEffect(() => {
    initPremium();
  }, [initPremium]);

  // Check onboarding on mount (client-only to avoid hydration mismatch)
  React.useEffect(() => {
    setShowOnboarding(!isOnboardingComplete());
  }, []);

  // Check for ?s=<token> in the URL on mount (shared study-set view)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s');
    if (s) setShareToken(s);
  }, []);

  const loadSubjects = React.useCallback(async () => {
    try {
      const res = await api.get<{ subjects: Subject[] }>('/api/subjects');
      setSubjects(res.subjects);
    } catch (e) {
      console.error('failed to load subjects', e);
    }
  }, []);

  React.useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Keyboard shortcut: Cmd/Ctrl+K opens command palette
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      // Alt+1..0 for quick nav (1-9 + 0), and Alt+Q for the 11th view (library)
      if (e.altKey && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const views: ViewId[] = ['dashboard', 'tutor', 'notes', 'summary', 'flashcards', 'quiz', 'practice', 'schedule', 'podcast', 'progress'];
        const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        if (views[idx]) setView(views[idx]);
      }
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setView('library');
      }
      // "?" opens the keyboard shortcuts help (only when not typing in an input)
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);

  if (showOnboarding === null) {
    // Minimal shell while we check localStorage — avoids a flash of the
    // dashboard before the onboarding wizard can mount.
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <p className="text-sm">Loading LearnX AI…</p>
          </div>
        </div>
        <footer className="mt-auto border-t border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-3 text-xs text-muted-foreground md:px-6">
            <p className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">LearnX AI</span>
              <span>· Free to start · No sign-up required</span>
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Onboarding wizard (first launch) */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight md:text-lg">
                {viewTitle(view)}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {viewSubtitle(view)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                className="hidden gap-1.5 sm:inline-flex"
              >
                <Command className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Quick jump</span>
                <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">⌘K</kbd>
              </Button>
              <PremiumDialog />
              <CreateStudySetDialog subjects={subjects} onCreated={loadSubjects} />
              <ThemePicker />
              <ThemeToggle />
            </div>
          </header>

          {/* Ad banner (hidden for premium/admin users) */}
          {!shareToken && (
            <AdBanner variant="leaderboard" className="mx-4 mt-2 md:mx-6" />
          )}

          {/* Main content */}
          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            {shareToken ? (
              <SharedView token={shareToken} onExit={() => {
                setShareToken(null);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('s');
                  window.history.replaceState({}, '', url);
                }
              }} />
            ) : (
              <>
            {view === 'dashboard' && <DashboardView />}
            {view === 'tutor' && <TutorView />}
            {view === 'notes' && <NotesView subjects={subjects} onSubjectsChange={loadSubjects} />}
            {view === 'summary' && <SummaryView subjects={subjects} />}
            {view === 'flashcards' && <FlashcardsView />}
            {view === 'quiz' && <QuizView />}
            {view === 'practice' && <PracticeView />}
            {view === 'schedule' && <ScheduleView />}
            {view === 'podcast' && <PodcastView />}
            {view === 'progress' && <ProgressView />}
            {view === 'library' && <LibraryView subjects={subjects} onSubjectsChange={loadSubjects} />}
            {view === 'settings' && <SettingsView />}
              </>
            )}
            {/* Inline ad between content and footer (hidden for premium) */}
            {!shareToken && view !== 'tutor' && view !== 'flashcards' && view !== 'quiz' && view !== 'practice' && (
              <AdBanner variant="inline" className="mt-6" />
            )}
          </main>
        </div>
      </div>

      {/* Command palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Keyboard shortcuts help (? key) */}
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Install prompt (PWA add to home screen) */}
      <InstallPrompt />

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row md:px-6">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">LearnX AI</span>
            <span>· Free to start · No sign-up required</span>
          </p>
          <p className="flex items-center gap-3">
            <a href="/privacy-policy.html" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <span className="flex items-center gap-1.5">
              Built with
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              for learners everywhere
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

// keep ViewId type referenced for the default export contract
export type { ViewId };

function viewTitle(view: string) {
  switch (view) {
    case 'dashboard': return 'Dashboard';
    case 'tutor': return 'AI Tutor';
    case 'notes': return 'Study Notes';
    case 'summary': return 'Summarize';
    case 'flashcards': return 'Flashcards';
    case 'quiz': return 'Quizzes & Tests';
    case 'practice': return 'Practice';
    case 'schedule': return 'Schedule';
    case 'podcast': return 'AI Podcast';
    case 'progress': return 'Progress';
    case 'library': return 'My Library';
    case 'settings': return 'Settings';
    default: return 'LearnX AI';
  }
}

function viewSubtitle(view: string) {
  switch (view) {
    case 'dashboard': return 'Your learning at a glance';
    case 'tutor': return 'Ask anything — get a clear, patient explanation';
    case 'notes': return 'Turn any topic or text into structured notes';
    case 'summary': return 'Instant TL;DR & key takeaways';
    case 'flashcards': return 'Spaced-repetition practice for long-term memory';
    case 'quiz': return 'Test yourself and track your progress';
    case 'practice': return 'Adaptive mixed review of your weak spots';
    case 'schedule': return 'Your spaced-repetition review calendar';
    case 'podcast': return 'Listen to your study material on the go';
    case 'progress': return 'Analytics, goals & achievements';
    case 'library': return 'All your study sets in one place';
    case 'settings': return 'Manage your profile & preferences';
    default: return '';
  }
}

/** Returns true if the keyboard event target is a text-input element. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}
