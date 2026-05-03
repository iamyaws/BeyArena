# Battle Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Battle Lab — a sandbox bey-vs-bey arena as the 5th nav tab, where a kid picks two beys and watches a weighted-RNG auto-battle with type-chart drama, recap card, and trainer/crew opponents.

**Architecture:** Pure client-side feature module. A pure `labEngine` decides the outcome in <1ms; React components dramatize it. Lone DB change is `kids.primary_bey_id` for the crew-opponent path. All session state (streak, mute, FTUE-done, trainers-beaten-today) lives in localStorage; outcomes are never persisted.

**Tech Stack:** React 18 + TypeScript + Vitest + Motion + Zustand + TanStack Query + Tailwind + Supabase.

**Spec:** `docs/superpowers/specs/2026-05-03-battle-lab-design.md` (commit `34cb0ed`).

---

## File map

**New files:**
- `supabase/migrations/0010_kids_primary_bey_id.sql`
- `src/lib/labEngine.ts`
- `tests/unit/labEngine.test.ts`
- `src/data/labTrainers.ts`
- `src/stores/lab-session.ts`
- `src/hooks/useCrewKidsWithPrimary.ts`
- `src/components/lab/LabTab.tsx`
- `src/components/lab/LabPickerBey.tsx`
- `src/components/lab/LabPickerOpponent.tsx`
- `src/components/lab/LabBattleScreen.tsx`
- `src/components/lab/LabRecapCard.tsx`
- `src/components/lab/LabStreakChip.tsx`
- `src/components/lab/LabFTUE.tsx`
- `src/components/lab/LabSettingsSheet.tsx`
- `src/components/lab/LabPrimaryNudgeBanner.tsx`
- `src/components/profile/PrimaryBeySetter.tsx`
- `src/lib/labSound.ts`
- `src/lib/labHaptics.ts`
- `public/sounds/lab/launch.mp3` (asset; sourced via task)
- `public/sounds/lab/clash.mp3`
- `public/sounds/lab/fanfare.mp3`
- `public/sounds/lab/CREDITS.md`

**Modified files:**
- `src/routes.tsx` — add `/lab` route
- `src/components/nav/BottomNav.tsx` — switch to 5-column grid + add Lab tab
- `src/lib/supabase-types.ts` — regen after migration
- `src/pages/ProfilePage.tsx` — wire `PrimaryBeySetter`

---

## Phase 1 — Foundation (engine, data, types)

### Task 1: Migration `kids.primary_bey_id`

**Files:**
- Create: `supabase/migrations/0010_kids_primary_bey_id.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0010_kids_primary_bey_id.sql
-- Adds an optional "main bey" pointer on kids. Used by the Battle Lab to let
-- crew kids fight against the primary bey of another crew kid. Nullable so
-- existing rows + new kids without a pick remain valid.

ALTER TABLE kids
  ADD COLUMN primary_bey_id uuid REFERENCES beys(id) ON DELETE SET NULL;

COMMENT ON COLUMN kids.primary_bey_id IS
  'Optional. Kid sets in profile/Beys tab. Used as opponent in Battle Lab.';
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run via the supabase MCP tool: `mcp__supabase__apply_migration` with `name="0010_kids_primary_bey_id"` and the SQL body above. Verify the tool returns success.

- [ ] **Step 3: Verify the column exists**

```bash
# Via supabase MCP execute_sql:
#   SELECT column_name, data_type, is_nullable
#   FROM information_schema.columns
#   WHERE table_schema = 'public' AND table_name = 'kids' AND column_name = 'primary_bey_id';
```
Expected: one row, `data_type = uuid`, `is_nullable = YES`.

- [ ] **Step 4: Regenerate TypeScript types**

```bash
npm run types:supabase
```

Verify `src/lib/supabase-types.ts` now contains `primary_bey_id: string | null;` in the `kids` table Row/Insert/Update.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_kids_primary_bey_id.sql src/lib/supabase-types.ts
git commit -m "feat(db): add kids.primary_bey_id for Battle Lab opponent picker"
```

---

### Task 2: `labEngine` types + skeleton

**Files:**
- Create: `src/lib/labEngine.ts`

- [ ] **Step 1: Create the file with type definitions and a stub function**

```ts
// src/lib/labEngine.ts
// Pure battle resolver for the Battle Lab. Same inputs + same seed → same
// Outcome. The renderer (LabBattleScreen) consumes this object and dramatizes
// it; no outcome logic in the renderer.
//
// Math (full reasoning in docs/superpowers/specs/2026-05-03-battle-lab-design.md
// section 4):
//   odds = 0.5
//        + clamp(±0.15, (myAtk-oppAtk) * 0.004)
//        + clamp(±0.15, (myDef-oppDef) * 0.004)
//        + clamp(±0.15, (mySta-oppSta) * 0.004)
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

export function resolveBattle(
  _myBey: Bey,
  _oppBey: Bey,
  _seed: number = Date.now(),
): Outcome {
  // Stub — implemented in subsequent tasks (Task 3 stat tilts, Task 4 type
  // chart, Task 5 margin + reasonKey resolution).
  throw new Error('resolveBattle not implemented');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors. The `_myBey` / `_oppBey` underscore prefixes silence unused-arg warnings until Task 3 wires them up.

- [ ] **Step 3: Commit**

```bash
git add src/lib/labEngine.ts
git commit -m "feat(lab): engine type definitions + mulberry32 RNG"
```

---

### Task 3: Engine math — stat tilts (TDD)

**Files:**
- Create: `tests/unit/labEngine.test.ts`
- Modify: `src/lib/labEngine.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/labEngine.test.ts`:

```ts
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

  it('cap-busting stats stay clamped to 75% max', () => {
    const me = bey({ id: 'me', stat_attack: 100, stat_defense: 100, stat_stamina: 100, type: 'attack' });
    const opp = bey({ id: 'opp', stat_attack: 10, stat_defense: 10, stat_stamina: 10, type: 'attack' });
    const rate = winRate(me, opp);
    expect(rate).toBeLessThanOrEqual(0.75);
    expect(rate).toBeGreaterThanOrEqual(0.70);
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/unit/labEngine.test.ts
```

Expected: stat-tilt tests fail with `Error: resolveBattle not implemented`. The `mulberry32` test passes (already implemented).

- [ ] **Step 3: Implement `resolveBattle` with stat tilts only (no type chart yet)**

Replace the stub in `src/lib/labEngine.ts`:

```ts
const STAT_PER_POINT = 0.004;
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/unit/labEngine.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/labEngine.test.ts src/lib/labEngine.ts
git commit -m "feat(lab): engine stat tilts with clamp + mulberry32 RNG (TDD)"
```

---

### Task 4: Engine type chart (TDD)

**Files:**
- Modify: `tests/unit/labEngine.test.ts`
- Modify: `src/lib/labEngine.ts`

- [ ] **Step 1: Add failing type-chart tests**

Append to `tests/unit/labEngine.test.ts`:

```ts
describe('labEngine — type chart', () => {
  function bey(overrides: Partial<Bey> = {}): Bey {
    // Re-declared because TS file has it scoped to outer describe; keep it simple
    return {
      id: overrides.id ?? 'tc-' + Math.random(),
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

  function winRate(my: Bey, opp: Bey, iters = 10000): number {
    let w = 0;
    for (let i = 0; i < iters; i++) {
      if (resolveBattle(my, opp, i + 1).winner === 'me') w++;
    }
    return w / iters;
  }

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/unit/labEngine.test.ts
```

Expected: 4 of the 5 new type-chart tests fail (the mirror + null + balance ones may pass coincidentally because no type tilt is applied yet; the attack-vs-stamina + stamina-vs-attack ones will fail with rates ~50% instead of 60/40%).

- [ ] **Step 3: Implement type chart**

In `src/lib/labEngine.ts`, add above `resolveBattle`:

```ts
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
```

Then update `resolveBattle` to add the type tilt:

```ts
  const atkTilt = statTilt(myBey.stat_attack, oppBey.stat_attack);
  const defTilt = statTilt(myBey.stat_defense, oppBey.stat_defense);
  const staTilt = statTilt(myBey.stat_stamina, oppBey.stat_stamina);
  const tTilt   = typeTilt(myBey.type, oppBey.type);

  const rawOdds = 0.5 + atkTilt + defTilt + staTilt + tTilt;
  const myOdds = clamp(ODDS_FLOOR, ODDS_CEIL, rawOdds);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/unit/labEngine.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/labEngine.test.ts src/lib/labEngine.ts
git commit -m "feat(lab): engine type chart (atk>sta>def>atk, ±10%)"
```

---

### Task 5: Engine margin + reasonKey resolution (TDD)

**Files:**
- Modify: `tests/unit/labEngine.test.ts`
- Modify: `src/lib/labEngine.ts`

- [ ] **Step 1: Add failing margin + reasonKey tests**

Append to `tests/unit/labEngine.test.ts`:

```ts
describe('labEngine — margin buckets', () => {
  function bey(overrides: Partial<Bey> = {}): Bey {
    return {
      id: overrides.id ?? 'm-' + Math.random(),
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

  it('all-equal stats produces knapp margin', () => {
    const o = resolveBattle(bey(), bey(), 1);
    expect(o.margin).toBe('knapp');
  });

  it('mid stat advantage produces klar margin', () => {
    const me = bey({ stat_attack: 75 });   // tilts ~+0.10
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
  function bey(overrides: Partial<Bey> = {}): Bey {
    return {
      id: overrides.id ?? 'r-' + Math.random(),
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/unit/labEngine.test.ts
```

Expected: margin tests fail (everything currently returns `'knapp'`); reasonKey tests fail (everything returns `'closer-stats'`).

- [ ] **Step 3: Implement margin bucketing + reasonKey resolution**

In `src/lib/labEngine.ts`, do TWO replacements:

**3a.** Replace the placeholder return block in `resolveBattle` (the lines starting with `// Margin + reasonKey are placeholders` through `};`) with the new resolution code below — but stop at the closing `};` of the return statement. Do NOT include a closing `}` for `resolveBattle` here.

**3b.** Then, AFTER `resolveBattle`'s closing `}`, add the `resolveReasonKey` helper function shown at the bottom of this code block.

The combined code (resolveBattle's body + the new helper):

```ts
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
```

**Note**: `reasonKey` semantics describe the outcome, not the matchup, so they read naturally in the recap card regardless of who won. Renderer copy maps each key to first-grader German (Task 16).

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/unit/labEngine.test.ts
```

Expected: all tests pass (3 margin + 3 reasonKey + 10 from earlier = 16 total).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/labEngine.test.ts src/lib/labEngine.ts
git commit -m "feat(lab): engine margin buckets + reasonKey resolution (TDD)"
```

---

### Task 6: Trainer roster + picking strategies

**Files:**
- Create: `src/data/labTrainers.ts`
- Create: `tests/unit/labTrainers.test.ts`

- [ ] **Step 1: Write the failing test for trainer picking**

Create `tests/unit/labTrainers.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/unit/labTrainers.test.ts
```

Expected: all tests fail with module-not-found.

- [ ] **Step 3: Implement the trainer roster**

Create `src/data/labTrainers.ts`:

```ts
// Hardcoded trainer roster for the Battle Lab. 5 fictional rivals, each with
// a distinct picking style. Picking happens at fight-start (not on tap),
// so the same trainer rolls a different bey each match. See spec section 6.

import type { Bey } from '../lib/types';

export interface LabTrainer {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  pick: (allBeys: Bey[]) => Bey;
}

function pickHighest(field: 'stat_attack' | 'stat_defense' | 'stat_stamina', beys: Bey[]): Bey {
  if (beys.length === 0) throw new Error('pickHighest: empty roster');
  return [...beys].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))[0];
}

function filterByType(type: Bey['type'], beys: Bey[]): Bey[] {
  return beys.filter((b) => b.type === type);
}

export const LAB_TRAINERS: LabTrainer[] = [
  {
    id: 'atk-koenig',
    name: 'Atk-König',
    emoji: '👑',
    flavor: 'Ich greife immer an. Komm her!',
    pick: (beys) => pickHighest('stat_attack', beys),
  },
  {
    id: 'def-mira',
    name: 'Defensiv-Mira',
    emoji: '🛡',
    flavor: 'Du kommst nicht durch.',
    pick: (beys) => pickHighest('stat_defense', beys),
  },
  {
    id: 'wild-karte',
    name: 'Wildkarte',
    emoji: '🎲',
    flavor: 'Wer weiß, was ich heute hab.',
    pick: (beys) => {
      if (beys.length === 0) throw new Error('Wildkarte: empty roster');
      return beys[Math.floor(Math.random() * beys.length)];
    },
  },
  {
    id: 'schnell-tim',
    name: 'Schnell-Tim',
    emoji: '⚡',
    flavor: 'Wir tanzen, dann kämpfen wir.',
    pick: (beys) => {
      // Prefer Attack-type with highest stamina (proxy for "fast attacker"
      // since the schema has no weight). Fall back to highest-stamina overall
      // if no Attack-types exist; final fallback to any bey.
      const attackers = filterByType('attack', beys);
      if (attackers.length > 0) return pickHighest('stat_stamina', attackers);
      if (beys.length > 0) return pickHighest('stat_stamina', beys);
      throw new Error('Schnell-Tim: empty roster');
    },
  },
  {
    id: 'schwer-pia',
    name: 'Schwer-Pia',
    emoji: '🪨',
    flavor: 'Ich bleibe stehen. Immer.',
    pick: (beys) => {
      // Stamina-type with highest stamina (proxy for "stays standing" since
      // the schema has no weight). Fall back to highest-stamina overall.
      const stayers = filterByType('stamina', beys);
      if (stayers.length > 0) return pickHighest('stat_stamina', stayers);
      if (beys.length > 0) return pickHighest('stat_stamina', beys);
      throw new Error('Schwer-Pia: empty roster');
    },
  },
];

export function getTrainer(id: string): LabTrainer {
  const t = LAB_TRAINERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown trainer: ${id}`);
  return t;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/unit/labTrainers.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/labTrainers.test.ts src/data/labTrainers.ts
git commit -m "feat(lab): trainer roster with TDD-verified picking strategies"
```

---

### Task 7: Zustand session store

**Files:**
- Create: `src/stores/lab-session.ts`

- [ ] **Step 1: Create the store**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/lab-session.ts
git commit -m "feat(lab): Zustand session store (picks, streak, settings)"
```

---

## Phase 2 — Routing + nav

### Task 8: Add `/lab` route + Lab tab to BottomNav

**Files:**
- Modify: `src/routes.tsx`
- Modify: `src/components/nav/BottomNav.tsx`
- Create: `src/components/lab/LabTab.tsx` (placeholder)

- [ ] **Step 1: Create a placeholder `LabTab` component**

Create `src/components/lab/LabTab.tsx`:

```tsx
// LabTab — Battle Lab home. Resting state shows two pickers + KAMPF STARTEN
// button. Will be fleshed out in Tasks 13-14. This placeholder lets us wire
// routing + nav without breaking other work.

export function LabTab() {
  return (
    <div className="bx" style={{ padding: '12px 18px 110px' }}>
      <div className="bx-eyebrow">BEYBLADE LAB</div>
      <div className="bx-display" style={{ fontSize: 26, marginTop: 8 }}>
        Teste deine Beys
      </div>
      <div style={{ marginTop: 24, color: 'var(--bx-mute)' }}>
        (placeholder — picker UI lands in Task 14)
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `/lab` route**

In `src/routes.tsx`, add the import and route. After the `import { HomePage }` line, add:

```ts
import { LabTab } from './components/lab/LabTab';
```

After the `/feed` route block (around line 74), insert:

```tsx
      <Route
        path="/lab"
        element={
          <KidRoute>
            <LabTab />
          </KidRoute>
        }
      />
```

- [ ] **Step 3: Add Lab tab to BottomNav and switch to 5-column grid**

In `src/components/nav/BottomNav.tsx`, replace the `TABS` array:

```ts
const TABS = [
  { to: '/', label: 'Heim', icon: '⌂' },
  { to: '/tower', label: 'Turm', icon: '▲' },
  { to: '/lab', label: 'Lab', icon: '⚗' },
  { to: '/profil', label: 'Karte', icon: '◆' },
  { to: '/feed', label: 'Feed', icon: '≡' },
];
```

And update the grid template (line 22):

```ts
        gridTemplateColumns: 'repeat(5, 1fr)',
```

- [ ] **Step 4: Verify in dev server**

```bash
npm run dev
```

Open http://localhost:5173 (logged-in kid session). Verify:
- 5 tabs visible at bottom
- Tapping `Lab` navigates to `/lab` and shows the placeholder
- Other tabs still work
- No layout shift on small phones (≥360px wide)

- [ ] **Step 5: Commit**

```bash
git add src/routes.tsx src/components/nav/BottomNav.tsx src/components/lab/LabTab.tsx
git commit -m "feat(lab): add /lab route + 5th nav tab with placeholder"
```

---

## Phase 3 — Pickers + state

### Task 9: `LabPickerBey` component

**Files:**
- Create: `src/components/lab/LabPickerBey.tsx`

- [ ] **Step 1: Implement the bey picker sheet**

```tsx
// LabPickerBey — bottom sheet for picking a bey. Reused for both MY BEY
// (kid's side) and the "Bey bestimmen" mode of the opponent picker. Shows
// stat bars + type emblem (spec Q9=D, section 5.2).

import { useMemo } from 'react';
import { useAllBeys, useKidBeys } from '../../hooks/useBeys';
import { useSession } from '../../stores/session';
import { useLabSession } from '../../stores/lab-session';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import type { Bey as DbBey } from '../../lib/types';

const TYPE_EMOJI: Record<NonNullable<DbBey['type']>, string> = {
  attack:  '⚔',
  defense: '🛡',
  stamina: '⏱',
  balance: '⚖',
};

interface Props {
  open: boolean;
  onPick: (beyId: string) => void;
  onClose: () => void;
}

export function LabPickerBey({ open, onPick, onClose }: Props) {
  const { kid } = useSession();
  const { data: allBeys = [] } = useAllBeys();
  const { data: ownedBeys = [] } = useKidBeys(kid?.id ?? null);
  const { beyFilter, setBeyFilter } = useLabSession();

  const beys = useMemo(
    () => (beyFilter === 'mine' && ownedBeys.length > 0 ? ownedBeys : allBeys),
    [beyFilter, ownedBeys, allBeys],
  );

  // If kid has no owned beys yet, hide the filter toggle entirely (always show all 46).
  const showFilter = ownedBeys.length > 0;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bey wählen"
      onClick={onClose}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bx-card"
        style={{
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="bx-eyebrow">Bey wählen</div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="bx-btn bx-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            Schließen
          </button>
        </div>

        {showFilter && (
          <div className="flex" style={{ gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => setBeyFilter('mine')}
              className={`bx-btn ${beyFilter === 'mine' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Meine Beys
            </button>
            <button
              onClick={() => setBeyFilter('all')}
              className={`bx-btn ${beyFilter === 'all' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Alle Beys
            </button>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {beys.map((b) => (
            <BeyPickCard key={b.id} bey={b} onPick={() => onPick(b.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BeyPickCard({ bey, onPick }: { bey: DbBey; onPick: () => void }) {
  const visual = beyVisualFromDb(bey);
  const emblem = bey.type ? TYPE_EMOJI[bey.type] : '';
  return (
    <button
      onClick={onPick}
      className="bx-card"
      style={{
        padding: 10,
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: 44,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex justify-center" style={{ marginBottom: 6 }}>
        <Bey bey={visual} size={48} spin />
      </div>
      <div
        className="bx-display truncate"
        style={{ fontSize: 11, lineHeight: 1.2, marginBottom: 4 }}
      >
        {bey.name_de ?? bey.name_en}
      </div>
      <StatBars bey={bey} />
      <div className="bx-mono" style={{ fontSize: 10, marginTop: 4, color: 'var(--bx-mute)' }}>
        {emblem}
      </div>
    </button>
  );
}

function StatBars({ bey }: { bey: DbBey }) {
  const stats: Array<['ATK' | 'DEF' | 'STA', number]> = [
    ['ATK', bey.stat_attack ?? 0],
    ['DEF', bey.stat_defense ?? 0],
    ['STA', bey.stat_stamina ?? 0],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {stats.map(([label, val]) => (
        <div key={label} className="flex items-center" style={{ gap: 4 }}>
          <div className="bx-mono" style={{ fontSize: 8, width: 22, color: 'var(--bx-mute)' }}>
            {label}
          </div>
          <div
            style={{
              flex: 1,
              height: 4,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, val)}%`,
                height: '100%',
                background: 'var(--bx-yellow)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/lab/LabPickerBey.tsx
git commit -m "feat(lab): bey picker sheet with stat bars + type emblem + filter"
```

---

### Task 10: `useCrewKidsWithPrimary` hook

**Files:**
- Create: `src/hooks/useCrewKidsWithPrimary.ts`

- [ ] **Step 1: Implement the hook**

```ts
// useCrewKidsWithPrimary — lists kids in the current kid's crew who have set
// a primary_bey_id. Used by the Lab opponent picker (Crew tab). Includes
// kids without primary in a separate field so the UI can show them faded.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../stores/session';
import type { Bey } from '../lib/types';

export interface CrewKidWithPrimary {
  id: string;
  display_name: string;
  primary_bey_id: string | null;
  primary_bey: Bey | null;
}

export function useCrewKidsWithPrimary() {
  const { kid } = useSession();
  return useQuery({
    queryKey: ['lab', 'crew-with-primary', kid?.id],
    queryFn: async (): Promise<CrewKidWithPrimary[]> => {
      if (!kid) return [];
      // For v1 the "crew" is "all kids" — there's no crew-membership table yet.
      // Once crews exist, filter here. Excludes the current kid (can't fight self).
      const { data, error } = await supabase
        .from('kids')
        .select('id, display_name, primary_bey_id')
        .neq('id', kid.id)
        .order('display_name');
      if (error) throw error;

      const rows = data ?? [];
      const withPrimaryIds = rows
        .map((r) => r.primary_bey_id)
        .filter((id): id is string => !!id);

      const beyMap = new Map<string, Bey>();
      if (withPrimaryIds.length > 0) {
        const { data: beys, error: beyErr } = await supabase
          .from('beys')
          .select('*')
          .in('id', withPrimaryIds);
        if (beyErr) throw beyErr;
        for (const b of beys ?? []) beyMap.set(b.id, b);
      }

      return rows.map((r) => ({
        id: r.id,
        display_name: r.display_name,
        primary_bey_id: r.primary_bey_id,
        primary_bey: r.primary_bey_id ? beyMap.get(r.primary_bey_id) ?? null : null,
      }));
    },
    enabled: !!kid,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCrewKidsWithPrimary.ts
git commit -m "feat(lab): hook for crew kids with primary_bey_id"
```

---

### Task 11: `LabPickerOpponent` component

**Files:**
- Create: `src/components/lab/LabPickerOpponent.tsx`

- [ ] **Step 1: Implement the opponent picker**

```tsx
// LabPickerOpponent — bottom sheet with two segments: Wild (5 trainer cards
// + Zufällig + "Bey bestimmen") and Crew (kids with a primary_bey_id set).
// Spec section 5.3.

import { useState } from 'react';
import { LAB_TRAINERS } from '../../data/labTrainers';
import { useCrewKidsWithPrimary } from '../../hooks/useCrewKidsWithPrimary';
import { LabPickerBey } from './LabPickerBey';
import type { OpponentKind } from '../../lib/labEngine';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';

interface Props {
  open: boolean;
  onPick: (k: OpponentKind, label: string) => void;
  onClose: () => void;
}

type Tab = 'wild' | 'crew';

export function LabPickerOpponent({ open, onPick, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('wild');
  const [chooseBeyOpen, setChooseBeyOpen] = useState(false);
  const { data: crew = [] } = useCrewKidsWithPrimary();

  if (!open) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gegner wählen"
        onClick={onClose}
        className="fixed inset-0 z-40 flex flex-col justify-end"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bx-card"
          style={{
            maxHeight: '80vh',
            overflowY: 'auto',
            borderRadius: '20px 20px 0 0',
            padding: '18px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="bx-eyebrow">Gegner wählen</div>
            <button
              onClick={onClose}
              aria-label="Schließen"
              className="bx-btn bx-btn-ghost"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              Schließen
            </button>
          </div>

          <div className="flex" style={{ gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => setTab('wild')}
              className={`bx-btn ${tab === 'wild' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Wild
            </button>
            <button
              onClick={() => setTab('crew')}
              className={`bx-btn ${tab === 'crew' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Crew
            </button>
          </div>

          {tab === 'wild' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {LAB_TRAINERS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onPick({ kind: 'trainer', trainerId: t.id }, t.name)}
                    className="bx-card"
                    style={{
                      minWidth: 140,
                      padding: 12,
                      textAlign: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{t.emoji}</div>
                    <div className="bx-display" style={{ fontSize: 13, marginTop: 4 }}>
                      {t.name}
                    </div>
                    <div className="bx-mono" style={{ fontSize: 9, marginTop: 6, color: 'var(--bx-mute)' }}>
                      „{t.flavor}"
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => onPick({ kind: 'wild' }, 'Zufällig')}
                className="bx-btn bx-btn-ghost"
                style={{ width: '100%', padding: '12px' }}
              >
                🎲 Komplett zufällig
              </button>

              <button
                onClick={() => setChooseBeyOpen(true)}
                className="bx-btn bx-btn-ghost"
                style={{ width: '100%', padding: '12px' }}
              >
                Bey bestimmen
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crew.length === 0 && (
                <div className="bx-mono" style={{ fontSize: 11, color: 'var(--bx-mute)', padding: 12 }}>
                  Keine Crew-Kids gefunden.
                </div>
              )}
              {crew.map((k) => {
                const hasPrimary = !!k.primary_bey;
                const visual = k.primary_bey ? beyVisualFromDb(k.primary_bey) : null;
                return (
                  <button
                    key={k.id}
                    disabled={!hasPrimary}
                    onClick={() =>
                      hasPrimary && onPick({ kind: 'crew', kidId: k.id }, k.display_name)
                    }
                    className="bx-card flex items-center"
                    style={{
                      padding: 10,
                      gap: 10,
                      cursor: hasPrimary ? 'pointer' : 'default',
                      opacity: hasPrimary ? 1 : 0.45,
                      textAlign: 'left',
                    }}
                  >
                    <Bey bey={visual} size={36} spin={hasPrimary} />
                    <div style={{ flex: 1 }}>
                      <div className="bx-display" style={{ fontSize: 13 }}>
                        {k.display_name}
                      </div>
                      <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)' }}>
                        {hasPrimary ? (k.primary_bey?.name_de ?? k.primary_bey?.name_en) : 'Kein Haupt-Bey gewählt'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LabPickerBey
        open={chooseBeyOpen}
        onPick={(beyId) => {
          // "Bey bestimmen" semantically becomes a wild fight against a specific bey.
          // We encode this by reusing the 'wild' kind and stashing the chosen id
          // in the calling component's draft (LabTab will track this). For the
          // engine's purposes a chosen wild bey is just a bey — see LabTab Task 14.
          onPick({ kind: 'wild' }, 'Bey gewählt');
          // The chosen beyId is conveyed back via the same callback path; LabTab
          // will read it via a separate prop in the next iteration. For v1
          // simplicity, we store it on window.__labChosenOppBey — this is replaced
          // with proper prop drilling in Task 14 (LabTab integration). Documented
          // as a temporary bridge.
          (window as unknown as { __labChosenOppBey?: string }).__labChosenOppBey = beyId;
          setChooseBeyOpen(false);
        }}
        onClose={() => setChooseBeyOpen(false)}
      />
    </>
  );
}
```

**Note**: the `window.__labChosenOppBey` bridge in Step 1 is intentionally a temporary hack. Task 14 (LabTab integration) replaces it with a proper `onPickSpecificBey` prop. Flagged with a code comment for the engineer not to leave it in place.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/lab/LabPickerOpponent.tsx
git commit -m "feat(lab): opponent picker (Wild trainers + Crew kids tabs)"
```

---

### Task 12: Refactor opponent picker to remove window-bridge hack

**Files:**
- Modify: `src/components/lab/LabPickerOpponent.tsx`

This task removes the temporary `window.__labChosenOppBey` bridge from Task 11 with a proper prop and a richer `OpponentKind` payload.

- [ ] **Step 1: Extend `OpponentKind` to support "wild specific bey"**

In `src/lib/labEngine.ts`, replace the `OpponentKind` definition:

```ts
export type OpponentKind =
  | { kind: 'wild'; beyId?: string }              // beyId set when "Bey bestimmen"
  | { kind: 'trainer'; trainerId: string }
  | { kind: 'crew'; kidId: string };
```

Verify `npm run build` still passes.

- [ ] **Step 2: Replace the window-bridge with a clean callback**

In `src/components/lab/LabPickerOpponent.tsx`, replace the `LabPickerBey` block at the bottom of the component with:

```tsx
      <LabPickerBey
        open={chooseBeyOpen}
        onPick={(beyId) => {
          onPick({ kind: 'wild', beyId }, 'Bey gewählt');
          setChooseBeyOpen(false);
        }}
        onClose={() => setChooseBeyOpen(false)}
      />
```

Remove the `window.__labChosenOppBey` line and its preceding comment block.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/labEngine.ts src/components/lab/LabPickerOpponent.tsx
git commit -m "refactor(lab): remove temp window bridge with OpponentKind beyId field"
```

---

## Phase 4 — Battle flow

### Task 13: `LabStreakChip` component

**Files:**
- Create: `src/components/lab/LabStreakChip.tsx`

- [ ] **Step 1: Implement the chip**

```tsx
// LabStreakChip — pill in the LabTab top-right showing the session streak.
// Rendered only when streakEnabled is true. Pulses on increment (skipped
// under prefers-reduced-motion).

import { useLabSession } from '../../stores/lab-session';

export function LabStreakChip() {
  const { streak, streakEnabled } = useLabSession();
  if (!streakEnabled || streak <= 0) return null;
  return (
    <div
      className="bx-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(253,224,71,0.12)',
        border: '1px solid rgba(253,224,71,0.4)',
        color: 'var(--bx-yellow)',
        fontSize: 11,
        letterSpacing: '0.12em',
      }}
      aria-label={`Streak: ${streak} Siege in Folge`}
    >
      🔥 {streak}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/lab/LabStreakChip.tsx
git commit -m "feat(lab): streak chip"
```

---

### Task 14: `LabTab` resting state + wiring

**Files:**
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Replace placeholder with full resting-state UI**

```tsx
// LabTab — Battle Lab home. Two pickers (MEIN BEY, GEGNER) + KAMPF STARTEN
// button. Manages picker open/close state and threads the kid's selections
// to LabBattleScreen (Task 15).
//
// Spec section 5.1.

import { useEffect, useState } from 'react';
import { useAllBeys } from '../../hooks/useBeys';
import { useLabSession } from '../../stores/lab-session';
import { useCrewKidsWithPrimary } from '../../hooks/useCrewKidsWithPrimary';
import { LAB_TRAINERS, getTrainer } from '../../data/labTrainers';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import { LabPickerBey } from './LabPickerBey';
import { LabPickerOpponent } from './LabPickerOpponent';
import { LabStreakChip } from './LabStreakChip';
import type { OpponentKind } from '../../lib/labEngine';
import type { Bey as DbBey } from '../../lib/types';

export function LabTab() {
  const { myBeyId, opponent, setMyBey, setOpponent, resetSession } = useLabSession();
  const { data: beys = [] } = useAllBeys();
  const { data: crew = [] } = useCrewKidsWithPrimary();
  const [pickMyOpen, setPickMyOpen] = useState(false);
  const [pickOppOpen, setPickOppOpen] = useState(false);
  const [opponentLabel, setOpponentLabel] = useState<string | null>(null);

  // Reset picks on tab leave (spec section 9 + 10).
  useEffect(() => {
    return () => resetSession();
  }, [resetSession]);

  const myBey = beys.find((b) => b.id === myBeyId) ?? null;
  const oppBey = resolveOpponentBey(opponent, beys, crew);
  const canStart = !!myBey && !!oppBey;

  function handleStart() {
    if (!canStart) return;
    // LabBattleScreen will be triggered via a Zustand "active battle" flag in Task 15.
    // For this task we just navigate visually; the actual choreography lands next.
    document.dispatchEvent(new CustomEvent('lab:start-battle'));
  }

  return (
    <div className="bx" style={{ padding: '12px 18px 110px' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="bx-eyebrow">BEYBLADE LAB</div>
          <div className="bx-display" style={{ fontSize: 26, marginTop: 4, lineHeight: 1 }}>
            Teste deine Beys
          </div>
        </div>
        <LabStreakChip />
      </div>

      <div
        className="grid items-center"
        style={{ gridTemplateColumns: '1fr auto 1fr', gap: 8, marginTop: 22 }}
      >
        <PickerSlot
          title="MEIN BEY"
          bey={myBey}
          onTap={() => setPickMyOpen(true)}
        />
        <div className="bx-display" style={{ fontSize: 28, color: 'var(--bx-mute-2)' }}>
          VS
        </div>
        <PickerSlot
          title="GEGNER"
          bey={oppBey}
          subtitle={opponentLabel ?? undefined}
          onTap={() => setPickOppOpen(true)}
        />
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        className="bx-btn bx-btn-crimson"
        style={{
          width: '100%',
          marginTop: 28,
          padding: 16,
          fontSize: 16,
          opacity: canStart ? 1 : 0.5,
          cursor: canStart ? 'pointer' : 'not-allowed',
        }}
      >
        ⚔ KAMPF STARTEN
      </button>

      <LabPickerBey
        open={pickMyOpen}
        onPick={(id) => {
          setMyBey(id);
          setPickMyOpen(false);
        }}
        onClose={() => setPickMyOpen(false)}
      />
      <LabPickerOpponent
        open={pickOppOpen}
        onPick={(k, label) => {
          setOpponent(k);
          setOpponentLabel(label);
          setPickOppOpen(false);
        }}
        onClose={() => setPickOppOpen(false)}
      />
    </div>
  );
}

function resolveOpponentBey(
  opp: OpponentKind | null,
  beys: DbBey[],
  crew: Array<{ id: string; primary_bey: DbBey | null }>,
): DbBey | null {
  if (!opp || beys.length === 0) return null;
  if (opp.kind === 'wild') {
    if (opp.beyId) return beys.find((b) => b.id === opp.beyId) ?? null;
    // For the resting-state preview we show "?". The actual random pick happens
    // at fight-start in LabBattleScreen (Task 15) so each Nochmal re-rolls.
    return null;
  }
  if (opp.kind === 'trainer') {
    // Preview: show a sample of what this trainer might pick.
    return getTrainer(opp.trainerId).pick(beys);
  }
  if (opp.kind === 'crew') {
    const k = crew.find((c) => c.id === opp.kidId);
    return k?.primary_bey ?? null;
  }
  return null;
}

function PickerSlot({
  title,
  bey,
  subtitle,
  onTap,
}: {
  title: string;
  bey: DbBey | null;
  subtitle?: string;
  onTap: () => void;
}) {
  const visual = beyVisualFromDb(bey);
  return (
    <button
      onClick={onTap}
      className="bx-card"
      style={{
        padding: 12,
        textAlign: 'center',
        minHeight: 120,
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)', letterSpacing: '0.12em' }}>
        {title}
      </div>
      <div className="flex justify-center" style={{ marginTop: 8, marginBottom: 8 }}>
        <Bey bey={visual} size={56} spin={!!bey} />
      </div>
      <div className="bx-display" style={{ fontSize: 12, lineHeight: 1.2 }}>
        {bey ? (bey.name_de ?? bey.name_en) : 'Tippe um zu wählen'}
      </div>
      {subtitle && (
        <div className="bx-mono" style={{ fontSize: 9, marginTop: 4, color: 'var(--bx-mute)' }}>
          {subtitle}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 3: Manually verify in dev server**

```bash
npm run dev
```

Open `/lab`. Verify:
- Both picker slots open their sheets on tap
- Picking a bey on each side enables KAMPF STARTEN
- Tab leave + return clears the picks (resetSession)
- Streak chip stays hidden (streakEnabled=false default)

- [ ] **Step 4: Commit**

```bash
git add src/components/lab/LabTab.tsx
git commit -m "feat(lab): tab resting state with both pickers + start button"
```

---

### Task 15: `LabBattleScreen` (engine + Motion choreography)

**Files:**
- Create: `src/components/lab/LabBattleScreen.tsx`
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Implement the battle screen**

```tsx
// LabBattleScreen — full-screen overlay. Calls labEngine.resolveBattle, then
// runs a Motion choreography keyed off the Outcome. Reduced-motion users get
// a static crossfade. On animation end, raises the recap card.
//
// Spec section 5.4.

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAllBeys } from '../../hooks/useBeys';
import { useCrewKidsWithPrimary } from '../../hooks/useCrewKidsWithPrimary';
import { useLabSession } from '../../stores/lab-session';
import { LAB_TRAINERS, getTrainer } from '../../data/labTrainers';
import { resolveBattle, type Outcome, type OpponentKind } from '../../lib/labEngine';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import type { Bey as DbBey } from '../../lib/types';

interface Props {
  myBeyId: string;
  opponent: OpponentKind;
  /** Called when choreography + recap finish. */
  onComplete: (outcome: Outcome, oppBey: DbBey) => void;
  /** Called when user taps "Anderes" or backs out. */
  onCancel: () => void;
}

export function LabBattleScreen({ myBeyId, opponent, onComplete, onCancel }: Props) {
  const { data: beys = [] } = useAllBeys();
  const { data: crew = [] } = useCrewKidsWithPrimary();
  const reducedMotion = useReducedMotion();
  const { recordWin, recordLoss, soundEnabled } = useLabSession();

  // Resolve opponent bey at mount time, using a fresh seed per fight.
  const seed = useMemo(() => Date.now() ^ Math.floor(Math.random() * 0xffff), []);

  const myBey = beys.find((b) => b.id === myBeyId) ?? null;
  const oppBey = useMemo<DbBey | null>(() => {
    if (beys.length === 0) return null;
    if (opponent.kind === 'wild') {
      if (opponent.beyId) return beys.find((b) => b.id === opponent.beyId) ?? null;
      return beys[Math.floor(Math.random() * beys.length)] ?? null;
    }
    if (opponent.kind === 'trainer') return getTrainer(opponent.trainerId).pick(beys);
    if (opponent.kind === 'crew') {
      const k = crew.find((c) => c.id === opponent.kidId);
      return k?.primary_bey ?? null;
    }
    return null;
  }, [beys, crew, opponent]);

  const outcome = useMemo<Outcome | null>(() => {
    if (!myBey || !oppBey) return null;
    return resolveBattle(myBey, oppBey, seed);
  }, [myBey, oppBey, seed]);

  const [phase, setPhase] = useState<'launch' | 'closing' | 'clash' | 'result' | 'done'>('launch');

  useEffect(() => {
    if (!outcome || !oppBey) return;
    if (reducedMotion) {
      // Compress to a 200ms crossfade.
      const t = setTimeout(() => {
        outcome.winner === 'me' ? recordWin() : recordLoss();
        onComplete(outcome, oppBey);
      }, 200);
      return () => clearTimeout(t);
    }
    const seq = [
      { p: 'launch' as const, ms: 300 },
      { p: 'closing' as const, ms: 1500 },
      { p: 'clash' as const, ms: 1800 }, // 3 beats × 600ms
      { p: 'result' as const, ms: 1200 },
    ];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    for (const s of seq) {
      acc += s.ms;
      timeouts.push(setTimeout(() => setPhase(s.p === 'launch' ? 'closing' : s.p === 'closing' ? 'clash' : s.p === 'clash' ? 'result' : 'done'), acc));
    }
    timeouts.push(setTimeout(() => {
      outcome.winner === 'me' ? recordWin() : recordLoss();
      onComplete(outcome, oppBey);
    }, acc + 200));
    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [outcome, oppBey, reducedMotion, recordWin, recordLoss, onComplete]);

  if (!myBey || !oppBey || !outcome) {
    return (
      <div className="bx fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--bx-ink)' }}>
        <div className="bx-mono" style={{ color: 'var(--bx-mute)' }}>Lade...</div>
      </div>
    );
  }

  const myVisual = beyVisualFromDb(myBey);
  const oppVisual = beyVisualFromDb(oppBey);
  const winnerIsMe = outcome.winner === 'me';

  // Position transforms per phase
  const myX = phase === 'launch' ? -80 : phase === 'closing' || phase === 'clash' ? -20 : winnerIsMe ? -20 : -20;
  const oppX = phase === 'launch' ? 80 : phase === 'closing' || phase === 'clash' ? 20 : winnerIsMe ? 20 : 20;
  const myDrop = phase === 'result' && !winnerIsMe ? 30 : 0;
  const oppDrop = phase === 'result' && winnerIsMe ? 30 : 0;
  const myRotate = phase === 'result' && !winnerIsMe ? 25 : 0;
  const oppRotate = phase === 'result' && winnerIsMe ? -25 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lab Kampf"
      className="bx fixed inset-0 z-50 flex flex-col items-center"
      style={{
        background: 'radial-gradient(120% 80% at 50% 30%, rgba(220,38,38,0.10), transparent 60%), var(--bx-ink)',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
      }}
      onClick={onCancel}
    >
      <div className="bx-eyebrow" style={{ marginTop: 12 }}>LAB · KAMPF</div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), transparent 70%)',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: myX, y: myDrop, rotate: myRotate }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%, -50%)' }}
          >
            <Bey bey={myVisual} size={96} spin={phase !== 'result' || winnerIsMe} />
          </motion.div>
          <motion.div
            animate={{ x: oppX, y: oppDrop, rotate: oppRotate }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '50%', right: '30%', transform: 'translate(50%, -50%)' }}
          >
            <Bey bey={oppVisual} size={96} spin={phase !== 'result' || !winnerIsMe} />
          </motion.div>

          {phase === 'clash' && (
            <motion.div
              initial={{ opacity: 0.8, scale: 0.4 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.6, repeat: 2 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(253,224,71,0.6), transparent 50%)',
              }}
            />
          )}

          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: winnerIsMe
                  ? 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.45), transparent 70%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(220,38,38,0.45), transparent 70%)',
              }}
            />
          )}
        </div>
      </div>

      <div className="bx-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        Tipp irgendwo zum Abbrechen
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire battle screen into LabTab**

In `src/components/lab/LabTab.tsx`, replace the `handleStart` placeholder + add overlay rendering. Replace this block:

```tsx
  function handleStart() {
    if (!canStart) return;
    document.dispatchEvent(new CustomEvent('lab:start-battle'));
  }
```

with:

```tsx
  const [activeBattle, setActiveBattle] = useState<{ myBeyId: string; opponent: OpponentKind } | null>(null);
  const [recap, setRecap] = useState<{ outcome: Outcome; oppBey: DbBey } | null>(null);
  // battleKey forces LabBattleScreen to remount on Nochmal so seed re-rolls.
  const [battleKey, setBattleKey] = useState(0);

  function handleStart() {
    if (!canStart || !myBeyId || !opponent) return;
    setActiveBattle({ myBeyId, opponent });
  }
```

Add these imports at the top:

```ts
import { LabBattleScreen } from './LabBattleScreen';
import type { Outcome } from '../../lib/labEngine';
```

And add the overlay JSX just before the closing `</div>` of the main return (after the picker components):

```tsx
      {activeBattle && !recap && (
        <LabBattleScreen
          key={battleKey}
          myBeyId={activeBattle.myBeyId}
          opponent={activeBattle.opponent}
          onComplete={(o, oppBey) => setRecap({ outcome: o, oppBey })}
          onCancel={() => setActiveBattle(null)}
        />
      )}
```

(Recap rendering lands in Task 16.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 4: Manually verify in dev server**

```bash
npm run dev
```

Open `/lab`. Pick a bey on each side. Tap KAMPF STARTEN. Verify:
- Battle screen appears full-screen
- Beys slide in, drift toward center, clash with yellow flash bursts (3 of them), result tints green or red
- Tap-to-cancel still works (returns to LabTab)
- After ~6-7s the screen stays on `result` until recap is wired (Task 16)
- Trigger reduced-motion (DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce). Verify the choreography collapses to a 200ms crossfade.

- [ ] **Step 5: Commit**

```bash
git add src/components/lab/LabBattleScreen.tsx src/components/lab/LabTab.tsx
git commit -m "feat(lab): battle screen with Motion choreography + reduced-motion path"
```

---

### Task 16: `LabRecapCard` + integration

**Files:**
- Create: `src/components/lab/LabRecapCard.tsx`
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Implement the recap card**

```tsx
// LabRecapCard — slides up after the battle screen finishes. Margin word in
// stencil, type-chart trio (tinted), reason copy keyed off Outcome.reasonKey,
// odds bar, and Nochmal/Anderes buttons. Spec section 5.5.

import { motion, useReducedMotion } from 'motion/react';
import type { Outcome, ReasonKey } from '../../lib/labEngine';
import type { Bey as DbBey } from '../../lib/types';

const REASON_COPY: Record<ReasonKey, string> = {
  'atk-cracks-def': 'Dein Angriff hat ihre Verteidigung geknackt.',
  'def-walls-atk': 'Deine Verteidigung hat alles gehalten.',
  'sta-outlasts-sta': 'Du hast länger gespinnt.',
  'atk-beats-sta': 'Dein Atk hat ihre Stamina zerlegt.',
  'sta-beats-def': 'Deine Stamina hat ihre Verteidigung überdauert.',
  'def-beats-atk': 'Deine Defense hat ihren Angriff abgeblockt.',
  'closer-stats': 'War echt knapp!',
  'upset': 'Pures Glück! Sie waren stärker, du hast trotzdem gewonnen.',
};

const REASON_COPY_LOSS: Record<ReasonKey, string> = {
  'atk-cracks-def': 'Ihr Angriff war zu stark.',
  'def-walls-atk': 'Ihre Verteidigung war zu fest.',
  'sta-outlasts-sta': 'Sie hat länger gespinnt.',
  'atk-beats-sta': 'Ihr Atk hat deine Stamina zerlegt.',
  'sta-beats-def': 'Ihre Stamina hat deine Verteidigung überdauert.',
  'def-beats-atk': 'Ihre Defense hat deinen Angriff abgeblockt.',
  'closer-stats': 'War echt knapp!',
  'upset': 'Pech! Du warst eigentlich stärker.',
};

const MARGIN_WORD = {
  knapp: 'KNAPP',
  klar: 'KLAR',
  zerstoert: 'ZERSTÖRT',
} as const;

interface Props {
  outcome: Outcome;
  myBey: DbBey;
  oppBey: DbBey;
  onAgain: () => void;
  onOther: () => void;
}

export function LabRecapCard({ outcome, myBey, oppBey, onAgain, onOther }: Props) {
  const reducedMotion = useReducedMotion();
  const winnerIsMe = outcome.winner === 'me';
  const copy = winnerIsMe ? REASON_COPY[outcome.reasonKey] : REASON_COPY_LOSS[outcome.reasonKey];
  const marginWord = MARGIN_WORD[outcome.margin];

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0.5 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.2 : 0.4, ease: 'easeOut' }}
      className="bx fixed bottom-0 left-0 right-0 z-[60]"
      style={{
        background: 'var(--bx-ink)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
      }}
    >
      <div
        className="bx-display"
        style={{
          fontSize: 36,
          textAlign: 'center',
          color: winnerIsMe ? '#22c55e' : 'var(--bx-crimson)',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        {winnerIsMe ? marginWord + ' GEWONNEN' : marginWord + ' VERLOREN'}
      </div>

      <TypeTrio myType={myBey.type} oppType={oppBey.type} winnerIsMe={winnerIsMe} />

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'center',
        }}
      >
        {copy}
      </div>

      <OddsBar myOdds={outcome.myOdds} winnerIsMe={winnerIsMe} />

      <div className="flex" style={{ gap: 8, marginTop: 18 }}>
        <button
          onClick={onOther}
          className="bx-btn bx-btn-ghost"
          style={{ flex: 1, padding: 14, fontSize: 14 }}
        >
          Anderes
        </button>
        <button
          onClick={onAgain}
          className="bx-btn bx-btn-crimson"
          style={{ flex: 1, padding: 14, fontSize: 14 }}
        >
          Nochmal
        </button>
      </div>
    </motion.div>
  );
}

function TypeTrio({ myType, oppType, winnerIsMe }: { myType: DbBey['type']; oppType: DbBey['type']; winnerIsMe: boolean }) {
  const TYPE_EMOJI: Record<NonNullable<DbBey['type']>, string> = {
    attack: '⚔', defense: '🛡', stamina: '⏱', balance: '⚖',
  };
  const me = myType ? TYPE_EMOJI[myType] : '?';
  const opp = oppType ? TYPE_EMOJI[oppType] : '?';

  // Tint: green if matchup favored the winner of this fight, red if not, grey if mirror/balance.
  const TYPE_BEATS = { attack: 'stamina', stamina: 'defense', defense: 'attack' } as const;
  let arrowColor = 'rgba(255,255,255,0.4)';
  if (myType && oppType && myType !== 'balance' && oppType !== 'balance') {
    const myBeats = TYPE_BEATS[myType as 'attack' | 'defense' | 'stamina'] === oppType;
    const oppBeats = TYPE_BEATS[oppType as 'attack' | 'defense' | 'stamina'] === myType;
    if (myBeats && winnerIsMe) arrowColor = '#22c55e';
    else if (oppBeats && !winnerIsMe) arrowColor = '#22c55e';
    else if (myBeats && !winnerIsMe) arrowColor = 'var(--bx-crimson)';
    else if (oppBeats && winnerIsMe) arrowColor = 'var(--bx-crimson)';
  }

  return (
    <div className="flex items-center justify-center" style={{ gap: 12, marginTop: 12, fontSize: 24 }}>
      <span>{me}</span>
      <span style={{ color: arrowColor, fontSize: 18 }}>➤</span>
      <span>{opp}</span>
    </div>
  );
}

function OddsBar({ myOdds, winnerIsMe }: { myOdds: number; winnerIsMe: boolean }) {
  const pct = Math.round(myOdds * 100);
  return (
    <div style={{ marginTop: 14 }}>
      <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)', marginBottom: 4 }}>
        DEINE CHANCEN VOR DEM KAMPF: {pct}%
      </div>
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: winnerIsMe ? '#22c55e' : 'var(--bx-crimson)',
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire recap into `LabTab`**

In `src/components/lab/LabTab.tsx`, add the import at the top:

```ts
import { LabRecapCard } from './LabRecapCard';
```

After the existing `<LabBattleScreen ... />` block, add:

```tsx
      {recap && activeBattle && myBey && (
        <LabRecapCard
          outcome={recap.outcome}
          myBey={myBey}
          oppBey={recap.oppBey}
          onAgain={() => {
            setRecap(null);
            // Force LabBattleScreen to remount (fresh seed) by bumping the key.
            setBattleKey((k) => k + 1);
          }}
          onOther={() => {
            setRecap(null);
            setActiveBattle(null);
            // Clear opponent only (keep MEIN BEY) per spec section 5.5.
            useLabSession.getState().clearOpponent();
            setOpponentLabel(null);
          }}
        />
      )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 4: Manually verify in dev server**

Run `/lab`, pick beys, tap KAMPF STARTEN. Verify:
- After choreography, recap slides up from bottom
- Margin word + reason copy + odds bar all show
- Type trio is colored green when the winning side had the type advantage
- "Nochmal" replays with same picks (different seed → potentially different outcome)
- "Anderes" closes the battle screen and reopens GEGNER picker

- [ ] **Step 5: Commit**

```bash
git add src/components/lab/LabRecapCard.tsx src/components/lab/LabTab.tsx
git commit -m "feat(lab): recap card with margin, reason copy, odds bar, type trio"
```

---

## Phase 5 — Polish

### Task 17: `PrimaryBeySetter` in ProfilePage

**Files:**
- Create: `src/components/profile/PrimaryBeySetter.tsx`
- Modify: `src/pages/ProfilePage.tsx`

- [ ] **Step 1: Implement the setter**

```tsx
// PrimaryBeySetter — UI that sets/unsets the kid's `primary_bey_id`. Used in
// the Beys tab (ProfilePage). The currently-set bey shows a ⭐ badge in the
// collection grid; tapping the setter button toggles it. Spec section 5.6.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../stores/session';
import type { Bey } from '../../lib/types';

interface Props {
  bey: Bey;
  /** True if this bey is currently the kid's primary. Drives copy + visual. */
  isPrimary: boolean;
}

export function PrimaryBeySetter({ bey, isPrimary }: Props) {
  const { kid } = useSession();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (next: string | null) => {
      if (!kid) throw new Error('not logged in');
      const { error } = await supabase
        .from('kids')
        .update({ primary_bey_id: next })
        .eq('id', kid.id)
        .select('id');
      if (error) throw error;
    },
    onSuccess: (_, next) => {
      qc.invalidateQueries({ queryKey: ['kid', kid?.id] });
      qc.invalidateQueries({ queryKey: ['lab', 'crew-with-primary'] });
      setToast(next === null ? 'Haupt-Bey entfernt' : 'Haupt-Bey gesetzt');
      setTimeout(() => setToast(null), 1800);
    },
  });

  const onClick = () => {
    if (mutation.isPending) return;
    mutation.mutate(isPrimary ? null : bey.id);
  };

  return (
    <>
      <button
        onClick={onClick}
        disabled={mutation.isPending}
        className={`bx-btn ${isPrimary ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
        style={{ padding: '8px 12px', fontSize: 12, opacity: mutation.isPending ? 0.6 : 1 }}
      >
        {isPrimary ? '⭐ Haupt-Bey' : 'Als Haupt-Bey setzen'}
      </button>
      {toast && (
        <div
          role="status"
          className="bx-mono"
          style={{
            position: 'fixed',
            bottom: 'max(110px, calc(env(safe-area-inset-bottom) + 90px))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(34,197,94,0.18)',
            border: '1px solid rgba(34,197,94,0.5)',
            color: '#22c55e',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 11,
            letterSpacing: '0.1em',
            zIndex: 70,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Wire into ProfilePage**

Read `src/pages/ProfilePage.tsx` to find where the bey collection grid renders. Then for each owned bey card, add the `PrimaryBeySetter` button + a ⭐ badge if `me.primary_bey_id === bey.id`.

Add this import at the top of `ProfilePage.tsx`:

```ts
import { PrimaryBeySetter } from '../components/profile/PrimaryBeySetter';
```

In the bey card render (look for the grid that maps `ownedBeys` or similar), add inside each card:

```tsx
{me.primary_bey_id === bey.id && (
  <div
    style={{
      position: 'absolute',
      top: 6,
      right: 6,
      fontSize: 14,
      filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.8))',
    }}
    aria-label="Haupt-Bey"
  >
    ⭐
  </div>
)}
<PrimaryBeySetter bey={bey} isPrimary={me.primary_bey_id === bey.id} />
```

(The exact placement depends on the existing card markup. The ⭐ badge needs `position: relative` on the parent card.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 4: Manually verify**

```bash
npm run dev
```

Open Karte tab. Tap a bey. Verify:
- "Als Haupt-Bey setzen" button appears
- Tapping it shows the toast "Haupt-Bey gesetzt"
- The bey card now shows a ⭐ badge
- Returning to the Lab tab → opening Crew opponent tab → another kid sees this kid's primary properly (test from a second kid session)

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/PrimaryBeySetter.tsx src/pages/ProfilePage.tsx
git commit -m "feat(lab): primary bey setter + star badge in Karte tab"
```

---

### Task 18: `LabPrimaryNudgeBanner`

**Files:**
- Create: `src/components/lab/LabPrimaryNudgeBanner.tsx`
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Implement the banner**

```tsx
// LabPrimaryNudgeBanner — one-time nudge if the kid hasn't set primary_bey_id.
// Prompts them to set it so crew kids can fight against them. Dismissable via
// X button (localStorage flag).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentKid } from '../../hooks/useKid';

const STORAGE_KEY = 'beyarena.lab.primarySetNudgeDismissed';

export function LabPrimaryNudgeBanner() {
  const { data: me } = useCurrentKid();
  const nav = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  // Don't render if: not loaded yet, primary already set, or dismissed.
  if (!me || me.primary_bey_id || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        marginBottom: 14,
        padding: 12,
        background: 'rgba(37,99,235,0.10)',
        border: '1px solid rgba(37,99,235,0.30)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 18 }}>💡</div>
      <button
        onClick={() => nav('/profil')}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1.45,
          padding: 0,
        }}
      >
        Setz deinen Haupt-Bey im Karte-Tab — dann können deine Freunde gegen dich kämpfen.
      </button>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, '1');
          setDismissed(true);
        }}
        aria-label="Nicht mehr zeigen"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontSize: 14,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Render banner in LabTab**

In `src/components/lab/LabTab.tsx`, add the import:

```ts
import { LabPrimaryNudgeBanner } from './LabPrimaryNudgeBanner';
```

Render `<LabPrimaryNudgeBanner />` immediately after the title eyebrow + display block, before the picker grid:

```tsx
      <LabPrimaryNudgeBanner />
```

- [ ] **Step 3: Verify in dev server**

Open `/lab` for a kid without `primary_bey_id` set. Verify banner appears. Tap text → routes to `/profil`. Tap ✕ → banner disappears + doesn't return on reload.

- [ ] **Step 4: Commit**

```bash
git add src/components/lab/LabPrimaryNudgeBanner.tsx src/components/lab/LabTab.tsx
git commit -m "feat(lab): primary-bey nudge banner with dismissal"
```

---

### Task 19: `LabFTUE` first-time walkthrough

**Files:**
- Create: `src/components/lab/LabFTUE.tsx`
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Implement the FTUE**

```tsx
// LabFTUE — 3-frame walkthrough on first Lab open. Swipeable; "Überspringen"
// link top-right. Sets localStorage flag on dismiss. Spec section 5.7.

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STORAGE_KEY = 'beyarena.lab.ftueDone';

const FRAMES = [
  { title: 'Wähle deinen Bey', sub: 'Tippe links auf den Slot.', emoji: '🎯' },
  { title: 'Wähle deinen Gegner', sub: 'Wild oder ein Crew-Freund.', emoji: '⚔' },
  { title: 'Schau zu — wer gewinnt?', sub: 'Animation, Recap, Nochmal.', emoji: '🏁' },
];

interface Props {
  onComplete: () => void;
}

export function LabFTUE({ onComplete }: Props) {
  const [frame, setFrame] = useState(0);
  const reducedMotion = useReducedMotion();

  function next() {
    if (frame < FRAMES.length - 1) {
      setFrame(frame + 1);
    } else {
      finish();
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete();
  }

  const f = FRAMES[frame];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={f.title}
      className="bx fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{ background: 'var(--bx-ink)', cursor: 'pointer' }}
      onClick={next}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        className="bx-mono"
        style={{
          position: 'absolute',
          top: 'max(20px, env(safe-area-inset-top))',
          right: 18,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Überspringen
      </button>

      <motion.div
        key={frame}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3 }}
        style={{ textAlign: 'center', padding: 24, maxWidth: 320 }}
      >
        <div style={{ fontSize: 72, marginBottom: 18 }}>{f.emoji}</div>
        <div className="bx-display" style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 12 }}>
          {f.title}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{f.sub}</div>
      </motion.div>

      <div
        style={{
          position: 'absolute',
          bottom: 'max(40px, calc(env(safe-area-inset-bottom) + 24px))',
          display: 'flex',
          gap: 6,
        }}
      >
        {FRAMES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === frame ? 'var(--bx-yellow)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function isFtueDone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function resetFtue(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 2: Render FTUE in LabTab**

In `src/components/lab/LabTab.tsx`, add imports:

```ts
import { LabFTUE, isFtueDone } from './LabFTUE';
```

Add a state hook near the other useStates:

```ts
const [showFtue, setShowFtue] = useState(() => !isFtueDone());
```

Render at the top of the JSX (before the eyebrow):

```tsx
{showFtue && <LabFTUE onComplete={() => setShowFtue(false)} />}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Clear `localStorage.beyarena.lab.ftueDone`. Open `/lab`. Verify:
- 3 frames swipe through on tap
- "Überspringen" closes immediately
- Reopening Lab does NOT show the FTUE again
- Reduced-motion: frame transitions are instant fades

- [ ] **Step 4: Commit**

```bash
git add src/components/lab/LabFTUE.tsx src/components/lab/LabTab.tsx
git commit -m "feat(lab): first-time-user 3-frame walkthrough"
```

---

### Task 20: `LabSettingsSheet` (gear icon)

**Files:**
- Create: `src/components/lab/LabSettingsSheet.tsx`
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Implement the settings sheet**

```tsx
// LabSettingsSheet — gear icon in LabTab top-right opens this. Toggles for
// streak, sound, and a "FTUE nochmal zeigen" link (mostly QA). Spec section 5.8.

import { useLabSession } from '../../stores/lab-session';
import { resetFtue } from './LabFTUE';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LabSettingsSheet({ open, onClose }: Props) {
  const { streakEnabled, soundEnabled, setStreakEnabled, setSoundEnabled } = useLabSession();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lab Einstellungen"
      onClick={onClose}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bx-card"
        style={{
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="bx-eyebrow">Einstellungen</div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="bx-btn bx-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            Schließen
          </button>
        </div>

        <Toggle label="Streak-Zähler" value={streakEnabled} onChange={setStreakEnabled} />
        <Toggle label="Sound" value={soundEnabled} onChange={setSoundEnabled} />

        <button
          onClick={() => {
            resetFtue();
            onClose();
            // Force a reload so LabTab remounts and shows FTUE again.
            window.location.reload();
          }}
          className="bx-btn bx-btn-ghost"
          style={{ width: '100%', padding: 12, fontSize: 12, marginTop: 12 }}
        >
          Erste-Schritte nochmal zeigen
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between"
      style={{
        width: '100%',
        padding: '12px 0',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{label}</span>
      <span
        className="bx-mono"
        style={{
          fontSize: 11,
          color: value ? 'var(--bx-yellow)' : 'var(--bx-mute)',
          letterSpacing: '0.16em',
        }}
      >
        {value ? 'AN' : 'AUS'}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Wire into LabTab**

In `src/components/lab/LabTab.tsx`, add import:

```ts
import { LabSettingsSheet } from './LabSettingsSheet';
```

Add state:

```ts
const [settingsOpen, setSettingsOpen] = useState(false);
```

Update the top-right block (where `<LabStreakChip />` is) to:

```tsx
        <div className="flex items-center" style={{ gap: 8 }}>
          <LabStreakChip />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Einstellungen"
            className="bx-btn bx-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 14, lineHeight: 1 }}
          >
            ⚙
          </button>
        </div>
```

Render the sheet at the bottom of the return (alongside the other sheets):

```tsx
      <LabSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Open `/lab`. Tap ⚙. Verify:
- Sheet opens with both toggles + reset link
- Toggling streak shows the chip after a win
- Toggling sound is wired (sound implementation lands in Task 21; toggle persists across reloads via the existing partialize config)
- "Erste-Schritte nochmal zeigen" reopens the FTUE

- [ ] **Step 4: Commit**

```bash
git add src/components/lab/LabSettingsSheet.tsx src/components/lab/LabTab.tsx
git commit -m "feat(lab): settings sheet with streak/sound toggles + ftue reset"
```

---

### Task 21: Sound system + assets

**Files:**
- Create: `src/lib/labSound.ts`
- Create: `public/sounds/lab/CREDITS.md`
- Add: `public/sounds/lab/launch.mp3`
- Add: `public/sounds/lab/clash.mp3`
- Add: `public/sounds/lab/fanfare.mp3`
- Modify: `src/components/lab/LabBattleScreen.tsx`
- Modify: `src/components/lab/LabTab.tsx`

- [ ] **Step 1: Implement the sound utility**

```ts
// src/lib/labSound.ts
// Tiny audio helper for the Battle Lab. HTMLAudioElements are cached + replayed
// from start on each call. No-ops gracefully if files are missing or the user
// has muted via Lab settings. Designed to fail silently — if a kid plays in a
// browser that blocks autoplay, the lack of sound is acceptable degradation.
//
// Default state is muted (see lab-session store). This file does not check
// the mute toggle itself; callers (LabBattleScreen, LabTab) gate before
// invoking play().

const cache = new Map<string, HTMLAudioElement>();

function get(name: 'launch' | 'clash' | 'fanfare'): HTMLAudioElement | null {
  try {
    let el = cache.get(name);
    if (!el) {
      el = new Audio(`/sounds/lab/${name}.mp3`);
      el.preload = 'auto';
      cache.set(name, el);
    }
    return el;
  } catch {
    return null;
  }
}

export function playLab(name: 'launch' | 'clash' | 'fanfare'): void {
  const el = get(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay blocked; silently fail */
    });
  } catch {
    /* element constructor may have failed; silently fail */
  }
}
```

- [ ] **Step 2: Source three CC0 audio clips**

Visit https://freesound.org and find:
- A short tick / launch sound (~150ms): search "click click", filter CC0
- A clash / impact sound (~200ms): search "metal impact short", filter CC0
- A short win fanfare (~800ms): search "fanfare short", filter CC0

Download each, rename:
- `launch.mp3`
- `clash.mp3`
- `fanfare.mp3`

Place them at `public/sounds/lab/`.

Create `public/sounds/lab/CREDITS.md` with:

```markdown
# Battle Lab sound credits

All clips licensed CC0 (public domain) from freesound.org.

| File | Source URL | Author |
|---|---|---|
| launch.mp3 | https://freesound.org/people/[fill in]/sounds/[id]/ | [fill in] |
| clash.mp3 | https://freesound.org/people/[fill in]/sounds/[id]/ | [fill in] |
| fanfare.mp3 | https://freesound.org/people/[fill in]/sounds/[id]/ | [fill in] |

If sourcing slips, the Lab ships without sound — `labSound.playLab()` fails
silently when files are missing.
```

Fill in the actual URLs + authors as you source them.

- [ ] **Step 3: Wire sound into LabBattleScreen**

In `src/components/lab/LabBattleScreen.tsx`, add import at top:

```ts
import { playLab } from '../../lib/labSound';
```

Inside the existing `useEffect` that runs the choreography, replace the inner non-reduced-motion block to play sounds at each phase. Replace:

```ts
    const seq = [
      { p: 'launch' as const, ms: 300 },
      { p: 'closing' as const, ms: 1500 },
      { p: 'clash' as const, ms: 1800 },
      { p: 'result' as const, ms: 1200 },
    ];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    for (const s of seq) {
      acc += s.ms;
      timeouts.push(setTimeout(() => setPhase(s.p === 'launch' ? 'closing' : s.p === 'closing' ? 'clash' : s.p === 'clash' ? 'result' : 'done'), acc));
    }
```

with:

```ts
    if (soundEnabled) playLab('launch');
    const seq = [
      { p: 'launch' as const, ms: 300 },
      { p: 'closing' as const, ms: 1500 },
      { p: 'clash' as const, ms: 1800 },
      { p: 'result' as const, ms: 1200 },
    ];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    for (const s of seq) {
      acc += s.ms;
      timeouts.push(setTimeout(() => {
        if (s.p === 'closing') {
          setPhase('clash');
          // 3 clash beats spaced 600ms apart
          if (soundEnabled) {
            playLab('clash');
            setTimeout(() => playLab('clash'), 600);
            setTimeout(() => playLab('clash'), 1200);
          }
        } else if (s.p === 'clash') {
          setPhase('result');
          if (soundEnabled && outcome.winner === 'me') playLab('fanfare');
        }
      }, acc));
    }
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Open `/lab`. In settings, toggle Sound on. Run a battle. Verify:
- Launch tick on tap
- Clash sound 3× during the clash phase
- Fanfare on win only (no fanfare on loss)
- With sound off (default), entire battle is silent
- Browsers that block autoplay don't error

- [ ] **Step 5: Commit (split into asset + code)**

```bash
git add public/sounds/lab/launch.mp3 public/sounds/lab/clash.mp3 public/sounds/lab/fanfare.mp3 public/sounds/lab/CREDITS.md
git commit -m "feat(lab): add CC0 sound assets (launch/clash/fanfare) + credits"
git add src/lib/labSound.ts src/components/lab/LabBattleScreen.tsx
git commit -m "feat(lab): play sound at battle phases when enabled"
```

---

### Task 22: Haptics

**Files:**
- Create: `src/lib/labHaptics.ts`
- Modify: `src/components/lab/LabTab.tsx`
- Modify: `src/components/lab/LabBattleScreen.tsx`

- [ ] **Step 1: Implement the haptics utility**

```ts
// src/lib/labHaptics.ts
// navigator.vibrate wrapper. Mirrors the safety net in LogBattleConfirm.tsx —
// guarded with try/catch + typeof check; iOS Safari 16.4+ + most Android honor
// it; everything else silently no-ops.

export function vibrate(ms: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    /* not all browsers honor this; non-essential */
  }
}
```

- [ ] **Step 2: Add haptic on KAMPF STARTEN**

In `src/components/lab/LabTab.tsx`, add import:

```ts
import { vibrate } from '../../lib/labHaptics';
```

In `handleStart`, before `setActiveBattle`:

```ts
    vibrate(15);
```

- [ ] **Step 3: Add haptic on each clash beat + win**

In `src/components/lab/LabBattleScreen.tsx`, add import:

```ts
import { vibrate } from '../../lib/labHaptics';
```

Inside the choreography effect's `clash` phase block, after the sound calls:

```ts
        } else if (s.p === 'clash') {
          setPhase('result');
          vibrate(8);
          setTimeout(() => vibrate(8), 600);
          setTimeout(() => vibrate(8), 1200);
          if (soundEnabled && outcome.winner === 'me') playLab('fanfare');
          if (outcome.winner === 'me') {
            setTimeout(() => vibrate(25), 1400);
          }
        }
```

- [ ] **Step 4: Verify on a phone via LAN**

```bash
npm run dev
```

(Read the LAN URL from the output, e.g., `http://192.168.x.x:5173`.) Open on iPhone or Android. Run a battle. Verify the phone vibrates on launch + clashes + win.

- [ ] **Step 5: Commit**

```bash
git add src/lib/labHaptics.ts src/components/lab/LabTab.tsx src/components/lab/LabBattleScreen.tsx
git commit -m "feat(lab): haptics on launch, clash beats, and win"
```

---

### Task 23: "Heute besiegt" trainer badges

**Files:**
- Create: `src/lib/labTrainerBadges.ts`
- Modify: `src/components/lab/LabBattleScreen.tsx`
- Modify: `src/components/lab/LabPickerOpponent.tsx`

Tracks which trainers a kid has beaten today. Resets at midnight (filtered on read; old entries garbage-collected). Spec section 6.1.

- [ ] **Step 1: Implement the badge utility**

```ts
// src/lib/labTrainerBadges.ts
// Per-device, day-scoped record of which Lab trainers the kid has beaten
// today. Resets implicitly: on read we filter to today's date, and entries
// from earlier days are cleaned up. localStorage only — no DB.

const STORAGE_KEY = 'beyarena.lab.trainersBeatenToday';

function todayKey(): string {
  // YYYY-MM-DD in local time. Avoids UTC midnight surprise for late-evening play.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    // Garbage-collect: drop entries not from today.
    const today = todayKey();
    const filtered: Record<string, string> = {};
    for (const [id, date] of Object.entries(parsed)) {
      if (date === today) filtered[id] = date;
    }
    return filtered;
  } catch {
    return {};
  }
}

function write(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or private mode; non-essential */
  }
}

export function markTrainerBeaten(trainerId: string): void {
  const map = read();
  map[trainerId] = todayKey();
  write(map);
}

export function getTrainersBeatenToday(): Set<string> {
  return new Set(Object.keys(read()));
}
```

- [ ] **Step 2: Mark on win in LabBattleScreen**

In `src/components/lab/LabBattleScreen.tsx`, add import:

```ts
import { markTrainerBeaten } from '../../lib/labTrainerBadges';
```

In the `useEffect` that handles outcome, inside the win branch (where `recordWin()` is called), add a trainer-mark line. Find this in the non-reduced-motion path:

```ts
    timeouts.push(setTimeout(() => {
      outcome.winner === 'me' ? recordWin() : recordLoss();
      onComplete(outcome, oppBey);
    }, acc + 200));
```

and replace with:

```ts
    timeouts.push(setTimeout(() => {
      if (outcome.winner === 'me') {
        recordWin();
        if (opponent.kind === 'trainer') markTrainerBeaten(opponent.trainerId);
      } else {
        recordLoss();
      }
      onComplete(outcome, oppBey);
    }, acc + 200));
```

Also update the reduced-motion branch:

```ts
    if (reducedMotion) {
      const t = setTimeout(() => {
        if (outcome.winner === 'me') {
          recordWin();
          if (opponent.kind === 'trainer') markTrainerBeaten(opponent.trainerId);
        } else {
          recordLoss();
        }
        onComplete(outcome, oppBey);
      }, 200);
      return () => clearTimeout(t);
    }
```

- [ ] **Step 3: Render badge on trainer cards in LabPickerOpponent**

In `src/components/lab/LabPickerOpponent.tsx`, add import:

```ts
import { getTrainersBeatenToday } from '../../lib/labTrainerBadges';
```

Inside the `LabPickerOpponent` component, add at the top:

```tsx
  const beaten = open ? getTrainersBeatenToday() : new Set<string>();
```

(Recompute only when sheet opens; localStorage read is cheap.)

In the trainer card render block, find:

```tsx
{LAB_TRAINERS.map((t) => (
  <button
    key={t.id}
    onClick={() => onPick({ kind: 'trainer', trainerId: t.id }, t.name)}
    className="bx-card"
    style={{
      minWidth: 140,
      padding: 12,
      textAlign: 'center',
      cursor: 'pointer',
      flexShrink: 0,
    }}
  >
    <div style={{ fontSize: 28 }}>{t.emoji}</div>
    <div className="bx-display" style={{ fontSize: 13, marginTop: 4 }}>
      {t.name}
    </div>
    <div className="bx-mono" style={{ fontSize: 9, marginTop: 6, color: 'var(--bx-mute)' }}>
      „{t.flavor}"
    </div>
  </button>
))}
```

and replace the inner card content with:

```tsx
{LAB_TRAINERS.map((t) => {
  const isBeaten = beaten.has(t.id);
  return (
    <button
      key={t.id}
      onClick={() => onPick({ kind: 'trainer', trainerId: t.id }, t.name)}
      className="bx-card"
      style={{
        minWidth: 140,
        padding: 12,
        textAlign: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {isBeaten && (
        <div
          className="bx-mono"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            fontSize: 9,
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.45)',
            color: '#22c55e',
            padding: '2px 6px',
            borderRadius: 999,
            letterSpacing: '0.08em',
          }}
        >
          ✓ HEUTE
        </div>
      )}
      <div style={{ fontSize: 28 }}>{t.emoji}</div>
      <div className="bx-display" style={{ fontSize: 13, marginTop: 4 }}>
        {t.name}
      </div>
      <div className="bx-mono" style={{ fontSize: 9, marginTop: 6, color: 'var(--bx-mute)' }}>
        „{t.flavor}"
      </div>
    </button>
  );
})}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Open `/lab`. Beat a specific trainer (e.g., Atk-König). Reopen GEGNER picker. Verify:
- The beaten trainer card shows the green "✓ HEUTE" pill in the top-right
- Other trainers do not have the badge
- Reload the page — badge persists (still today)
- Manually edit `localStorage.beyarena.lab.trainersBeatenToday` to a yesterday date — badge gone on next sheet open

- [ ] **Step 5: Commit**

```bash
git add src/lib/labTrainerBadges.ts src/components/lab/LabBattleScreen.tsx src/components/lab/LabPickerOpponent.tsx
git commit -m "feat(lab): 'Heute besiegt' trainer badges (localStorage, daily reset)"
```

---

## Phase 6 — QA

### Task 24: Manual QA checklist

**Files:** none modified.

This task runs through the verification matrix from the spec (section 6 of design doc). Use the local dev server (`npm run dev`) and visit the LAN URL on a phone for the device-specific items.

- [ ] **Step 1: Engine tests pass**

```bash
npm run test:run
```

Expected: all tests in `tests/unit/labEngine.test.ts` and `tests/unit/labTrainers.test.ts` pass.

- [ ] **Step 2: Build succeeds**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Lint passes**

```bash
npm run lint
```

Expected: no errors. If warnings appear, decide whether to fix or accept (most likely: fix react-refresh export warnings if any).

- [ ] **Step 4: Functional checklist on iPhone Chrome and Safari**

For each browser, verify:
- [ ] Open `/lab` from BottomNav (5 tabs visible, no layout shift on small phones)
- [ ] FTUE shows on first open; Überspringen dismisses
- [ ] Primary nudge banner shows when no primary set; ✕ dismisses + persists
- [ ] MEIN BEY picker opens, filter toggle works, picking selects
- [ ] GEGNER picker opens, both Wild + Crew tabs work
- [ ] All 5 trainers visible in Wild tab
- [ ] "Bey bestimmen" opens bey picker and assigns
- [ ] Crew tab shows kids; faded if no primary
- [ ] KAMPF STARTEN disabled until both picked; haptic fires on tap
- [ ] Battle screen plays all phases; clash bursts visible
- [ ] Recap card slides up; margin word matches outcome; type trio tinted correctly
- [ ] Nochmal replays with same picks (different result possible)
- [ ] Anderes returns to picker, MEIN BEY stays, GEGNER cleared
- [ ] Settings sheet opens, toggles persist across reload, FTUE reset works
- [ ] Sound on: hear launch tick, 3 clashes, win fanfare
- [ ] Sound off: silent
- [ ] Streak chip appears after consecutive wins (with toggle on)
- [ ] Loss resets streak to 0

- [ ] **Step 5: Reduced-motion checklist**

In Chrome DevTools → Rendering → Emulate CSS `prefers-reduced-motion: reduce`:
- [ ] Battle choreography collapses to ~200ms crossfade (no clashes/spins)
- [ ] FTUE frames transition without slide animation
- [ ] Recap card slides up but with shorter duration
- [ ] No animation jank or broken state

- [ ] **Step 6: localStorage clean-up**

In DevTools → Application → Local Storage:
- [ ] `beyarena.lab.primarySetNudgeDismissed` = '1' after dismiss
- [ ] `beyarena.lab.ftueDone` = '1' after FTUE complete
- [ ] `beyarena-lab` JSON contains `streakEnabled` and `soundEnabled` only (not picks or streak)

- [ ] **Step 7: Cross-kid sanity (set up via Werkstatt + multiple kid sessions)**

- [ ] Kid A sets primary in Karte → Kid B sees Kid A in Lab Crew tab with primary bey thumb
- [ ] Kid A unsets primary → Kid B sees Kid A faded with "Kein Haupt-Bey gewählt"

- [ ] **Step 8: Production build sanity**

```bash
npm run build && npm run preview
```

Open the preview URL. Run one battle end-to-end. Verify the production bundle works exactly like dev. Check the console — no warnings or errors.

- [ ] **Step 9: Final commit (if any docs updates surfaced)**

If the QA pass surfaced any small fixes (typos, copy tweaks, missing aria labels), commit them as discrete fixes:

```bash
git add <files>
git commit -m "fix(lab): <one-line summary>"
```

If nothing changed: no commit needed; proceed to ship review.
