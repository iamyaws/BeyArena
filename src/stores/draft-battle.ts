// src/stores/draft-battle.ts
import { create } from 'zustand';
import type { DraftBattle } from '../lib/types';

type Step = 'opponent' | 'score' | 'beys' | 'confirm';

interface DraftState extends Partial<DraftBattle> {
  step: Step;
  setStep: (s: Step) => void;
  patch: (p: Partial<DraftBattle>) => void;
  reset: () => void;
}

export const useDraftBattle = create<DraftState>((set) => ({
  step: 'opponent',
  setStep: (step) => set({ step }),
  patch: (p) => set((s) => ({ ...s, ...p })),
  reset: () =>
    set({
      step: 'opponent',
      opponent_kid_id: undefined,
      i_won: undefined,
      my_score: undefined,
      opp_score: undefined,
      my_bey_id: undefined,
      opp_bey_id: undefined,
    }),
}));
