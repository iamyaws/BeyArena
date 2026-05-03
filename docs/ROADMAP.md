# BeyArena Roadmap

Living backlog for things we've decided NOT to ship in the current cycle, plus future projects parked deliberately. Update as items land or ideas surface.

**Status tags:**
- 🟢 **Active** — currently in build (link to spec/plan)
- 🟡 **Next-up** — top of backlog, likely next sprint
- ⏸ **Parked** — known good idea, awaiting trigger or capacity
- 🧊 **Speculative** — pitched but not validated; needs design pass before commit
- ✅ **Shipped** — for context / lookback

Last updated: 2026-05-03

---

## Active

| Project | Status | Notes |
|---|---|---|
| Battle Lab v1 | 🟢 Active | `docs/superpowers/specs/2026-05-03-battle-lab-design.md` + `docs/superpowers/plans/2026-05-03-battle-lab.md`. ~10 days, 24 tasks. Branch: `feat/battle-lab`. |

---

## Battle Lab — follow-ups

Deferred from v1 to keep scope honest. Build order is observation-driven: ship v1, watch Louis play, pick the next layer based on what he flags.

| Item | Status | Trigger / when |
|---|---|---|
| Best-of-3 mode toggle ("Echt" vs "Schnell") | 🟡 Next-up | If single-round feels too quick once Louis has played 20+ rounds |
| One-tap timing input (power-meter swing) | ⏸ Parked | If Louis says "da macht man immer noch nichts" inside the Lab |
| Canvas/physics renderer (Q12=D upgrade) | ⏸ Parked | If the Motion choreography feels flat after 2 weeks |
| Parts customizer (Blade/Ratchet/Bit editing) | ⏸ Parked | v2; ~weeks of work, big UI surface |
| More trainers (beyond the 5) | ⏸ Parked | Trivial to add (one array entry); add if Louis names specific characters he wants |
| Persistent Lab stats / Lab-rank | ⏸ Parked | Q3=A locked sandbox; revisit only if Marc decides Lab should bleed into the real ladder |
| Lab leaderboards | ⏸ Parked | Same |
| Achievements / badges beyond "Heute besiegt" | ⏸ Parked | Same |
| Multiplayer Lab (kid vs kid live) | 🧊 Speculative | Real-time over Supabase Realtime; needs design pass |
| User-created trainers | 🧊 Speculative | Probably not — would need moderation surface |

---

## BeyArena — beyond the Lab

Items deferred from the original MVP spec (`docs/superpowers/specs/2026-04-26-beyblade-x-tracker-design.md`) plus things we've named since.

### Near-term polish

| Item | Status | Notes |
|---|---|---|
| Reactions in feed (Tier 2 — stickers, emoji) | 🟡 Next-up | Marc's split: Tier 1 = celebration GIFs (✅ shipped 2026-05-03), Tier 2 = peer feedback |
| Real bey ownership UX | 🟡 Next-up | `kid_beys` table exists but most kids' rows are empty. Need an "I own this" flow — maybe via QR scan on a real-world bey package, maybe admin-set in Werkstatt |
| Push notifications | ⏸ Parked | Web Push API + VAPID infra in place but unused. Useful for: dispute alerts, rank changes, daily nudge |
| Parent dashboard | ⏸ Parked | Read-only view of the kid's activity for parents who want context |
| Auth: leaked-password-protection toggle in Supabase | 🟡 Next-up | One toggle in Supabase Auth settings; only outstanding advisory |

### Bigger surfaces

| Item | Status | Notes |
|---|---|---|
| Tournaments | ⏸ Parked | Currently a stub link. Real tournaments need bracket logic + scheduling |
| Team battles | ⏸ Parked | Crews are social groupings only in v1 |
| Two-tower split (Slash + Solidus) | ⏸ Parked | Real BX lore; would split the 100-floor tower into 2× 50-floor |
| Bey trading | ⏸ Parked | Kid-to-kid bey transfer; needs anti-grief design (parent confirm? cool-off?) |
| Public landing page | ⏸ Parked | Currently auth-gated; SEO + parent on-ramp would benefit from a public face |
| Multi-language (English) | ⏸ Parked | German-only by design for Louis's crew. Could open the door to wider beta |

### Standalone future projects

| Project | Status | Notes |
|---|---|---|
| Pokelike-shaped roguelike ("X-Turm: Pro League" candidate) | 🧊 Speculative | Separate from Lab. Research saved at `.research/pokelike-index.html` + 4 agent reports in earlier conversations. ~100-120h estimate. Tackle after Battle Lab v1 is in Louis's hands |

---

## Ops / housekeeping

| Item | Status | Notes |
|---|---|---|
| Clean dirty working tree | 🟡 Next-up | `.gitignore`, `package-lock.json`, `package.json` modified; `.design-handoff/`, `.research/` untracked dirs. Pending Marc's call on what to keep + commit |
| Sound assets sourcing for Lab | 🟢 Active | CC0 from freesound.org per plan Task 21. `public/sounds/lab/CREDITS.md` template will travel with the commit |
| Document service worker behavior | ⏸ Parked | `vite.config.ts` workbox config (skipWaiting + clientsClaim) is non-obvious; would help future-Marc if there's a SW issue |

---

## Process notes

- This file is an additive log, not a gantt chart. Don't delete shipped items — move to ✅ for context.
- When a 🟡 / ⏸ item moves to 🟢 Active, link the spec/plan paths inline.
- 🧊 Speculative items must get a design pass before they can be promoted; don't commit to a 🧊 item directly from the roadmap.
- Anything Marc flags for spawn (via the spawn_task tool or explicitly in chat) lands here as a 🟡 unless tagged otherwise.
