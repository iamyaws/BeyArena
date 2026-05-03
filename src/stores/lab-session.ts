// src/stores/lab-session.ts
// Lab in-memory state. Outcome data is never written here — the store only
// tracks the kid's selections, session-only streak, and settings (mirrored to
// localStorage). See spec section 9.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OpponentKind } from '../lib/labEngine';

interface LabState {
  // Picks (in-memory only)
  myBeyId: string | null;
  opponent: OpponentKind | null;

  // Session counter (resets on tab leave via resetSession)
  streak: number;

  // Settings (persisted)
  streakEnabled: boolean;
  soundEnabled: boolean;

  // Filter (in-memory)
  beyFilter: 'mine' | 'all';

  // Actions
  setMyBey: (id: string) => void;
  setOpponent: (k: OpponentKind) => void;
  clearOpponent: () => void;
  recordWin: () => void;
  recordLoss: () => void;
  resetSession: () => void;
  setStreakEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setBeyFilter: (f: 'mine' | 'all') => void;
}

// Persist only the settings sub-slice; picks + streak are session-only.
export const useLabSession = create<LabState>()(
  persist(
    (set) => ({
      myBeyId: null,
      opponent: null,
      streak: 0,
      streakEnabled: false,
      soundEnabled: false,
      beyFilter: 'mine',

      setMyBey: (id) => set({ myBeyId: id }),
      setOpponent: (k) => set({ opponent: k }),
      clearOpponent: () => set({ opponent: null }),
      recordWin: () => set((s) => ({ streak: s.streak + 1 })),
      recordLoss: () => set({ streak: 0 }),
      resetSession: () => set({ myBeyId: null, opponent: null, streak: 0 }),
      setStreakEnabled: (v) => set({ streakEnabled: v }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setBeyFilter: (f) => set({ beyFilter: f }),
    }),
    {
      name: 'beyarena-lab',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        streakEnabled: s.streakEnabled,
        soundEnabled: s.soundEnabled,
      }),
    },
  ),
);
