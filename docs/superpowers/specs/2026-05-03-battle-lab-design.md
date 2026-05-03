# Battle Lab — Design Spec

**Date:** 2026-05-03
**Status:** Draft, awaiting user review
**Working title:** Battle Lab (in-app: "BEYBLADE LAB" / nav label "Lab")
**Scope envelope:** Approach 3 — Polished v1, ~10 days

## 1. Overview

A sandbox where a kid picks a Beyblade and watches it battle another bey, decided by an animated weighted-RNG engine. No persistence to ELO/floor — purely off-rails play. The Lab is the answer to Louis's product feedback: *"da macht man ja gar nichts"* (you don't do anything) and *"locked beyblades are kinda boring"*.

The "test my configs" promise is delivered by:
- All 46 canonical beys are pickable (no ownership gate)
- A type chart + stat-weighted engine that makes config choice meaningfully affect outcomes
- A recap card that explains *why* a fight went the way it did

A future v2 layers a parts customizer (Blade/Ratchet/Bit swapping). A separate, deferred future project explores a pokelike.xyz-shaped roguelike adaptation; that is not this spec.

### 1.1 Goals
1. Louis plays 5+ rounds in his first session (loop is fun)
2. Louis plays 10+ rounds across 3+ sessions in week 1 (retention real)
3. Louis spontaneously names a trainer he wants to beat (personality landed)
4. Engine math is provably in the 65-75% favored-win range (sandbox feels fair)
5. Visual identity (bey component, type emblems, stat bars) is consistent with the rest of the app

### 1.2 Non-goals (v1)
- Parts customizer (Blade/Ratchet/Bit editing) — v2
- Best-of-3 mode — v1.5 toggle
- Canvas/physics renderer — Q12=D upgrade if Louis flags as boring
- One-tap timing input (power-meter swing) — v1.5
- Persistent Lab stats, XP, ranks, leaderboards
- Achievements beyond "Heute besiegt" trainer badges
- Multiplayer Lab (kid vs kid live)
- User-created trainers
- Pokelike-shaped roguelike adaptation (separate future project)

## 2. Audience & constraints

### 2.1 Audience
Same as the rest of BeyArena: 5-15 first-grade kids (~7yo). Louis is the canonical user; the rest of the crew follows. Lab is exposed to all crew kids equally.

### 2.2 Hard constraints
- **First-grader copy level.** No abstract verbs, no tech jargon. German UI throughout. Bey names + trainer names stay in their canonical register.
- **No persistence to outcomes-table.** Lab fights never write to `battles` (sandbox).
- **Mobile-first.** Designed for kid-held smartphones with one-thumb operation. Tablet works.
- **Apple HIG.** Safe-area-inset, ≥44pt tap targets, judicious haptics, prefers-reduced-motion respected.
- **Default muted.** Sound off by default; kids play in shared spaces.

## 3. Stack & architecture

### 3.1 Module layout

```
src/
  components/lab/
    LabTab.tsx              ← page itself (5th nav tab)
    LabPickerBey.tsx        ← bey-cards grid (kid's side)
    LabPickerOpponent.tsx   ← segment toggle Wild/Crew, then cards
    LabBattleScreen.tsx     ← full-screen Motion choreography
    LabRecapCard.tsx        ← margin label + reason + buttons
    LabStreakChip.tsx       ← session counter
    LabFTUE.tsx             ← 3-frame walkthrough
    LabSettingsSheet.tsx    ← gear icon: streak/sound/ftue toggles
  lib/
    labEngine.ts            ← pure: (myBey, oppBey, opts) => Outcome
  stores/
    lab-session.ts          ← Zustand: streak, ftueDone, mute, filter
  data/
    labTrainers.ts          ← hardcoded 5-trainer roster
  components/beys/
    PrimaryBeySetter.tsx    ← new action on bey detail card
```

### 3.2 Routing
- `/lab` — the tab itself. No sub-routes.
- Battle screen + recap = full-screen overlays managed by Zustand state, not routes (consistent with existing log-battle flow).

### 3.3 Persistence model
| Data | Where | Why |
|---|---|---|
| `kids.primary_bey_id` | Postgres | Cross-device, follows the kid via QR auth |
| Lab streak (session) | localStorage | Resets on tab leave; per-device by design |
| FTUE-done flag | localStorage | Per-device; new-device onboarding is fine |
| Sound mute | localStorage | Per-device preference |
| "Heute besiegt" trainer badges | localStorage | Per-device, resets at midnight |
| Filter toggle (Meine/Alle) | Zustand only | Session-scoped |
| Battle outcomes | **nowhere** | Sandbox. Never persisted. |

### 3.4 Engine/renderer boundary

`labEngine.ts` is a pure function. Same inputs + same seed → same `Outcome`. The renderer (`LabBattleScreen.tsx`) consumes the `Outcome` and dramatizes it. **No outcome logic in the renderer.** This is what makes a future canvas/Lottie swap (Q12=D upgrade) painless: rip out the renderer, keep the engine.

## 4. Battle engine

### 4.1 Signature

```ts
type OpponentKind =
  | { kind: 'wild' }
  | { kind: 'trainer'; trainerId: string }
  | { kind: 'crew'; kidId: string };

type Outcome = {
  winner: 'me' | 'opp';
  margin: 'knapp' | 'klar' | 'zerstoert';
  reasonKey:
    | 'atk-cracks-def' | 'def-walls-atk' | 'sta-outlasts-sta'  // stat-driven
    | 'atk-beats-sta'  | 'sta-beats-def' | 'def-beats-atk'     // type-chart-driven
    | 'closer-stats'   | 'upset';                               // misc
  myOdds: number;          // 0..1, post-clamp; for the recap odds bar
  seed: number;            // for reproducible animation
};

function resolveBattle(
  myBey: Bey,
  oppBey: Bey,
  seed?: number,
): Outcome;
```

### 4.2 Math

1. Start at `odds = 0.50` (favoring `me`).
2. Add stat tilts:
   - `(myAtk - oppAtk) * 0.005`, capped at ±0.15  (30-point advantage caps)
   - `(myDef - oppDef) * 0.005`, capped at ±0.15
   - `(mySta - oppSta) * 0.005`, capped at ±0.15
3. Add type-chart tilt (rock-paper-scissors: Atk > Sta > Def > Atk):
   - +0.10 if my type beats opp type
   - −0.10 if opp type beats my type
   - 0 otherwise (mirror match or draw type)
4. **Clamp final odds to [0.25, 0.75]** — upsets always exist.
5. Roll seedable RNG (`mulberry32`, `seed = seed ?? Date.now()`) against `myOdds`. That picks the winner.
6. `margin = bucketed |myOdds - 0.5|`:
   - <0.10 → `knapp`
   - <0.20 → `klar`
   - ≥0.20 → `zerstoert`

   (Post-clamp `|myOdds - 0.5|` maxes at 0.25; the brackets above span the realistic range.)
7. `reasonKey` resolution order — first match wins:
   1. **If RNG produced the lower-odds outcome** (the favorite lost): `reasonKey = 'upset'`. Renders as "GLÜCK!" / "PECH" copy depending on `winner`.
   2. **Otherwise**: whichever component contributed the largest tilt picks the reasonKey (e.g., type-chart tilt biggest → `atk-beats-sta`).
   3. **Tie-break**: stat tilt outranks type-chart tilt at exact tie.

### 4.3 Type chart

Stored as a constant in `labEngine.ts`:

```ts
const TYPE_BEATS: Record<BeyType, BeyType> = {
  attack:  'stamina',
  stamina: 'defense',
  defense: 'attack',
};
```

If a bey's `type` field is null/unknown (e.g., custom or scraping miss), the type-chart tilt is 0 — engine still resolves cleanly off raw stats.

### 4.4 RNG

`mulberry32(seed)` — ~10 lines, deterministic, well-studied. Default seed is `Date.now()`. Tests use fixed seeds.

### 4.5 Tests (`labEngine.test.ts`)

| Case | Expected |
|---|---|
| `myAtk=80, oppAtk=50`, rest equal, 10k iters | win-rate ∈ [65%, 75%] (caps at +0.15 → 65%) |
| All-equal beys, 10k iters | win-rate ∈ [48%, 52%] |
| `myAtk=100, oppAtk=10` (all 3 stats), 10k iters | win-rate ∈ [72%, 76%] (clamp holds at ~75%) |
| Atk-type vs Sta-type, equal stats, 10k iters | win-rate ∈ [55%, 65%] |
| Sta-type vs Atk-type, equal stats, 10k iters | win-rate ∈ [35%, 45%] |
| Same seed twice | identical Outcome (determinism) |

Renderer is not unit-tested. Visual fidelity is asserted manually.

## 5. UX surfaces

### 5.1 LabTab.tsx (resting state)

```
  [eyebrow]  BEYBLADE LAB                    [⚙ settings · streak chip if on]
  [display]  Teste deine Beys

  ┌─ MEIN BEY ─────┐         ┌─ GEGNER ───────┐
  │   [Bey vis]    │   VS    │   [Bey vis]    │
  │   Drachen-X    │         │   Atk-König    │
  │  ▰▰▰▰▱  ⚔     │         │  ▰▰▰▱▱  ⚔      │
  └────────────────┘         └────────────────┘

              [⚔ KAMPF STARTEN]
```

- Two big tap-targets (≥44pt), each opens a sheet picker.
- Empty state shows ghost card with `Tippe um zu wählen`.
- "KAMPF STARTEN" disabled until both sides picked. Active = `bx-btn-crimson`.
- Settings gear top-right opens `LabSettingsSheet`.
- Streak chip top-right (if streak toggle on): pill with current count.

### 5.2 LabPickerBey.tsx (sheet from MEIN BEY tap)

- Filter at top: `Meine Beys` / `Alle Beys` segmented (defaults to `Meine Beys` if `kids_beys` exists, else hidden — see §11).
- 3-col grid of bey cards reusing existing `Bey` component visual + 3 stat bars + type emblem (Q9=D).
- Tap → assigns to draft, sheet dismisses.
- Same picker is reused as the "Bey bestimmen" mode in the opponent picker.

### 5.3 LabPickerOpponent.tsx (sheet from GEGNER tap)

- Segment toggle: `Wild` / `Crew`.
- **Wild** tab:
  - Horizontal scroll of 5 trainer cards (face emoji + name + flavor line)
  - `🎲 Zufällig` tile (random bey from full 46)
  - `Bey bestimmen` toggle that opens the same 3-col bey grid
- **Crew** tab:
  - List of kids in same crew with `primary_bey_id IS NOT NULL`
  - Kid card shows face emoji + primary bey thumb
  - Kids without a primary appear faded with `Kein Haupt-Bey gewählt`, non-tappable
  - No nag toward absent kids; their setup is their choice

### 5.4 LabBattleScreen.tsx (full-screen overlay)

- Eyebrow: `LAB · KAMPF`. No "X/Y" footer copy.
- Stadium frame: rounded rectangle, dark vignette.
- Two `Bey` components scaled to 96px, facing each other.
- Choreography (Motion sequence):
  1. Launch (slide-in from edges, 0.3s)
  2. Close-distance (drift toward center, 1.5s, `spin` prop active)
  3. Clash beats (3 bursts of shake + radial particle, 0.6s each)
  4. Result moment (winner keeps spinning, loser tilts and drops, 1.2s)
  5. Outcome flash (200ms green/red tint)
- Total runtime ~6-8s.
- `prefers-reduced-motion: reduce` collapses to: static beys + 200ms crossfade to result.

### 5.5 LabRecapCard.tsx (slides up from bottom, overlays battle screen)

- Margin word in stencil font, huge: `KNAPP` / `KLAR` / `ZERSTÖRT`.
- Reason row: type-chart trio (e.g., `⚔ ➤ ⏱`) tinted green/red/grey + first-grader copy keyed off `reasonKey` (e.g., `"Dein Atk hat ihre Sta zerlegt"`).
- Odds bar: visual representation of `myOdds` (e.g., 68% filled green).
- Two buttons: `Nochmal` (same matchup, re-rolls seed) · `Anderes` (back to picker, MEIN BEY stays, GEGNER clears).
- Streak chip updates if toggle on.

### 5.6 PrimaryBeySetter.tsx (new action on bey detail in Beys tab)

- Button: `Als Haupt-Bey setzen` next to existing bey actions.
- Toggles `kids.primary_bey_id`. Replaces previous selection.
- Currently-set bey shows ⭐ badge on its grid card.
- Toast on set: `Haupt-Bey gesetzt`. Toast on unset: `Haupt-Bey entfernt`.

### 5.7 LabFTUE.tsx (first-time, full-screen overlay)

3 swipeable frames, dismiss → Lab tab. `Überspringen` link top-right.

| Frame | Copy | Visual |
|---|---|---|
| 1 | *Wähle deinen Bey* | Bey-card tap illustration |
| 2 | *Wähle deinen Gegner* | Trainer card illustration |
| 3 | *Schau zu und sieh, wer gewinnt!* | Clash + recap card illustration |

State: `localStorage.lab.ftueDone = true` after dismiss/complete.

### 5.8 LabSettingsSheet.tsx (gear icon, top-right of LabTab)

- Streak counter: `An` / `Aus` (Q10 toggle)
- Sound: `An` / `Aus`
- "FTUE nochmal zeigen" link (resets the flag)

## 6. Trainer roster

Hardcoded in `src/data/labTrainers.ts`:

```ts
export type LabTrainer = {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  pick: (allBeys: Bey[]) => Bey;
};
```

| ID | Name | Emoji | Picking strategy | Flavor |
|---|---|---|---|---|
| `atk-koenig` | Atk-König | 👑 | Highest-Attack bey | "Ich greife immer an. Komm her!" |
| `def-mira` | Defensiv-Mira | 🛡 | Highest-Defense bey | "Du kommst nicht durch." |
| `wild-karte` | Wildkarte | 🎲 | Uniform random from 46 | "Wer weiß, was ich heute hab." |
| `schnell-tim` | Schnell-Tim | ⚡ | Lightest Attack-type | "Wir tanzen, dann kämpfen wir." |
| `schwer-pia` | Schwer-Pia | 🪨 | Heaviest Stamina-type | "Ich bleibe stehen. Immer." |

Picking happens at **fight-start**, not card-tap — same trainer rolls a different bey each fight (gives Wildkarte real unpredictability + lets others adapt as the bey roster grows).

**Fallback for filtered picks**: if a trainer's filter (e.g., "Attack-type with weight data") returns an empty set, fall back to the unfiltered version of the sort (e.g., just "lightest bey"). If even that fails (no weight field), fall back to a uniform random pick from the full 46. This guards against gaps in scraped data without breaking the Lab.

### 6.1 "Heute besiegt" tracking

`localStorage.lab.trainersBeatenToday`:

```ts
{ [trainerId]: 'YYYY-MM-DD' }
```

On read, filter to today; older entries garbage-collected on access. Badge `✓ Heute besiegt` on the trainer card. No DB.

## 7. Crew opponent infrastructure

### 7.1 Migration `0010_kids_primary_bey_id.sql`

```sql
ALTER TABLE kids ADD COLUMN primary_bey_id uuid REFERENCES beys(id);
COMMENT ON COLUMN kids.primary_bey_id IS
  'Optional. Kid sets in Beys tab. Used as opponent in Lab.';
```

### 7.2 RLS

Existing kid-self-update policy on `kids` covers `primary_bey_id` column writes. **No new policy needed** — verify in implementation phase by reading the existing policy.

### 7.3 Where the kid sets primary

Two surfaces:

1. **Beys tab, bey detail action** (primary path): tap bey → `Als Haupt-Bey setzen` button. Star badge ⭐ on currently-set card.
2. **Lab tab nudge banner** (one-time, dismissable): if `primary_bey_id IS NULL` on first Lab open, show thin banner above picker:
   > 💡 *Setz deinen Haupt-Bey im Beys-Tab — dann können deine Freunde gegen dich kämpfen.*

   Tap routes to Beys tab. Dismiss = `localStorage.lab.primarySetNudgeDismissed = true`.

### 7.4 Crew opponent query

`LabPickerOpponent` Crew tab queries:

```ts
useCrewKidsWithPrimary()
// → kids in same crew where primary_bey_id IS NOT NULL
// → joined with beys table to render the bey thumb
```

Kids without primary listed below as faded, non-tappable, with `Kein Haupt-Bey gewählt` subcopy.

## 8. Polish layer

### 8.1 Sound

Three files in `public/sounds/lab/`, all <50KB:

| File | Trigger | Duration |
|---|---|---|
| `launch.mp3` | "KAMPF STARTEN" tap | ~150ms |
| `clash.mp3` | Each of the 3 clash beats | ~200ms |
| `fanfare.mp3` | On win only (no fanfare on loss) | ~800ms |

Default state: **muted** (`localStorage.lab.muted = 'true'` if unset). Toggle in `LabSettingsSheet` and globally in app settings.

### 8.2 Haptics

Three judicious moments via `navigator.vibrate`, wrapped in `try/catch` + `typeof navigator.vibrate === 'function'` guard (mirroring `LogBattleConfirm.tsx`):

| Moment | ms |
|---|---|
| "KAMPF STARTEN" tap | 15 |
| Each clash beat (×3) | 8 |
| Win | 25 |
| Loss | none — losing isn't a moment to mark on the body |

### 8.3 Reduced-motion handling

`prefers-reduced-motion: reduce` collapses:
- Battle choreography → static beys + 200ms crossfade to result
- FTUE swipe → instant transition
- Streak chip pulse → no pulse, just number

Outcome data is **identical**; only dramatization changes. No second engine code path.

### 8.4 Type-chart hint in recap

Trio icon `⚔ ➤ ⏱` rendered with color tint:
- Green if it favored the kid
- Red if it favored the opponent
- Grey if no clean type advantage (mirror or unknown type)

This is the at-a-glance "why I won/lost".

## 9. Lab session state (Zustand)

`src/stores/lab-session.ts`:

```ts
type LabSession = {
  // Picks (in-memory only)
  myBeyId: string | null;
  opponent: OpponentKind | null;

  // Session counter
  streak: number;           // session-only, resets on Lab tab leave

  // Settings (mirror localStorage on hydrate)
  streakEnabled: boolean;
  soundEnabled: boolean;

  // Filters
  beyFilter: 'mine' | 'all';

  // Actions
  setMyBey(id: string): void;
  setOpponent(kind: OpponentKind): void;
  recordWin(): void;        // increments streak
  recordLoss(): void;       // resets streak to 0
  resetSession(): void;     // on tab leave
};
```

`useEffect` in `LabTab.tsx` calls `resetSession` on unmount of the Lab route.

## 10. Data flow

```
┌──────────────┐
│  LabTab      │ user picks myBey + opponent
│              │ → Zustand draft updated
└──────┬───────┘
       │ user taps KAMPF STARTEN
       ▼
┌──────────────┐
│  labEngine   │ pure resolveBattle(myBey, oppBey, seed)
│              │ → Outcome
└──────┬───────┘
       │ Outcome stored in Zustand
       ▼
┌──────────────────┐
│ LabBattleScreen  │ consumes Outcome, runs Motion sequence
│                  │ uses outcome.winner only for choreography branch
└──────┬───────────┘
       │ animation complete
       ▼
┌──────────────┐
│ LabRecapCard │ shows margin, reason, odds bar, buttons
│              │ updates streak (+1 or reset 0)
└──────┬───────┘
       │ user taps Nochmal → re-roll seed, same opponents → engine again
       │ user taps Anderes → back to LabTab, GEGNER cleared
```

Engine call → renderer is one-way. No feedback loop. Lab never writes to Supabase except for `primary_bey_id` setter (which is a Beys-tab action, not a Lab-tab action).

## 11. Open questions for implementation phase

1. **Does `kids_beys` (or equivalent ownership relation) exist?**
   - If yes: "Meine Beys" filter shows owned beys only.
   - If no: filter is **hidden** in v1; full 46 always shown. Add in a later sprint when ownership lands.
   - **Decision in plan-writing**: read the schema, decide there.
2. **Bey type field availability.**
   - Need `bey.type ∈ {attack, defense, stamina}` on every bey.
   - If wiki scrape missed types: type-chart tilt is 0; engine still works. Worth a one-off audit before merge.
3. **Sound sourcing.**
   - Need 3 short clips: launch tick, clash crack, win fanfare.
   - **Plan**: hand-pick from freesound.org with CC0 license filter. Document license + source URL in a `public/sounds/lab/CREDITS.md` file at commit time.
   - **If sourcing slips**: ship without sound; the mute-default model means an absent file is silent, not broken. Sound becomes a follow-up commit.

## 12. Risks

1. **Engine math doesn't match real-game feel.** Mitigation: tests + Marc/Louis playtest before merge. Tunable constants in one place at top of `labEngine.ts`.
2. **5 trainers feel limiting after a week.** Mitigation: roster is a one-line array entry; new trainers ship in minutes.
3. **Bey ownership concept missing.** See §11.1.
4. **Reduced-motion fallback feels jarring.** Needs device test. Could be the difference between "polish" and "broken" for some users.
5. **Engine/renderer boundary leakage.** The temptation to read engine state inside the renderer ("show 'critical hit' when...") is real. Strict review: renderer consumes `Outcome`, never reaches into RNG.

## 13. Post-launch observation

How we know it worked:

| Signal | Read |
|---|---|
| Louis plays 5+ rounds first session | Loop is fun |
| Louis plays 10+ rounds across 3+ sessions in week 1 | Retention real |
| Louis names a trainer he wants to beat | Personality landed |
| Louis says "langweilig" or stops opening Lab | Invest in renderer (Q12=B) or timing input (Q7=B) |
| Crew kids set primary_bey_id within first week | Q4=C feature is being used |

## 14. Future work (explicitly scoped out of v1)

- **v1.5 toggle**: Best-of-3 mode (Q8=A)
- **v1.5**: One-tap timing input (Q7=A → B)
- **Q12=D upgrade**: Canvas/physics renderer if the Motion choreography feels flat after launch
- **v2**: Parts customizer (Blade/Ratchet/Bit swapping)
- **Standalone future project**: Pokelike-shaped roguelike adaptation. Research saved at `.research/pokelike-index.html` + 4 agent reports in conversation history. Recommended name from BX mapping research: "X-Turm: Pro League"

## 15. Brainstorm decision log

| Q | Decision | Locked |
|---|---|---|
| Q1 | Pick-and-battle v1, parts customizer v2 | C |
| Q2 | Animated drama (not numbers-only) | B |
| Q3 | Pure sandbox, no persistence, all beys playable | A |
| Q4 | Opponents = Wild Bey CPU **and** crew kid's primary | C |
| Q5 | 5th tab "Lab" in bottom nav | A |
| Q6 | Weighted RNG (~65-75% favored win-rate) | B |
| Q7 | Pure auto-battle (no input during fight) | A |
| Q8 | Single round 6-10s | A |
| Q9 | Stat bars + type emblem on bey cards | D |
| Q10 | Recap card always; streak counter as toggle | B+C |
| Q11 | Wild side: themed trainers + specific bey picker | B+C |
| Q12 | Reuse Bey+Motion now, clean engine/renderer boundary for future swap | D |
| Approach | Polished v1, ~10 days | 3 |
