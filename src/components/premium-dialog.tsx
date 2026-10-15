'use client';

import * as React from 'react';
import { Crown, Check, X, Loader2, Shield, Zap, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePremium } from '@/lib/stores/use-premium';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PREMIUM_FEATURES = [
  'No ads — distraction-free studying',
  'Unlimited AI study set generations (free: 3/day)',
  'Unlimited AI podcast audio (free: 1/day)',
  'Unlimited AI tutor messages (free: 20/day)',
  'Priority AI processing (faster responses)',
  'All future premium features',
  'Support development of LearnX AI',
];

export function PremiumDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { isPremium, isAdmin, goPremium, activateAdmin, cancelPremium } = usePremium();
  const [open, setOpen] = React.useState(false);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [adminCode, setAdminCode] = React.useState('');

  async function handleCheckout() {
    setCheckingOut(true);
    // In production, this would redirect to Stripe Checkout:
    // const res = await api.post('/api/stripe/checkout', { plan: 'monthly' });
    // window.location.href = res.url;
    
    // For now: simulate checkout flow (replace with real Stripe integration)
    await new Promise((r) => setTimeout(r, 1500));
    goPremium();
    toast.success('Welcome to Premium! 🎉', {
      description: 'Ads are now removed. Enjoy distraction-free studying!',
    });
    setCheckingOut(false);
    setOpen(false);
  }

  function handleAdmin() {
    if (activateAdmin(adminCode)) {
      toast.success('Admin access activated', {
        description: 'Ads removed. You have full premium access.',
      });
      setAdminCode('');
      setAdminOpen(false);
      setOpen(false);
    } else {
      toast.error('Invalid admin code');
    }
  }

  // Already premium
  if (isPremium || isAdmin) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm" className="gap-1">
              <Crown className="h-4 w-4 text-amber-500" /> Premium
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>You're Premium! 👑</DialogTitle>
                <DialogDescription>
                  {isAdmin ? 'Admin access — all features unlocked' : 'Thanks for supporting LearnX AI'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> {f}
              </div>
            ))}
          </div>
          {!isAdmin && (
            <Button variant="outline" onClick={() => { cancelPremium(); setOpen(false); }} className="w-full text-xs">
              Cancel subscription
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1 border-amber-400/40 bg-amber-400/10 text-amber-700 hover:bg-amber-400/20 dark:text-amber-300">
            <Crown className="h-4 w-4" /> Go Premium
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">LearnX AI Premium</DialogTitle>
              <DialogDescription>Unlock the full learning experience</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Price card */}
        <div className="rounded-2xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-400/5 via-orange-400/5 to-rose-400/5 p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">$5.99</span>
            <span className="text-sm text-muted-foreground">/month</span>
            <Badge variant="secondary" className="ml-auto gap-1 bg-amber-400/15 text-amber-700 dark:text-amber-300">
              <Zap className="h-3 w-3" /> Best value
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Cancel anytime · No hidden fees</p>

          <div className="mt-4 space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="mt-4 w-full gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/20"
            size="lg"
          >
            {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {checkingOut ? 'Processing...' : 'Get Premium for $5.99/mo'}
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Secure payment via Stripe · Cancel anytime
          </p>
        </div>

        {/* Admin access (hidden link) */}
        <div className="text-center">
          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {adminOpen ? 'Cancel admin access' : 'Have an admin code?'}
          </button>
          {adminOpen && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Enter admin code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdmin(); }}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={handleAdmin} className="gap-1">
                <Shield className="h-3.5 w-3.5" /> Activate
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
