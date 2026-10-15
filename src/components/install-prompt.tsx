'use client';

import * as React from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'learnx:install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [show, setShow] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    // Check if already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch { /* ignore */ }

    // iOS doesn't support beforeinstallprompt — show a custom banner instead
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isStandalone) {
      // Show after 3 seconds on iOS (no native prompt available)
      const timer = setTimeout(() => setShow(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  }

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS — no programmatic install, just show instructions
      dismiss();
    }
  }

  if (!show) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-float-up md:left-auto md:right-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install LearnX AI</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isIOS
              ? 'Tap Share → Add to Home Screen for a native app experience.'
              : 'Add to your home screen for offline study and a native feel.'}
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" onClick={install} className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              {isIOS ? 'Got it' : 'Install'}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} className="text-xs">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
