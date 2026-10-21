'use client';

import * as React from 'react';
import {
  Settings as SettingsIcon,
  User,
  Crown,
  Download,
  Trash2,
  Palette,
  Keyboard,
  Moon,
  Sun,
  Shield,
  Check,
  Loader2,
  Database,
  Bot,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { usePremium } from '@/lib/stores/use-premium';
import { getUserProfile } from '@/components/onboarding-wizard';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { isPremium, isAdmin, adFree, cancelPremium } = usePremium();
  const [name, setName] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  // Load profile on mount
  React.useEffect(() => {
    const profile = getUserProfile();
    if (profile) {
      setName(profile.name || '');
      setLevel(profile.level || '');
    }
  }, []);

  function saveProfile() {
    setSaving(true);
    try {
      const profile = getUserProfile() || { name: '', level: '', subjects: [] };
      profile.name = name.trim() || 'Learner';
      profile.level = level;
      localStorage.setItem('learnx:user-profile', JSON.stringify(profile));
      toast.success('Profile updated');
    } catch {
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  async function exportAllData() {
    try {
      const res = await api.get<{ studySets: { id: string; title: string }[] }>('/api/study-sets');
      const sets = res.studySets;
      const allData: unknown[] = [];
      for (const s of sets) {
        try {
          const resp = await fetch(`/api/study-sets/${s.id}/export`);
          const data = await resp.json();
          allData.push(data);
        } catch { /* skip */ }
      }
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), studySets: allData }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learnx-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${sets.length} study set(s)`);
    } catch (e) {
      toast.error('Export failed', { description: (e as Error).message });
    }
  }

  async function clearAllData() {
    if (!confirm('This will permanently delete ALL your study sets, flashcards, quizzes, notes, podcasts, and chat history. This cannot be undone. Are you sure?')) return;
    setClearing(true);
    try {
      const res = await api.get<{ studySets: { id: string }[] }>('/api/study-sets');
      for (const s of res.studySets) {
        await api.del(`/api/study-sets/${s.id}`);
      }
      // Clear chat sessions
      try {
        const sessions = await api.get<{ sessions: { id: string }[] }>('/api/chat/sessions');
        for (const s of sessions.sessions) {
          await api.del(`/api/chat/sessions/${s.id}`);
        }
      } catch { /* ignore */ }
      toast.success('All data cleared');
    } catch (e) {
      toast.error('Could not clear all data', { description: (e as Error).message });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* AI Status section */}
      <AiStatusCard />

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Profile
          </CardTitle>
          <CardDescription>Manage your learning profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Name / Nickname</Label>
            <Input
              id="settings-name"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving} size="sm" className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" /> Subscription
          </CardTitle>
          <CardDescription>Manage your Premium status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">
                {adFree ? 'Premium Active' : 'Free Tier'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAdmin ? 'Admin override — all features unlocked' :
                 isPremium ? '$5.99/month · Cancel anytime' :
                 'Ads enabled · 3 AI generations/day'}
              </p>
            </div>
            <Badge variant={adFree ? 'default' : 'secondary'} className="gap-1">
              {adFree ? <><Crown className="h-3 w-3" /> Premium</> : 'Free'}
            </Badge>
          </div>
          {isPremium && !isAdmin && (
            <Button variant="outline" size="sm" onClick={cancelPremium} className="w-full text-xs">
              Cancel subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Appearance section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm">Dark mode</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="gap-1"
            >
              {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data management section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Data Management
          </CardTitle>
          <CardDescription>Export or delete your study data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Export all data
              </p>
              <p className="text-xs text-muted-foreground">Download all study sets as JSON</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportAllData} className="gap-1">
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 text-destructive">
                <Trash2 className="h-4 w-4" /> Clear all data
              </p>
              <p className="text-xs text-muted-foreground">Permanently delete everything</p>
            </div>
            <Button variant="outline" size="sm" onClick={clearAllData} disabled={clearing} className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" /> About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Plan</span>
            <span>{adFree ? 'Premium' : 'Free'}</span>
          </div>
          <Separator className="my-2" />
          <p className="text-center text-xs pt-1">
            LearnX AI — Learn anything, faster. <br />
            Free to start. Premium for ad-free studying.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shows the current AI provider status + instructions to fix if not working. */
function AiStatusCard() {
  const [status, setStatus] = React.useState<{
    environment: string;
    provider: string;
    groqConfigured: boolean;
    working: boolean;
    latencyMs: number | null;
    sample: string;
    lastError: string | null;
    help: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const check = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    check();
  }, [check]);

  const working = status?.working;
  const providerLabel = status?.provider === 'groq'
    ? 'Groq'
    : status?.provider === 'zai'
      ? 'Z.AI (sandbox)'
      : 'None configured';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" /> AI Engine Status
        </CardTitle>
        <CardDescription>
          Shows which AI provider is configured and whether it's working.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking AI status…
          </div>
        ) : working ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                AI is working ({providerLabel})
              </p>
              <p className="text-xs text-muted-foreground">
                Environment: {status?.environment} · Latency: {status?.latencyMs}ms
              </p>
              {status?.sample && (
                <p className="text-xs text-muted-foreground">
                  Test response: <span className="font-mono">"{status.sample}"</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                AI is not configured ({providerLabel})
              </p>
              <p className="text-xs text-muted-foreground">
                Environment: {status?.environment}
              </p>
              {status?.lastError && (
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {status.lastError}
                </p>
              )}
              {status?.help && (
                <div className="rounded-md bg-amber-500/10 p-2 text-xs">
                  <p className="font-medium mb-1">How to fix:</p>
                  <p className="text-muted-foreground">{status.help}</p>
                  {status.environment === 'vercel' && (
                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-muted-foreground">
                      <li>
                        Go to{' '}
                        <a
                          href="https://console.groq.com/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          console.groq.com/keys <ExternalLink className="h-3 w-3" />
                        </a>{' '}
                        and create a free API key.
                      </li>
                      <li>
                        In your Vercel project settings, add an environment variable:
                        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          GROQ_API_KEY
                        </code>
                        = your key.
                      </li>
                      <li>Redeploy and AI features will work.</li>
                    </ol>
                  )}
                </div>
              )}
              <Button onClick={check} variant="outline" size="sm" className="mt-2 h-7 text-xs">
                Re-check
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
