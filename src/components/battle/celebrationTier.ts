// Helper to choose a battle-celebration tier from the optimistic floor delta.
// Lives separately from BattleCelebration.tsx so the component file only
// exports React components (satisfies react-refresh/only-export-components).

export type CelebrationTier = 'won' | 'floorup' | 'peak';

export function celebrationTierFor(opts: {
  iWon: boolean;
  myFloor: number;
  myFloorNew: number;
}): CelebrationTier | null {
  if (!opts.iWon) return null;
  if (opts.myFloorNew >= 100 && opts.myFloor < 100) return 'peak';
  // Crossed a tens-boundary (every 10 floors = mini-tier — Lokal-1 -> Lokal-2)
  if (Math.floor(opts.myFloorNew / 10) > Math.floor(opts.myFloor / 10)) {
    return 'floorup';
  }
  return 'won';
}
