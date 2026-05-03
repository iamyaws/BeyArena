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
  | { kind: 'wild'; beyId?: string }              // beyId set when "Bey bestimmen"
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

const TYPE_TILT = 0.10;

// Rock-paper-scissors: Attack > Stamina > Defense > Attack.
// Balance + null → no tilt (neutral).
const TYPE_BEATS: Record<'attack' | 'defense' | 'stamina', 'attack' | 'defense' | 'stamina'> = {
  attack: 'stamina',
  stamina: 'defense',
  defense: 'attack',
};

function typeTilt(myType: Bey['type'], oppType: Bey['type']): number {
  if (!myType || !oppType) return 0;
  if (myType === 'balance' || oppType === 'balance') return 0;
  if (TYPE_BEATS[myType] === oppType) return +TYPE_TILT;
  if (TYPE_BEATS[oppType] === myType) return -TYPE_TILT;
  return 0; // mirror match
}

export function resolveBattle(
  myBey: Bey,
  oppBey: Bey,
  seed: number = Date.now(),
): Outcome {
  const atkTilt = statTilt(myBey.stat_attack, oppBey.stat_attack);
  const defTilt = statTilt(myBey.stat_defense, oppBey.stat_defense);
  const staTilt = statTilt(myBey.stat_stamina, oppBey.stat_stamina);
  const tTilt   = typeTilt(myBey.type, oppBey.type);

  const rawOdds = 0.5 + atkTilt + defTilt + staTilt + tTilt;
  const myOdds = clamp(ODDS_FLOOR, ODDS_CEIL, rawOdds);

  const rng = mulberry32(seed);
  const roll = rng();
  const winner: 'me' | 'opp' = roll < myOdds ? 'me' : 'opp';

  // Margin from absolute distance from coin-flip
  const oddsGap = Math.abs(myOdds - 0.5);
  let margin: Margin;
  if (oddsGap < 0.10) margin = 'knapp';
  else if (oddsGap < 0.20) margin = 'klar';
  else margin = 'zerstoert';

  // reasonKey resolution:
  //   1. If the favorite lost (RNG produced lower-odds outcome) → 'upset'
  //   2. Otherwise: largest tilt component picks the reason
  //   3. Stat tilts outrank type tilt at exact tie (already true via comparison order)
  const favoredSide: 'me' | 'opp' | null =
    myOdds > 0.5 ? 'me' : myOdds < 0.5 ? 'opp' : null;
  const isUpset = favoredSide !== null && favoredSide !== winner;

  const reasonKey = resolveReasonKey({
    winner,
    isUpset,
    atkTilt, defTilt, staTilt, tTilt,
    myType: myBey.type, oppType: oppBey.type,
  });

  return { winner, margin, reasonKey, myOdds, seed };
}

function resolveReasonKey(args: {
  winner: 'me' | 'opp';
  isUpset: boolean;
  atkTilt: number;
  defTilt: number;
  staTilt: number;
  tTilt: number;
  myType: Bey['type'];
  oppType: Bey['type'];
}): ReasonKey {
  if (args.isUpset) return 'upset';

  const absAtk = Math.abs(args.atkTilt);
  const absDef = Math.abs(args.defTilt);
  const absSta = Math.abs(args.staTilt);
  const absT   = Math.abs(args.tTilt);
  const max = Math.max(absAtk, absDef, absSta, absT);

  if (max === 0) return 'closer-stats';

  // Stat tilts outrank type tilt at exact tie. Order: atk → def → sta → type.
  if (absAtk === max) return 'atk-cracks-def';
  if (absDef === max) return 'def-walls-atk';
  if (absSta === max) return 'sta-outlasts-sta';

  // Type tilt is the strict winner. Map the WINNER's type vs. loser's type
  // to one of the three valid type-chart keys.
  const winType = args.winner === 'me' ? args.myType : args.oppType;
  const loseType = args.winner === 'me' ? args.oppType : args.myType;
  if (winType === 'attack'  && loseType === 'stamina') return 'atk-beats-sta';
  if (winType === 'stamina' && loseType === 'defense') return 'sta-beats-def';
  if (winType === 'defense' && loseType === 'attack')  return 'def-beats-atk';

  // Defensive fallback (shouldn't hit, but type narrowing demands it)
  return 'closer-stats';
}
