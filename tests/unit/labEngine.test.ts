import { describe, it, expect } from 'vitest';
import { resolveBattle, mulberry32 } from '../../src/lib/labEngine';
import type { Bey } from '../../src/lib/types';

// Test fixture builder. Only stat fields + type matter for the engine.
function bey(overrides: Partial<Bey> = {}): Bey {
  return {
    id: overrides.id ?? 'test-bey-' + Math.random(),
    name_en: overrides.name_en ?? 'Test',
    name_de: null,
    name_jp: null,
    product_code: null,
    image_url: null,
    type: overrides.type ?? 'attack',
    line: null,
    blade_id: null,
    ratchet_id: null,
    bit_id: null,
    stat_attack: overrides.stat_attack ?? 50,
    stat_defense: overrides.stat_defense ?? 50,
    stat_stamina: overrides.stat_stamina ?? 50,
    stat_burst_resistance: null,
    source_url: null,
    available_in_de: true,
    canonical: true,
    scraped_at: null,
    created_at: '2026-05-03T00:00:00Z',
  };
}

function winRate(myBey: Bey, oppBey: Bey, iters = 10000): number {
  let myWins = 0;
  for (let i = 0; i < iters; i++) {
    const o = resolveBattle(myBey, oppBey, i + 1);
    if (o.winner === 'me') myWins++;
  }
  return myWins / iters;
}

describe('labEngine — stat tilts', () => {
  it('all-equal beys: ~50/50 win rate', () => {
    const me = bey({ id: 'me', type: 'attack' });
    const opp = bey({ id: 'opp', type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.48);
    expect(rate).toBeLessThanOrEqual(0.52);
  });

  it('strong attack advantage: clamped between 65% and 75%', () => {
    const me = bey({ id: 'me', stat_attack: 80, type: 'attack' });
    const opp = bey({ id: 'opp', stat_attack: 50, type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.65);
    expect(rate).toBeLessThanOrEqual(0.75);
  });

  it('cap-busting stats stay clamped near 75% max', () => {
    // myOdds clamps to 0.75. With 10k seeds the measured rate hovers at 0.75
    // ± ~1σ (~0.0043). Ceiling 0.76 absorbs that variance without losing the
    // clamp's intent. If you tighten this, expect occasional flakes.
    const me = bey({ id: 'me', stat_attack: 100, stat_defense: 100, stat_stamina: 100, type: 'attack' });
    const opp = bey({ id: 'opp', stat_attack: 10, stat_defense: 10, stat_stamina: 10, type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeLessThanOrEqual(0.76);
    expect(rate).toBeGreaterThanOrEqual(0.72);
  });

  it('determinism: same seed twice = identical outcome', () => {
    const me = bey({ id: 'me', stat_attack: 70 });
    const opp = bey({ id: 'opp', stat_attack: 50 });
    const a = resolveBattle(me, opp, 12345);
    const b = resolveBattle(me, opp, 12345);
    expect(a).toEqual(b);
  });

  it('mulberry32 is deterministic and in [0,1)', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r1();
      expect(v).toBe(r2());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('labEngine — type chart', () => {
  it('attack vs stamina with equal stats → ~60% win rate (favored)', () => {
    const me = bey({ id: 'me', type: 'attack' });
    const opp = bey({ id: 'opp', type: 'stamina' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.55);
    expect(rate).toBeLessThanOrEqual(0.65);
  });

  it('stamina vs attack with equal stats → ~40% win rate (countered)', () => {
    const me = bey({ id: 'me', type: 'stamina' });
    const opp = bey({ id: 'opp', type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.35);
    expect(rate).toBeLessThanOrEqual(0.45);
  });

  it('mirror match (attack vs attack) → ~50% (no type tilt)', () => {
    const me = bey({ id: 'me', type: 'attack' });
    const opp = bey({ id: 'opp', type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.48);
    expect(rate).toBeLessThanOrEqual(0.52);
  });

  it('balance type → no tilt either way (neutral)', () => {
    const me = bey({ id: 'me', type: 'balance' });
    const opp = bey({ id: 'opp', type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.48);
    expect(rate).toBeLessThanOrEqual(0.52);
  });

  it('null type (data gap) → no tilt either way (neutral)', () => {
    const me = bey({ id: 'me', type: null });
    const opp = bey({ id: 'opp', type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeGreaterThanOrEqual(0.48);
    expect(rate).toBeLessThanOrEqual(0.52);
  });
});
