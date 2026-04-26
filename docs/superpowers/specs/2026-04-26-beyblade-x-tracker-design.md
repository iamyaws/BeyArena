# Beyblade X Tracker — Design Spec

**Date:** 2026-04-26
**Status:** Draft, awaiting user review
**Working title:** TBD (Marc to name)

## 1. Overview

A PWA for a crew of 5-15 first-grade kids who battle Beyblade X after school. The app lets them:

- Track battles individually + collectively, in the evening after the day's matches
- Climb a 100-floor tower called **The X** (canon Beyblade X lore) ranked by ELO
- Build personal collections of canonical Beyblade X beys they own
- Form teams (small in-app groups within the crew), have evolving trading-card identities, exchange endorsement stickers
- See what the rest of the crew battled today

v1 scope is deliberately tight; tournaments, real team battles, two-tower lore (Slash + Solidus), and the bey customizer are explicitly deferred. See Section 13.

### 1.1 Goals
1. Logging a battle takes ~10 seconds in the evening (not during play, when kids have no phones)
2. Daily hook: kids open the app to see rank, feed, what others did — voluntarily, without prompts
3. Anti-cheat without drama: trust + 24h dispute window, anyone can flag, disputed = auto-void
4. The tower is the leaderboard surface, not a separate ranking table
5. Real Beyblade X lore + product art throughout — feels like the show, not a generic tracker

### 1.2 Non-goals (v1)
- Tournaments (stub link only)
- Team battles (crews are social groupings only)
- Bey customizer
- Two-tower split
- Public landing page
- Multi-language

(Full backlog in Section 13.)

## 2. Audience & constraints

### 2.1 Primary audience
- 5-15 first-grade kids (~7yo) who play Beyblade X together after school
- Battles happen physically with no phones; logging happens in the evening at home
- Mixed device access: some have own phone/tablet, some borrow a parent's, some come and go

### 2.2 Secondary audience (admin)
- Marc Förste — sole super-admin in v1. Creates kid accounts, prints QR cards, scrapes bey catalog, resolves disputes via override

### 2.3 Hard constraints
- **First-grader copy level.** Every user-facing string must be readable by a 7yo. No abstract verbs, no tech jargon. German UI; English/Japanese kept only for proper nouns (bey + character names).
- **No email/password auth for kids.** QR-card login only.
- **Kid-safe surface.** No free-text input except the 200-char dispute note. No DMs. No public-facing pages without admin gate.
- **Offline-tolerant battle logging.** Drafts persist in IndexedDB; sync on reconnect.
- **Mobile-first.** Designed for kid-held smartphones. Tablet works. Desktop is admin-only.

## 3. Stack & architecture

### 3.1 Frontend
- **Vite + React 18 + TypeScript**
- **Tailwind CSS**
- **Motion** library for animations
- **TanStack Query** for Supabase data fetching + caching + optimistic updates
- **Zustand** for client state (current kid, draft battle, etc.)
- **vite-plugin-pwa** for service worker, manifest, install prompt
- **html5-qrcode** for in-app QR scanning

### 3.2 Backend (Supabase)
- **Postgres** for data
- **RLS** for per-kid scoping using `auth.jwt()->>'kid_id'`
- **Edge Functions:** QR token exchange, ELO computation, dispute auto-void cron, scrape jobs, push send
- **Realtime channels** for crew-feed live updates, rank changes, dispute alerts
- **Storage** for bey images (mirrored from wiki) + kid avatars

### 3.3 Hosting
- Vercel (PWA + edge functions)
- Custom subdomain (TBD — Marc will name)
- Web Push API + VAPID keys for push notifications

### 3.4 Offline strategy
- Battle logging: drafts in IndexedDB, posted on reconnect
- Feed/leaderboard: stale cache shown until fresh data arrives
- QR scan: needs network on first exchange; JWT then lives in localStorage

## 4. Auth flow (QR cards)

### 4.1 Kid login
1. Admin creates kid in "Werkstatt → Neuer Spieler": display name + avatar pick → server generates 32-byte hex token, stores SHA-256 hash in `kids.token_hash`, returns plaintext + QR-encoded URL `https://<app>/q/<token>`
2. Marc prints the kid's card (front: avatar + display name + primary bey; back: QR + the crew's brand mark)
3. Kid scans QR (phone camera or in-app scanner)
4. App calls Edge Function `exchange-token` with token
5. Function validates → signs custom JWT with `kid_id` claim → returns to client
6. Client persists JWT + kid_id in localStorage
7. Subsequent requests include JWT in Authorization header; RLS scopes data
8. Switch player on shared device: re-scan, OR pick from "recent kids on this device" cache (each pick still re-validates the cached token via Edge Function)
9. Lost card: Marc invalidates token in admin panel, prints new card

### 4.2 Admin login (Marc)
- Supabase email/password auth
- Email verified to a single hardcoded admin email
- Admin claim `role: 'admin'` set via JWT claim
- RLS allows admin role to bypass per-kid scoping

### 4.3 Token security
- Tokens are bearer tokens — whoever holds it IS the kid (acceptable for 15-kid scale)
- Tokens never expire on their own (kids would lose access otherwise)
- Tokens can be invalidated from admin panel
- Future hardening: optional 4-digit PIN as second factor (not v1)

## 5. Data model

All tables use uuid primary keys unless noted. RLS enabled on every table.

### 5.1 Identity & social

#### `kids`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| display_name | text NOT NULL | Kid-chosen, parent-overridable |
| avatar_url | text | Storage path or external URL |
| primary_team_id | uuid → teams | NULL ok |
| token_hash | text NOT NULL UNIQUE | SHA-256 of plain token |
| elo | int NOT NULL DEFAULT 800 | |
| floor | int NOT NULL DEFAULT 1 | Cached, recomputed from elo on confirm |
| card_color_hex | text | Customization |
| tagline | text | Unlocked at Floor 75+ |
| created_at | timestamptz | |
| created_by_admin_id | uuid → admins | |

#### `teams`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| color_hex | text NOT NULL | |
| logo_url | text | |
| created_by_kid_id | uuid → kids | Any kid can create |
| created_at | timestamptz | |

#### `team_members`
Composite PK `(team_id, kid_id)`. Many-to-many. App-level enforces `kids.primary_team_id` ∈ team_members for that kid.

#### `push_subscriptions`
| Column | Type |
|---|---|
| id | uuid PK |
| kid_id | uuid → kids |
| endpoint | text |
| p256dh | text |
| auth | text |
| created_at | timestamptz |

One kid → many devices. RLS: kid manages only own subscriptions.

### 5.2 Beys & ownership

#### `beys`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name_en | text | "DranSword" |
| name_de | text | DE variant if exists |
| name_jp | text | "ドランソード" |
| product_code | text | "BX-01", "BX-13" — Takara Tomy SKU |
| image_url | text | Mirrored to Supabase Storage |
| type | enum | attack / defense / stamina / balance |
| line | enum | basic / custom / unique |
| blade_id | uuid → bey_parts | NULL ok |
| ratchet_id | uuid → bey_parts | NULL ok |
| bit_id | uuid → bey_parts | NULL ok |
| stat_attack | int | 1-10 scale |
| stat_defense | int | |
| stat_stamina | int | |
| stat_burst_resistance | int | |
| source_url | text | Wiki URL |
| available_in_de | bool DEFAULT false | Phase 2 cron flag |
| canonical | bool DEFAULT true | True for real BX releases |
| scraped_at | timestamptz | |

#### `bey_parts` (Phase 2 customizer prep, populated at scrape time)
| Column | Type |
|---|---|
| id | uuid PK |
| kind | enum (blade / ratchet / bit) |
| name | text |
| stat_attack, stat_defense, stat_stamina, stat_burst_resistance | int |
| image_url | text |
| source_url | text |

#### `kid_beys`
Composite PK `(kid_id, bey_id)`.
| Column | Type |
|---|---|
| kid_id | uuid → kids |
| bey_id | uuid → beys |
| acquired_at | timestamptz |
| nickname | text — kid-chosen optional |

### 5.3 Battles & ELO

#### `battles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| logger_kid_id | uuid → kids | Who entered the battle |
| winner_kid_id | uuid → kids | |
| loser_kid_id | uuid → kids | |
| winner_score | int | Positive integer; `winner_score > loser_score` enforced via CHECK |
| loser_score | int | Non-negative integer; no upper cap (kids may play first-to-3 OR first-to-5) |
| winner_bey_id | uuid → beys | NULL ok ("Unbekannt") |
| loser_bey_id | uuid → beys | NULL ok |
| status | enum | pending / confirmed / voided |
| logged_at | timestamptz | |
| confirmed_at | timestamptz | NULL until status='confirmed' |
| voided_at | timestamptz | NULL until status='voided' |
| voided_reason | text | "disputed_by_<kid_id>" or "admin_override" |
| dispute_window_ends_at | timestamptz GENERATED | logged_at + interval '24h' |

#### `battle_rounds` (optional per-round detail)
Composite PK `(battle_id, round_number)`.
| Column | Type |
|---|---|
| battle_id | uuid → battles |
| round_number | int |
| finish_type | enum (spin / over / burst / extreme) |
| winner_kid_id | uuid → kids |
| points | int — 1, 1, 2, 3 derived but stored |

#### `disputes`
UNIQUE `(battle_id, disputer_kid_id)` — one dispute per kid per battle.
| Column | Type |
|---|---|
| id | uuid PK |
| battle_id | uuid → battles |
| disputer_kid_id | uuid → kids |
| reason_code | enum (wrong_score / didnt_happen / wrong_opponent / wrong_bey / other) |
| note | text — max 200 chars |
| created_at | timestamptz |

### 5.4 Battle state machine

```
[New entry]
    ↓
  PENDING (24h dispute window)
    ↓
    ├─ Cron at dispute_window_ends_at → CONFIRMED
    │     → Edge fn computes & applies ELO + floor delta to both kids
    │
    └─ First dispute filed → VOIDED (immediately)
          → No ELO change
          ↓
          [Admin override possible] → CONFIRMED (recompute ELO from scratch)
```

ELO is recomputed from chronological list of confirmed battles, not stored as deltas. Robust to reversals; fine at v1 data scale (~100s of battles per month at most).

### 5.5 Achievements & social rewards

#### `milestones` (catalog)
| Column | Type |
|---|---|
| id | uuid PK |
| code | text UNIQUE (first_win, hit_local, hit_regional, …) |
| name | text |
| description | text |
| icon_url | text |

#### `kid_milestones`
Composite PK `(kid_id, milestone_id)`.

#### `stickers` (catalog)
| Column | Type |
|---|---|
| id | uuid PK |
| code | text UNIQUE |
| name | text — "Pure Fire", "GG", … |
| emoji_or_image | text |
| rarity | enum (common / rare / legendary) |
| min_floor_to_send | int |

#### `endorsements`
| Column | Type |
|---|---|
| id | uuid PK |
| from_kid_id | uuid → kids |
| to_kid_id | uuid → kids |
| sticker_id | uuid → stickers |
| after_battle_id | uuid → battles — NULL ok |
| created_at | timestamptz |

### 5.6 Engagement

#### `notifications`
| Column | Type |
|---|---|
| id | uuid PK |
| kid_id | uuid → kids |
| kind | enum |
| payload_json | jsonb |
| read_at | timestamptz |
| created_at | timestamptz |

`kind` values: battle_confirmed · battle_voided · rank_up · dispute_against_you · new_endorsement · milestone_unlocked · admin_msg.

### 5.7 RLS sketch
- Kids read most things (other kids' public profiles, beys catalog, confirmed/pending battles, leaderboard, all crew teams)
- Kids write only their own: battles where logger_kid_id = self · endorsements where from_kid_id = self · kid_beys where kid_id = self · profile basics (display_name, avatar_url, tagline, card_color_hex)
- Disputes: any kid can write; UNIQUE constraint enforces one per battle per kid
- ELO/floor/token_hash never writable by kid — only Edge Functions via service role
- Admin role bypasses RLS for super-admin operations

### 5.8 Indexes
```sql
CREATE INDEX battles_logged_at_idx ON battles (logged_at DESC);
CREATE INDEX battles_dispute_window_pending_idx
  ON battles (dispute_window_ends_at) WHERE status = 'pending';
CREATE INDEX battles_winner_idx ON battles (winner_kid_id);
CREATE INDEX battles_loser_idx ON battles (loser_kid_id);
CREATE INDEX kid_beys_kid_idx ON kid_beys (kid_id);
CREATE INDEX team_members_kid_idx ON team_members (kid_id);
CREATE INDEX team_members_team_idx ON team_members (team_id);
CREATE INDEX kid_milestones_kid_idx ON kid_milestones (kid_id);
CREATE INDEX endorsements_to_idx ON endorsements (to_kid_id);
```

## 6. ELO + The X tower

### 6.1 The tower (canon-faithful)
- Single tower in v1, named **The X** (canon)
- 100 floors. Starting floor 1 = ELO 800.
- Floor 100 = **The Peak** (canon name)
- The leaderboard view IS the tower

### 6.2 Floor → ELO mapping (deterministic, computed in Edge Function)

```
if elo < 1700:
    floor = floor((elo - 800) / 10) + 1   # F1 covers elo 800–809, F90 covers 1690–1699
elif elo >= 1700:
    floor = 91 + floor((elo - 1700) / 33) # F91=1700–1732, F92=1733–1765, ..., F99=1964+

# Then king-of-the-hill override for Floor 100:
# After computing the above, ONLY the kid with the highest ELO in the crew gets floor=100.
# Any other kid whose computed floor would be ≥100 is capped at 99.
```

- **Floors 1–90:** linear, each floor spans 10 ELO
- **Floors 91–99:** non-linear, each floor spans 33 ELO ("Approach Zone")
- **Floor 100 = The Peak:** reserved for whoever is currently #1 in the crew by ELO. New top blader by ELO automatically claims it; previous Peak holder drops to 99.

### 6.3 ELO algorithm
- **K = 16** (chosen for v1 over K=32 for less volatility, over Glicko-2 for simpler implementation)
- Standard ELO formula: `expected = 1 / (1 + 10^((opp_elo - my_elo) / 400))`
- Win/loss: `elo_new = elo_old + K * (actual - expected)` where `actual = 1` if won, `0` if lost
- ELO recomputed from chronological list of confirmed battles (no stored deltas)
- Margin (3-1 vs 3-0) does NOT affect ELO in v1 — pure W/L. Phase 2 may add margin sensitivity.

### 6.4 Tower as leaderboard UX
- The Peak at top with crown + champion avatar (single-occupant; gold-treated row)
- Sparse list of occupied floors + zone markers (no 100 empty rows)
- Zone markers: "Approach Zone (90-99)", "Mid Tower (50-90)", "Lower Floors (1-50)"
- Self-row highlighted yellow with "(du)" suffix
- Trend arrows (↑ / ↓ / —) show 24h floor movement
- Tap any kid → public profile

### 6.5 Future expansion (Phase 2)
- Two towers (Slash + Solidus) with personality bonuses (Slash: Xtreme finish ELO bonus; Solidus: Survivor finish bonus)
- Transfer between towers preserves floor (per canon)
- Title Match between Peak holders (monthly seasonal)
- Warden's Test gatekeeper at Floor 50 (per canon)

## 7. Core flows

### 7.1 Log a battle (3-4 taps)

**Step 1 — Pick opponent:**
- Crew list, last-active first
- Avatar + name + current floor + last-active hint per row
- Search field at bottom for crews >10 kids
- Tap → step 2

**Step 2 — Result + score:**
- "Ich habe gewonnen" / "Ich habe verloren" toggle (big buttons)
- Score steppers for both sides
- Quick presets: 3-0, 3-1, 3-2, 5-3
- Continue → step 3

**Step 3 — Beys (optional but encouraged):**
- "Mein Bey" — grid of owned beys, tap to select. "Unbekannt" fallback.
- "[Opponent]'s Bey" — grid of opponent's owned beys + "Unbekannt"
- Optional collapsed: "+ Runden-Details" → opens per-round finish-type entry (Spin/Over/Burst/Extreme)
- Continue → step 4

**Step 4 — Erfolg!:**
- Summary card (avatar vs avatar, score, beys)
- Provisional floor jump shown (e.g., "23 → 24")
- Note (kid copy): "Wenn 24 Stunden niemand sagt 'stimmt nicht', zählt's."
- Optional sticker for opponent
- "Zurück zum Dashboard" button

**Backend:**
- Battle inserted with `status='pending'`, `dispute_window_ends_at = now() + 24h`
- Provisional ELO/floor shown client-side (computed locally, not persisted)
- Cron Edge Function runs every 5 min: confirms expired pendings, applies ELO

**Edit window:**
- Logger can edit/delete their own pending battle within the 24h window — no penalty
- After confirmed, edits require dispute flow

**Offline:**
- IndexedDB queue, posted on reconnect
- Optimistic UI shows local state; server reconciles on sync

### 7.2 Dispute a battle

**Entry points:**
- Crew feed: 🚩 button on every pending battle card (visible to all crew members, not just opponent)
- Battle detail view: same button at bottom

**Dispute screen:**
- Top: dispute context ("Marc hat Marie 3-1 besiegt — vor 2 Min")
- Reason picker (5 pre-set, kid copy):
  - Score stimmt nicht
  - Das gab's gar nicht
  - Falsche Person
  - Falscher Bey
  - Was anderes
- Optional 200-char note ("Was war wirklich?")
- Warning: "Wenn du das meldest, zählt die Schlacht sofort nicht mehr."
- Buttons: "🚩 Schlacht melden" (destructive red) / "Doch nicht"

**Effect:**
- Battle status → `voided` immediately
- `voided_reason = "disputed_by_<disputer_kid_id>"`
- Push to logger: "Deine Schlacht gegen [opponent] wurde gemeldet."
- Push to opponent if different from disputer
- ELO not applied (was never applied — battle was pending)

**Admin override:**
- Marc sees disputed battles in admin panel
- "Doch zählen lassen" → status back to `confirmed`, ELO/floor recomputed for both kids

**One-dispute-per-kid:**
- DB UNIQUE on `(battle_id, disputer_kid_id)`
- Multiple kids can each dispute — but each can only dispute once

**Phase 2:**
- Repeat-offender tracking — alert Marc when a kid disputes 5+ battles in 30 days

### 7.3 Auto-confirm cron
- Edge Function runs every 5 minutes
- Query: `SELECT * FROM battles WHERE status = 'pending' AND dispute_window_ends_at < now()`
- For each: `status = 'confirmed'`, `confirmed_at = now()`, recompute ELO for both kids, update floors, fire push notifications
- Idempotent: re-running is safe
- Failure: failed battles stay pending; cron retries next run

## 8. Daily-hook surfaces

### 8.1 Home / Dashboard (default landing)
- **Hello row:** avatar + greeting + current floor
- **Progress card:** "Heute schon X Kämpfe" + "Du bist Y Etagen weiter als gestern"
- **Big CTA:** "Was war heute?" → log-battle flow
- **Mini-feed:** 3 most recent crew events (battle, rank-up, new bey)
- **Personalized hook:** "Marie ist nur 3 Etagen über dir — schaffst du sie?" (computed: nearest kid above the user by ELO who's not at The Peak)
- **Bottom nav:** Heim · Tower · Karte · Beys

### 8.2 Tower view (leaderboard)
- The Peak at top with crown + champion avatar (single-occupant; gold-treated row)
- Scrollable sparse list of occupied floors + zone markers
- Self-row highlighted yellow
- Trend arrows for 24h floor movement
- Tap any kid → public profile

### 8.3 Profile

**Own profile (full view):**
- Hero card (the trading card; see Section 9)
- Stats grid: total battles · win % · current streak
- Tabs: Beys / Kämpfe / Sticker / Erfolge
- Beys tab: bey collection grid with W-L per bey + win-rate bar
- Kämpfe tab: last 20 battles, status visible
- Sticker tab: endorsements received with sender names
- Erfolge tab: milestone badges unlocked

**Public profile (other kids' view):**
- Hero card
- Stats grid
- Tabs: Beys / Kämpfe / Erfolge (Sticker tab hidden — private)

### 8.4 Crew feed (full view)
- Chronological list of all battles + crew events
- Three status states visually distinguished (pending = yellow border, confirmed = green, voided = red faded)
- 🚩 button on pending battles
- Filter by: all / pending / my battles / voided

### 8.5 Bey browser
- Catalog of all canonical beys with images
- Filter: type (attack/defense/stamina/balance), line (basic/custom/unique), owned-by-me
- Tap a bey → detail (stats, parts, owned-by counts in crew, recent battle results)
- "Mark as owned" toggle on bey detail → writes to `kid_beys`

## 9. Trading card universe

### 9.1 Five card stages (function of floor, which is itself a function of ELO per Section 6.2)
| Stage | Floor range | Visual treatment |
|---|---|---|
| Rookie | 1–20 | Plain matt black frame, no foil, 0 sticker slots |
| Local | 21–50 | Bronze frame, slash-cut overlay, 2 sticker slots |
| Regional | 51–80 | Silver frame, brighter slash, 4 sticker slots, X-watermark metallic |
| National | 81–99 | Gold frame, holo foil shimmer, tagline unlocked, 5 sticker slots |
| X-Champion | 100 (The Peak only) | Animated holo full-foil, floating crown, signature title, 8+ sticker slots, audio fanfare on view |

Card stage is purely visual — these are NOT separate ELO tiers. The 100-floor tower is the single ranking ladder; card stages are bundled-floor visual upgrades.

### 9.2 Card composition
- **Front:** kid avatar (top-center), kid name (CAPS italic display), tier label, floor number, primary bey name, sticker row, stats line, tagline (if unlocked), X-watermark
- **Back:** stats grid by category, sticker collection in detail, milestones unlocked, last 5 battles
- **QR card (physical):** same front + QR on back (no digital sticker collection on physical card)

### 9.3 Endorsement stickers
- 7-sticker palette in v1 (more added as content drops)
- Three rarities (`min_floor_to_send` aligned with card stages):
  - **Common** (🔥 Pure Fire, ⚔ GG, 💥 Burst!): 1 per day per recipient, available from Floor 1 (Rookie+)
  - **Rare** (⚡ X-Speed, 🐉 Drachen): 1 per week per recipient, unlocked at Floor 21+ (Local+)
  - **Legendary** (👑 Crown, 💎 X-Diamond): 3 per month total (across all recipients), unlocked at Floor 81+ (National+)
- Sent after a battle (success-screen optional CTA) or from another kid's profile
- Recipient gets push: "Marie hat dir 🔥 gegeben!"
- Stickers stack on card permanently

### 9.4 Tagline / nickname
- Unlocked at Floor 75 (National I band)
- Free-text 30-char field, kid edits in profile settings
- Admin (Marc) can override anstößige names via Werkstatt
- Displayed under kid name on card

### 9.5 Card animations
- Stage upgrade: card rotates, frame "schmiedet" itself (~2 sec), confetti
- Sticker arrival: sticker flies in from screen edge, lands on card with bounce
- Floor-up: floor number explodes briefly, new floor scrolls in from below
- All driven by Motion library

### 9.6 Share card
- Long-press card → "Als Bild teilen" via Web Share API
- Generates a PNG of the card (canvas render)
- For family chats / showing off

## 10. Art direction

### 10.1 Palette
- **Background:** deep black (#000) / crimson-black gradient (#170808 → #0a0a0a)
- **Accents:** Neon Yellow #FDE047, Crimson #DC2626, Cobalt #2563EB, White #FFFFFF
- **Forbid:** pastels, beige, muddy desaturated tones, generic dark-mode gray

### 10.2 Typography
- **Display headlines:** kursiv-fett display font (target candidates: Druk Wide Italic, Bahnsaal, Atlas Grotesk Italic — to be finalized at implementation kickoff)
- **Body:** system sans-serif
- **Numbers:** tabular-nums everywhere (scores, floors, ELO)
- **All-caps for impact:** "X-CHAMPION", "BURST FINISH", kid names on cards

### 10.3 Form language
- Diagonal slashes (45° / 22.5°) as signature element — slash through cards, slash through buttons
- X-watermarks at low opacity in card corners + section headers
- Angular cuts on buttons (slight 22° clip-path), not pure rounded rectangles
- Tournament-bracket style frame aesthetic

### 10.4 Material treatments
- Bronze / silver / gold / holographic frames as ladder progression
- Conic-gradient + animated rotation = holo foil effect for high-tier cards
- Glow shadows for important elements (CTA buttons, champion avatar, gold-tier text)

### 10.5 Motion / cel-shading
- Speed lines on action moments (battle eintragen success, rank-up)
- Impact frames (POW! / BURST!) for major events
- Card "schmieden" (forge) animation for stage upgrades
- Sticker fly-in on endorsement
- Cel-shaded transitions, hard cuts not gradient cross-fades — anime convention

### 10.6 Real assets in v1
- **Bey product photos:** scraped from canon wiki, mirrored to Supabase Storage, used inline in cards / log flow / profile / bey browser. **Never use abstract gradient placeholders for beys in production.**
- **Avatars — three options to compare in v1:**
  1. Kid uploads selfie + anime-cel-shading filter (cheapest; **not recommended** for child-safety)
  2. **Curated set of 20-30 anime-portrait avatars** kids pick from (commissioned ~€500 OR AI-gen one-time) — **recommended for v1**
  3. AI-generated anime portrait per kid via text prompt (variable quality)

  *Decision deferred to implementation kickoff. Spec assumes option 2.*

- **Backgrounds & UI illustrations:** commissioned or AI-gen anime-cel-shaded scenes (X-stadium, tower, action moments). Set of ~10 hero backgrounds + button textures.
- **Bey "in motion" renders:** 3D bey spinning + speed-line halo for home screen / battle success. Commissioned or AI-gen ~€300 starter set.

### 10.7 Sound (Phase 2)
- Bey-launch on CTA press
- Burst! on win-eintragen
- X-Champion! fanfare on Floor 100 reach
- All optional, behind a global "Sound an/aus" toggle

## 11. Bey roster + lore scraping

### 11.1 Three priority waves

**Wave 1 — v1 launch essentials (~30 URLs):**
- 27 canonical Beyblade X beys with full data: name (EN/JP), type, parts breakdown, stats, product image URL
- The X tower lore page (already scraped during brainstorm)
- Core terms: Xtreme Dash, Burst Finish, X-line, finish-type definitions (7 URLs)
- 4 starter beys featured in onboarding

**Wave 2 — Phase 1.5 post-launch (~80 URLs):**
- All teams (Phalanx, Pendragon, Future Pros, Cross Corporation)
- Main characters (10 URLs) — for fan-page browser
- Locations (Animal Castle, Beyblade City)
- Items / Random Boosters (27 URLs)

**Wave 3 — Phase 2 (~150-200 URLs):**
- Bey parts category crawl (Blades, Ratchets, Bits with stats)
- Powers the customizer

### 11.2 Implementation
- Admin panel "Werkstatt → Bey-Katalog scrapen" button → triggers Edge Function
- Edge Function reads URL list from JSON config (priority wave file)
- Per URL: `firecrawl_scrape` with JSON extraction schema → upsert `beys` / `characters` / `teams` row → download image → upload to Supabase Storage → set `image_url` to internal CDN
- Idempotent: only upserts when `scraped_at < 30 days ago` OR new URL
- Rate limit: 1 req/sec to wiki (be polite)
- Failure handling: failed URLs logged, manual retry button in admin

### 11.3 Storage strategy
- **Postgres:** all metadata (`beys`, `bey_parts`, `characters`, `teams`, etc.)
- **Supabase Storage:** mirrored images. Don't hot-link wiki CDN.
- **Image processing:** generate 256×256 thumbnails for cards, keep originals for detail
- **Image format:** WebP at 80% quality for thumbnails, original format for detail

### 11.4 URL inventory
Stored at `<project_root>/research/url-inventory.json` from brainstorm session. Schema:
```json
{
  "canon": {
    "beys": [{ "url": "...", "slug": "DranSword_3-60F" }, ...],
    "parts": [...],
    "characters": [...],
    "teams": [...],
    "locations": [...],
    "episodes": [...],
    "terms": [...],
    "items": [...],
    "uncategorized": [...]
  },
  "fanon": { /* same structure */ }
}
```

### 11.5 Legal & ethical
- Wiki text content: fair use for personal kids' app at this scale (15 users, no commercial sale)
- Bey product photos: Hasbro/Takara Tomy property; non-commercial fan use is fair, but never in monetized version
- If app monetizes, all bey art must be commissioned originals
- "Art credits / Lore source" link in admin/about page → wiki

### 11.6 Future: German retail availability (Phase 2)
- Monthly cron checks Amazon.de for current bey availability
- Sets `available_in_de` flag on each bey
- "Currently buyable" filter on bey-add screen

## 12. Copy guidelines (1st-grader pass)

All user-facing strings must be readable by a 7-year-old. Implementation MUST include a copy-review step before ship. Specific rules:

- **No abstract verbs.** "ausgegangen" → "wer hat gewonnen". "stattgefunden" → "war wirklich".
- **No tech jargon in UI.** Never "ELO", "Dispute", "Auto-confirm", "Status pending" — internal only.
- **Short sentences.** 5-8 words ideal, 12 hard cap.
- **Imperative + concrete actions.** "Eintragen", "Melden", "Doch nicht", "Weiter", "Zurück".
- **Numbers and names beat labels.** "Ich 3 — Marie 1" beats "Mein Score: 3 / Maries Score: 1".
- **Translate liberally from canon, but preserve real names.** "The Peak" stays. "DranSword" stays. "Approach Zone" → "Letzte 10 Etagen".
- **Status pills are kid-readable.** "⏳ Zählt in 23 Stunden" not "Status: pending". "✓ Zählt!" not "✓ Confirmed".

This guideline applies to all kid-targeted apps for Marc (durable across HeroDex / Ronki / Beyblade tracker / future).

## 13. Out of scope for v1 (full backlog)

**Battles & ranking**
- Two-tower split (Slash + Solidus) with personality bonuses + transfer + Title Match
- Team battles (real 2v2/3v3) with separate team ELO
- Warden's Test gatekeeper
- Glicko-2 ELO migration
- Margin-aware ELO (winning 3-0 gives more than 3-2)

**Tournaments** — bracket creation, RSVP, scoring, host coordination. Stub link only in v1.

**Bey customizer** — compose custom beys from parts with spider charts. Data model is Phase-2-ready.

**Bey parts catalog** — individual Blade/Ratchet/Bit pages via category crawl.

**Engagement extras**
- Predict-the-day morning matches
- Battle-of-the-week / replay theatre
- Real-time presence ("who's online now")
- Sound effects

**Admin & moderation**
- Repeat-offender tracking (auto-flag dispute-spammers)
- Other parents' admin / view-only dashboards

**Surface area**
- Multi-language (EN, JP)
- Public marketing / landing site
- App Store / Play Store distribution
- Monetization-ready commissioned art
- Currently-buyable-in-DE Amazon cron

**Easter eggs**
- True X Tower lore drop (canon reference, future content event)

### 5.9 Terminology — "crew" vs "team"
- **"Crew"** (lowercase or capitalized when used as a feature name like "Crew Feed") = the entire user pool of 5-15 kids who use the app together.
- **"Team"** (`teams` table) = a small in-app group kids form themselves; many-to-many membership; kids may have one primary team. Avoid the word "crews" (plural lowercase) for in-app teams to prevent confusion.

## 14. Open questions / decisions needed before implementation

1. **App name + URL.** TBD. Marc will decide; spec uses placeholders.
2. **Avatar approach.** Three options (uploaded selfie / curated set / AI-gen). Spec assumes curated set. Decision at implementation kickoff.
3. **Push notification scope.** Default trigger set: rank-up · dispute filed · endorsement received. Battle confirmed = silent (user already saw optimistic UI). User-configurable later.
4. **Bey roster auto-update cadence.** Manual button only (v1) or scheduled monthly? Spec assumes manual.
5. **Backup / data export.** Should kids export their battle history? If yes, format? Spec assumes no in v1.
6. **Crew size cap.** Does the app enforce a max N kids per crew? Default: no cap, performance-tested at 50+.
7. **Display font finalization.** Section 10.2 lists candidates; pick at impl kickoff.
8. **Holo foil performance.** Animated conic-gradient may stutter on lower-end Android tablets. Test on a kid-owned device early; fall back to static foil if needed.
9. **Parent consent / GDPR.** Each kid (under 16 in DE) requires explicit parent consent for data processing — display name, avatar, battle history. Marc handles this offline via printed consent forms before issuing QR cards. Flag for compliance review at implementation kickoff: do we need a parent-facing consent record stored in the app, or is paper sufficient?
10. **First-time kid experience.** After first QR scan, kid lands on home dashboard with no beys/battles. Spec doesn't dictate the onboarding UX; implementation should add a soft prompt ("Welche Beys hast du? Tippen zum auswählen.") to seed `kid_beys` before the first log-battle attempt.

## 15. Appendix

### 15.1 Files generated during brainstorm
- `<project>/research/url-inventory.json` — categorized wiki URL list (86 canon + 75 fanon)
- `<project>/research/_categorize_urls.py` — script to regenerate inventory
- `<project>/.superpowers/brainstorm/<session>/content/*.html` — visual companion mockups (tower options, log-battle flow, dispute flow, daily surfaces, trading cards)

### 15.2 Top-10 priority canon URLs for Wave 1 scrape
1. https://beyblade.fandom.com/wiki/DranSword_3-60F (flagship S1 protagonist bey)
2. https://beyblade.fandom.com/wiki/KnightLance_4-80HN (rival bey)
3. https://beyblade.fandom.com/wiki/HellsScythe_4-60T (antagonist bey)
4. https://beyblade.fandom.com/wiki/WizardArrow_4-80B (starter four)
5. https://beyblade.fandom.com/wiki/Robin_Kazami (main protagonist)
6. https://beyblade.fandom.com/wiki/The_X (central tower lore)
7. https://beyblade.fandom.com/wiki/Phalanx (main team)
8. https://beyblade.fandom.com/wiki/Pendragon (main team)
9. https://beyblade.fandom.com/wiki/List_of_Beyblade_X_products_(Takara_Tomy) (catalog gateway)
10. https://beyblade.fandom.com/wiki/Xtreme_Dash (core mechanic)

### 15.3 Brainstorm decisions log
- 5-15 kids, mixed devices, PWA installable + URL
- ELO under the hood, lore-themed rank tiers (single tower, 100 floors)
- Per-battle log: who won + score + which bey + optional finish types
- Trust + 24h dispute window, anyone can flag, disputed = auto-void, admin override
- QR-card auth, German UI, English/Japanese for proper nouns
- Approach 3 scope (Trading Card Universe + crews + bey roster scraping)
- Crews are social groupings only (1v1 battles in v1)
- ELO K = 16
- Single tower (Slash/Solidus deferred to Phase 2)
- Tournaments TBD with stub
- Art direction = anime cel-shaded, BX palette, real bey product art inline
- Copy-level constraint: 1st-grader readability
