'use client';

import { create } from 'zustand';

const PREMIUM_KEY = 'learnx:premium';
const ADMIN_KEY = 'learnx:admin';
export const ADMIN_CODE = 'LEARNX-ADMIN-2026'; // ← change this to your secret code

interface PremiumStore {
  isPremium: boolean;
  isAdmin: boolean;
  adFree: boolean;
  initialized: boolean;
  goPremium: () => void;
  activateAdmin: (code: string) => boolean;
  cancelPremium: () => void;
  init: () => void;
}

// Always start with false on both server and client to avoid hydration mismatch.
// localStorage values are loaded in init() which runs inside useEffect (client-only).
export const usePremium = create<PremiumStore>((set, get) => ({
  isPremium: false,
  isAdmin: false,
  adFree: false,
  initialized: false,

  init: () => {
    if (get().initialized) return;
    try {
      const premium = localStorage.getItem(PREMIUM_KEY) === '1';
      const admin = localStorage.getItem(ADMIN_KEY) === '1';
      set({ isPremium: premium, isAdmin: admin, adFree: premium || admin, initialized: true });
    } catch {
      set({ initialized: true });
    }
  },

  goPremium: () => {
    try { localStorage.setItem(PREMIUM_KEY, '1'); } catch { /* ignore */ }
    set({ isPremium: true, adFree: true });
  },

  activateAdmin: (code: string) => {
    if (code.trim().toUpperCase() !== ADMIN_CODE) return false;
    try { localStorage.setItem(ADMIN_KEY, '1'); } catch { /* ignore */ }
    set({ isAdmin: true, adFree: true });
    return true;
  },

  cancelPremium: () => {
    try { localStorage.removeItem(PREMIUM_KEY); } catch { /* ignore */ }
    const admin = get().isAdmin;
    set({ isPremium: false, adFree: admin });
  },
}));
