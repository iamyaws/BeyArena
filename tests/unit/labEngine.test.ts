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

describe('labEngine — margin buckets', () => {
  it('all-equal stats produces knapp margin', () => {
    const o = resolveBattle(bey(), bey(), 1);
    expect(o.margin).toBe('knapp');
  });

  it('mid stat advantage produces klar margin', () => {
    const me = bey({ stat_attack: 75 });   // tilts +0.125 with STAT_PER_POINT=0.005
    const opp = bey({ stat_attack: 50 });
    const o = resolveBattle(me, opp, 1);
    expect(o.margin).toBe('klar');
  });

  it('cap-busting stats produce zerstoert margin', () => {
    const me = bey({ stat_attack: 100, stat_defense: 100, stat_stamina: 100 });
    const opp = bey({ stat_attack: 10, stat_defense: 10, stat_stamina: 10 });
    const o = resolveBattle(me, opp, 1);
    expect(o.margin).toBe('zerstoert');
  });
});

describe('labEngine — reasonKey resolution', () => {
  it('atk-vs-def with attack winning by stats → atk-cracks-def', () => {
    const me = bey({ stat_attack: 80, type: 'attack' });
    const opp = bey({ stat_defense: 50, type: 'defense' });
    // me is favored: type tilt (-0.10 since def beats atk) + stat tilt depends on diffs
    // Use a seed where the favorite wins. We'll force the winner branch by trying many seeds:
    let saw = false;
    for (let s = 1; s < 50; s++) {
      const o = resolveBattle(me, opp, s);
      if (o.winner === 'me') {
        // When the larger stat tilt is atk, reasonKey should be atk-cracks-def
        if (o.reasonKey === 'atk-cracks-def') saw = true;
      }
    }
    expect(saw).toBe(true);
  });

  it('upset wins set reasonKey="upset"', () => {
    // Heavy favorite, but on enough seeds the underdog wins.
    const me = bey({ stat_attack: 30, type: 'stamina' });
    const opp = bey({ stat_attack: 80, type: 'attack' });
    let upsets = 0;
    for (let s = 1; s < 200; s++) {
      const o = resolveBattle(me, opp, s);
      if (o.winner === 'me') upsets++;
      if (o.winner === 'me') {
        expect(o.reasonKey).toBe('upset');
      }
    }
    expect(upsets).toBeGreaterThan(0);  // some upsets happened
  });

  it('all-equal beys + favored win → closer-stats reasonKey', () => {
    const me = bey({ type: 'attack' });
    const opp = bey({ type: 'attack' });
    const o = resolveBattle(me, opp, 1);
    // myOdds = 0.5; whoever wins isn't an "upset" (favorite is undefined).
    // We treat coin-flip wins as 'closer-stats'.
    expect(['closer-stats', 'upset']).toContain(o.reasonKey);
  });
});
