import { describe, it, expect } from 'vitest';
import { LAB_TRAINERS, getTrainer } from '../../src/data/labTrainers';
import type { Bey } from '../../src/lib/types';

function bey(overrides: Partial<Bey> = {}): Bey {
  return {
    id: overrides.id ?? 't-' + Math.random(),
    name_en: 'Test', name_de: null, name_jp: null, product_code: null,
    image_url: null, type: overrides.type ?? null, line: null,
    blade_id: null, ratchet_id: null, bit_id: null,
    stat_attack: overrides.stat_attack ?? 50,
    stat_defense: overrides.stat_defense ?? 50,
    stat_stamina: overrides.stat_stamina ?? 50,
    stat_burst_resistance: null, source_url: null, available_in_de: true,
    canonical: true, scraped_at: null, created_at: '2026-05-03T00:00:00Z',
  };
}

describe('labTrainers', () => {
  const SAMPLE: Bey[] = [
    bey({ id: 'a1', stat_attack: 90, type: 'attack' }),
    bey({ id: 'a2', stat_attack: 70, type: 'attack' }),
    bey({ id: 'd1', stat_defense: 95, type: 'defense' }),
    bey({ id: 'd2', stat_defense: 80, type: 'defense' }),
    bey({ id: 's1', stat_stamina: 92, type: 'stamina' }),
    bey({ id: 's2', stat_stamina: 75, type: 'stamina' }),
  ];

  it('exposes exactly 5 trainers in canonical order', () => {
    expect(LAB_TRAINERS).toHaveLength(5);
    expect(LAB_TRAINERS.map((t) => t.id)).toEqual([
      'atk-koenig', 'def-mira', 'wild-karte', 'schnell-tim', 'schwer-pia',
    ]);
  });

  it('atk-koenig picks the highest-attack bey', () => {
    const t = getTrainer('atk-koenig');
    expect(t.pick(SAMPLE).id).toBe('a1');
  });

  it('def-mira picks the highest-defense bey', () => {
    const t = getTrainer('def-mira');
    expect(t.pick(SAMPLE).id).toBe('d1');
  });

  it('wild-karte picks any bey in the roster', () => {
    const t = getTrainer('wild-karte');
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) picks.add(t.pick(SAMPLE).id);
    // With 6 beys and 200 trials, we expect to see ≥3 distinct ones.
    expect(picks.size).toBeGreaterThanOrEqual(3);
  });

  it('schnell-tim picks an Attack-type bey (highest stamina among them)', () => {
    const t = getTrainer('schnell-tim');
    const pick = t.pick(SAMPLE);
    expect(pick.type).toBe('attack');
  });

  it('schwer-pia picks a Stamina-type bey (highest stamina overall)', () => {
    const t = getTrainer('schwer-pia');
    const pick = t.pick(SAMPLE);
    expect(pick.type).toBe('stamina');
  });

  it('fallbacks: schnell-tim with no Attack-type beys still picks something', () => {
    const noAttackBeys: Bey[] = [bey({ id: 'd', type: 'defense' }), bey({ id: 's', type: 'stamina' })];
    const t = getTrainer('schnell-tim');
    expect(() => t.pick(noAttackBeys)).not.toThrow();
    expect(t.pick(noAttackBeys)).toBeDefined();
  });

  it('fallbacks: empty roster throws (caller must guard)', () => {
    const t = getTrainer('atk-koenig');
    expect(() => t.pick([])).toThrow();
  });

  it('getTrainer throws on unknown id', () => {
    expect(() => getTrainer('unknown')).toThrow();
  });
});
