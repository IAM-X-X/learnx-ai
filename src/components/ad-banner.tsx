'use client';

import * as React from 'react';
import { Sparkles, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/lib/stores/use-premium';
import { cn } from '@/lib/utils';

// Google AdSense client ID — set NEXT_PUBLIC_ADSENSE_CLIENT in .env to enable real ads.
// Leave empty to show styled placeholder ads (good for development + Softonic screenshots).
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

type AdVariant = 'leaderboard' | 'rectangle' | 'sidebar' | 'inline';

const AD_CONFIG: Record<AdVariant, {
  minHeight: string;
  title: string;
  subtitle: string;
  gradient: string;
}> = {
  leaderboard: {
    minHeight: 'min-h-[72px]',
    title: 'Your ad could be here',
    subtitle: '728×90 leaderboard banner',
    gradient: 'from-violet-500/8 to-primary/3',
  },
  rectangle: {
    minHeight: 'min-h-[200px]',
    title: 'Sponsored',
    subtitle: '300×250 medium rectangle',
    gradient: 'from-amber-500/8 to-orange-500/3',
  },
  sidebar: {
    minHeight: 'min-h-[250px]',
    title: 'Advertisement',
    subtitle: 'Responsive sidebar ad',
    gradient: 'from-cyan-500/8 to-blue-500/3',
  },
  inline: {
    minHeight: 'min-h-[90px]',
    title: 'Sponsored content',
    subtitle: 'Responsive inline ad',
    gradient: 'from-emerald-500/8 to-teal-500/3',
  },
};

export function AdBanner({ variant = 'leaderboard', className }: { variant?: AdVariant; className?: string }) {
  const adFree = usePremium((s) => s.adFree);
  const initialized = usePremium((s) => s.initialized);

  // Don't render ads for premium/admin users
  if (adFree) return null;
  // Wait for premium store to initialize from localStorage before rendering
  // ads — otherwise premium users see a flash of ads on every page load.
  if (!initialized) return null;

  const config = AD_CONFIG[variant];

  // Real AdSense ad (when configured)
  if (ADSENSE_CLIENT) {
    return (
      <div className={cn('relative overflow-hidden rounded-xl border border-border/40', config.minHeight, className)}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <script
          dangerouslySetInnerHTML={{ __html: '(adsbygoogle = window.adsbygoogle || []).push({});' }}
        />
      </div>
    );
  }

  // Styled placeholder (development mode)
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-border/50 bg-gradient-to-br p-3 text-center',
        config.gradient,
        config.minHeight,
        className,
      )}
    >
      <span className="absolute right-2 top-1.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30">
        Ad
      </span>
      <Sparkles className="h-4 w-4 text-muted-foreground/25" />
      <p className="text-[11px] font-medium text-muted-foreground/50">{config.title}</p>
      <p className="text-[9px] text-muted-foreground/35">{config.subtitle}</p>
      <button
        onClick={() => {
          // Scroll to top where the Go Premium button is in the header
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-medium text-amber-600 transition-colors hover:bg-amber-400/20 dark:text-amber-300"
      >
        <Crown className="h-2.5 w-2.5" /> Go Premium to remove ads
      </button>
    </div>
  );
}
