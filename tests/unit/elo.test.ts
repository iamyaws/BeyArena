import { describe, it, expect } from 'vitest';
import { computeElo } from '../../src/lib/elo';

describe('computeElo (K=16, Section 6.3)', () => {
  it('equal opponents: winner +8, loser -8', () => {
    const r = computeElo(1000, 1000, true);
    expect(r.winnerNew).toBe(1008);
    expect(r.loserNew).toBe(992);
  });

  it('upset: weak winner gains more', () => {
    const r = computeElo(800, 1200, true); // 800 beats 1200
    expect(r.winnerNew).toBeGreaterThan(800 + 8);
    expect(r.loserNew).toBeLessThan(1200 - 8);
  });

  it('expected win: minimal change', () => {
    const r = computeElo(1200, 800, true); // 1200 beats 800
    expect(r.winnerNew - 1200).toBeLessThan(8);
  });
});
