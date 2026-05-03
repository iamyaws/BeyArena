// src/lib/labEngine.ts
// Pure battle resolver for the Battle Lab. Same inputs + same seed → same
// Outcome. The renderer (LabBattleScreen) consumes this object and dramatizes
// it; no outcome logic in the renderer.
//
// Math (full reasoning in docs/superpowers/specs/2026-05-03-battle-lab-design.md
// section 4):
//   odds = 0.5
//        + clamp(±0.15, (myAtk-oppAtk) * 0.005)
//        + clamp(±0.15, (myDef-oppDef) * 0.005)
//        + clamp(±0.15, (mySta-oppSta) * 0.005)
//        + typeTilt(myType, oppType)            ∈ {-0.10, 0, +0.10}
//   odds = clamp(0.25, 0.75, odds)
//   winner = (mulberry32(seed) < odds) ? 'me' : 'opp'
//
// reasonKey resolution: upset overrides; otherwise largest tilt wins;
// stat-tilt outranks type-tilt at exact tie.
//
// Margin buckets (post-clamp |odds-0.5|):
//   <0.10 → knapp     <0.20 → klar     ≥0.20 → zerstoert

import type { Bey } from './types';

export type LabBeyType = 'attack' | 'defense' | 'stamina' | 'balance';

export type OpponentKind =
  | { kind: 'wild' }
  | { kind: 'trainer'; trainerId: string }
  | { kind: 'crew'; kidId: string };

export type ReasonKey =
  // Stat-driven (largest stat tilt determined the outcome)
  | 'atk-cracks-def'
  | 'def-walls-atk'
  | 'sta-outlasts-sta'
  // Type-chart-driven (largest contributor was the type-matchup tilt)
  | 'atk-beats-sta'   // attack beats stamina
  | 'sta-beats-def'   // stamina beats defense
  | 'def-beats-atk'   // defense beats attack
  // Misc
  | 'closer-stats'    // all tilts ~0; coin flip won by RNG margin
  | 'upset';          // RNG flipped the favored outcome

export type Margin = 'knapp' | 'klar' | 'zerstoert';

export interface Outcome {
  winner: 'me' | 'opp';
  margin: Margin;
  reasonKey: ReasonKey;
  myOdds: number;       // post-clamp; for the recap odds bar
  seed: number;         // for reproducible animation
}

/** Deterministic 32-bit RNG. Returns a number in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAT_PER_POINT = 0.005;  // 30-point single-stat advantage caps at ±0.15
const STAT_CAP = 0.15;
const ODDS_FLOOR = 0.25;
const ODDS_CEIL = 0.75;

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

function statTilt(my: number | null, opp: number | null): number {
  const m = my ?? 50;
  const o = opp ?? 50;
  return clamp(-STAT_CAP, STAT_CAP, (m - o) * STAT_PER_POINT);
}

export function resolveBattle(
  myBey: Bey,
  oppBey: Bey,
  seed: number = Date.now(),
): Outcome {
  const atkTilt = statTilt(myBey.stat_attack, oppBey.stat_attack);
  const defTilt = statTilt(myBey.stat_defense, oppBey.stat_defense);
  const staTilt = statTilt(myBey.stat_stamina, oppBey.stat_stamina);

  const rawOdds = 0.5 + atkTilt + defTilt + staTilt;
  const myOdds = clamp(ODDS_FLOOR, ODDS_CEIL, rawOdds);

  const rng = mulberry32(seed);
  const roll = rng();
  const winner: 'me' | 'opp' = roll < myOdds ? 'me' : 'opp';

  // Margin + reasonKey are placeholders until Tasks 4 + 5; just enough to
  // satisfy the Outcome shape so tests can run.
  return {
    winner,
    margin: 'knapp',
    reasonKey: 'closer-stats',
    myOdds,
    seed,
  };
}
