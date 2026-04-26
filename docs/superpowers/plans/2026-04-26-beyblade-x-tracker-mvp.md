# Beyblade X Tracker — MVP Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working PWA where 5-15 first-grade kids can log Beyblade X battles, climb a 100-floor tower called "The X" by ELO, dispute logged battles within a 24h window, and view leaderboard + profiles + crew feed. Admin (Marc) can create kid accounts, print QR-card credentials, and override disputes via a Werkstatt panel. Sets foundation for Plan 2 (cards + engagement) and Plan 3 (bey scraping).

**Architecture:** Vite + React PWA frontend with Supabase backend. Kids authenticate via printed QR cards (admin generates on creation). Battle logging is offline-tolerant via IndexedDB queue. ELO recomputed in Edge Function on battle confirm; auto-confirm cron runs every 5 min. Postgres tables RLS-scoped via custom JWT containing `kid_id` claim.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, TanStack Query 5, Zustand 4, Motion (framer-motion-equivalent), html5-qrcode, vite-plugin-pwa, Supabase (Postgres + Auth + Edge Functions/Deno + Storage + Realtime), Vitest 1 + @testing-library/react, Vercel for deploy, pdf-lib for QR card generation.

**Out of this plan (deferred):**
- Trading-card visuals (5 tiers, holo foils, X-watermarks, slash-cuts, animations) — Plan 2. v1 profile uses a basic card placeholder (avatar + name + floor + stats line).
- Endorsement stickers + sending flow + sticker catalog — Plan 2.
- Push notifications (subscribe/send/notif inbox) — Plan 2. v1 uses in-app notifications panel only (read-only list).
- Tagline / nickname editing — Plan 2.
- Card share-as-image — Plan 2.
- Bey roster scraping pipeline — Plan 3. v1 uses a manual JSON seed of 4 starter beys (DranSword, KnightLance, HellsScythe, WizardArrow).
- Bey browser, bey detail pages, bey ownership management UI — Plan 3. v1 just allows logging which bey was used (from the 4 seeded).
- Phase 2 character/team/location scrapes — Plan 3.
- Real Beyblade X art assets (anime-cel-shaded avatars, backgrounds, in-motion bey renders) — handled separately as art commission deliverables; spec uses CSS placeholder treatment in MVP and swaps assets in at design-finalization.

**Project root:** `<project_root>` — Marc to name the actual app and final directory before this plan executes. Plan uses `<project_root>` as a placeholder; engineer substitutes the real path at task 1.

**Required external setup before plan starts:**
- Supabase project created (free tier sufficient for v1). Project URL + anon key + service-role key available.
- Vercel account connected to a GitHub repo at `<project_root>`.
- Marc's admin email: hardcoded in `.env` as `VITE_ADMIN_EMAIL`.

---

## File structure (created during this plan)

```
<project_root>/
├── .env.example
├── .env.local                      # gitignored, real values
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── public/
│   ├── icons/icon-192.png
│   ├── icons/icon-512.png
│   ├── icons/maskable-512.png
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── floor.ts                # ELO ↔ floor calculation (shared client/server)
│   │   ├── elo.ts                  # ELO computation
│   │   ├── auth.ts
│   │   ├── offline-queue.ts        # IndexedDB battle queue
│   │   └── types.ts                # generated Supabase types + app types
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useKid.ts
│   │   ├── useBattles.ts
│   │   └── useTower.ts
│   ├── stores/
│   │   └── session.ts              # Zustand: current kid, draft battle
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Stepper.tsx
│   │   │   └── ...
│   │   ├── nav/
│   │   │   └── BottomNav.tsx
│   │   ├── battle/
│   │   │   ├── BattleCard.tsx
│   │   │   ├── OpponentPicker.tsx
│   │   │   ├── ScoreInput.tsx
│   │   │   ├── BeyPicker.tsx
│   │   │   └── DisputeSheet.tsx
│   │   ├── tower/
│   │   │   ├── TowerView.tsx
│   │   │   └── TowerRow.tsx
│   │   └── profile/
│   │       ├── ProfileCard.tsx
│   │       └── StatGrid.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── TowerPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── PublicProfilePage.tsx
│   │   ├── FeedPage.tsx
│   │   ├── LogBattleFlow.tsx
│   │   ├── QrLoginPage.tsx
│   │   ├── AdminLoginPage.tsx
│   │   └── werkstatt/
│   │       ├── WerkstattLayout.tsx
│   │       ├── KidsListPage.tsx
│   │       ├── CreateKidPage.tsx
│   │       └── DisputesPage.tsx
│   └── test/
│       ├── setup.ts
│       └── helpers.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_init_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_indexes.sql
│   │   └── 0004_seed_starter_beys.sql
│   └── functions/
│       ├── exchange-token/
│       │   └── index.ts
│       ├── confirm-pending/
│       │   └── index.ts
│       └── dispute-battle/
│           └── index.ts
└── tests/
    ├── unit/
    │   ├── floor.test.ts
    │   ├── elo.test.ts
    │   └── ...
    └── integration/
        └── ...
```

---

# Phase A — Foundation

## Task 1: Initialize Vite + React + TypeScript

**Files:**
- Create: `<project_root>/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Run scaffolding command**

```bash
cd <project_root>
npm create vite@latest . -- --template react-ts
```
Expected: Vite scaffolds React+TS project. Confirm overwrites if prompted.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```
Expected: server on http://localhost:5173 with default Vite welcome page.
Stop it: Ctrl-C.

- [ ] **Step 4: Replace `src/App.tsx` boilerplate with minimal shell**

```tsx
// src/App.tsx
export default function App() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1>Beyblade X Tracker</h1>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite + React + TypeScript"
```

---

## Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/index.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // BX palette (Section 10.1 of spec)
        'bx-yellow': '#FDE047',
        'bx-crimson': '#DC2626',
        'bx-cobalt': '#2563EB',
      },
      fontFamily: {
        display: ['"Druk Wide"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Replace `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-black text-white; }
}
```

- [ ] **Step 4: Verify Tailwind works**

Run `npm run dev`. The `bg-black text-white` should apply.
Stop server.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts postcss.config.js src/index.css
git commit -m "feat: configure Tailwind with BX palette"
```

---

## Task 3: Install core runtime dependencies

**Files:**
- Modify: `package.json` (via npm install commands)

- [ ] **Step 1: Install runtime deps**

```bash
npm install @supabase/supabase-js@2 @tanstack/react-query@5 zustand@4 motion@latest html5-qrcode@2 idb@8 react-router-dom@6 pdf-lib@1
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D vitest@1 @testing-library/react@14 @testing-library/jest-dom@6 @vitest/ui@1 jsdom@23 @types/react@18 @types/react-dom@18 eslint@8 prettier@3 eslint-config-prettier@9
```

- [ ] **Step 3: Verify package.json**

```bash
cat package.json
```
Expected: all listed packages present in `dependencies` and `devDependencies`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install runtime + dev dependencies"
```

---

## Task 4: Configure Vitest + React Testing Library

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Modify: `package.json` scripts

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 2: Install vite-react plugin if missing**

```bash
npm install -D @vitejs/plugin-react
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test script to `package.json`**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 5: Write smoke test `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders title', () => {
  render(<App />);
  expect(screen.getByText('Beyblade X Tracker')).toBeInTheDocument();
});
```

- [ ] **Step 6: Run tests**

```bash
npm run test:run
```
Expected: 1 test passes.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/test/setup.ts src/App.test.tsx package.json
git commit -m "feat: configure Vitest + RTL with smoke test"
```

---

## Task 5: ESLint + Prettier

**Files:**
- Create: `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`

- [ ] **Step 1: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
  },
};
```

- [ ] **Step 2: Install missing eslint plugins**

```bash
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react-refresh
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
node_modules
dist
*.md
```

- [ ] **Step 5: Add scripts to `package.json`**

```json
"lint": "eslint src --ext .ts,.tsx",
"format": "prettier --write src"
```

- [ ] **Step 6: Run lint**

```bash
npm run lint
```
Expected: no errors (warnings ok).

- [ ] **Step 7: Commit**

```bash
git add .eslintrc.cjs .prettierrc .prettierignore package.json
git commit -m "feat: add ESLint + Prettier"
```

---

## Task 6: Folder structure + barrel files

**Files:**
- Create: empty `src/lib/`, `src/hooks/`, `src/stores/`, `src/components/{ui,nav,battle,tower,profile}/`, `src/pages/{werkstatt}/`

- [ ] **Step 1: Create directories**

```bash
mkdir -p src/lib src/hooks src/stores
mkdir -p src/components/ui src/components/nav src/components/battle src/components/tower src/components/profile
mkdir -p src/pages/werkstatt
mkdir -p tests/unit tests/integration
```

- [ ] **Step 2: Add `.gitkeep` to each empty dir so git tracks them**

```bash
touch src/lib/.gitkeep src/hooks/.gitkeep src/stores/.gitkeep
touch src/components/ui/.gitkeep src/components/nav/.gitkeep
touch src/components/battle/.gitkeep src/components/tower/.gitkeep src/components/profile/.gitkeep
touch src/pages/werkstatt/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add src tests
git commit -m "chore: scaffold folder structure"
```

---

## Task 7: Routing scaffold with React Router

**Files:**
- Create: `src/routes.tsx`
- Modify: `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Replace `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 2: Create `src/routes.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';

// Placeholders — full pages added in later tasks
const Home = () => <div className="p-6">Home — coming in Task 49</div>;
const Tower = () => <div className="p-6">Tower — Task 42</div>;
const Profile = () => <div className="p-6">Profile — Task 44</div>;
const Feed = () => <div className="p-6">Feed — Task 47</div>;
const LogBattle = () => <div className="p-6">Log — Task 31</div>;
const QrLogin = () => <div className="p-6">QR Login — Task 23</div>;
const AdminLogin = () => <div className="p-6">Admin Login — Task 21</div>;
const Werkstatt = () => <div className="p-6">Werkstatt — Task 52</div>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tower" element={<Tower />} />
      <Route path="/profil" element={<Profile />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/log" element={<LogBattle />} />
      <Route path="/q/:token" element={<QrLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/werkstatt/*" element={<Werkstatt />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Update `src/App.tsx`**

```tsx
import { AppRoutes } from './routes';

export default function App() {
  return <AppRoutes />;
}
```

- [ ] **Step 4: Run dev server, test routes**

```bash
npm run dev
```
Visit `/`, `/tower`, `/q/abc` — each shows the placeholder. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx src/routes.tsx
git commit -m "feat: add React Router + TanStack Query providers + placeholder routes"
```

---

## Task 8: Env scaffolding

**Files:**
- Create: `.env.example`, `.env.local` (gitignored), `src/lib/env.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ADMIN_EMAIL=
```

- [ ] **Step 2: Add `.env.local` to `.gitignore`**

```
# .gitignore (append if not present)
.env
.env.local
```

- [ ] **Step 3: Create `src/lib/env.ts`**

```ts
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  SUPABASE_URL: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  ADMIN_EMAIL: required('VITE_ADMIN_EMAIL', import.meta.env.VITE_ADMIN_EMAIL),
};
```

- [ ] **Step 4: Create local `.env.local` with placeholders (engineer fills with real Supabase values)**

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_ADMIN_EMAIL=marc.foerste@googlemail.com
```

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore src/lib/env.ts
git commit -m "feat: env scaffolding"
```

---

# Phase B — Supabase + Schema

## Task 9: Supabase project init + CLI

**Files:**
- Create: `supabase/config.toml` (auto-generated)

- [ ] **Step 1: Install Supabase CLI globally** (if not present)

```bash
npm install -g supabase
```

- [ ] **Step 2: Login + link to project**

```bash
supabase login
cd <project_root>
supabase init
supabase link --project-ref <YOUR_PROJECT_REF>
```

- [ ] **Step 3: Verify connection**

```bash
supabase db remote ls
```
Expected: lists remote DB info.

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml supabase/.gitignore
git commit -m "feat: init Supabase project"
```

---

## Task 10: Migration — `kids` + `teams` + `team_members`

**Files:**
- Create: `supabase/migrations/0001_init_schema_part1.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0001_init_schema_part1.sql

-- enable required extension
create extension if not exists "uuid-ossp";

-- kids
create table kids (
  id uuid primary key default uuid_generate_v4(),
  display_name text not null,
  avatar_url text,
  primary_team_id uuid,
  token_hash text not null unique,
  elo int not null default 800,
  floor int not null default 1,
  card_color_hex text,
  tagline text,
  created_at timestamptz not null default now(),
  created_by_admin_id uuid
);

-- teams
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color_hex text not null,
  logo_url text,
  created_by_kid_id uuid references kids(id) on delete set null,
  created_at timestamptz not null default now()
);

-- back-fill FK from kids.primary_team_id
alter table kids add constraint kids_primary_team_fk
  foreign key (primary_team_id) references teams(id) on delete set null;

-- team_members
create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  kid_id uuid not null references kids(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, kid_id)
);

-- push subscriptions (used in Plan 2; table created now to avoid late migration)
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  kid_id uuid not null references kids(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (kid_id, endpoint)
);
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```
Expected: 4 tables created. Verify: `supabase db remote tables`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init_schema_part1.sql
git commit -m "feat: schema part 1 — kids, teams, team_members, push_subscriptions"
```

---

## Task 11: Migration — `beys` + `bey_parts` + `kid_beys`

**Files:**
- Create: `supabase/migrations/0002_init_schema_beys.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0002_init_schema_beys.sql

create type bey_type as enum ('attack', 'defense', 'stamina', 'balance');
create type bey_line as enum ('basic', 'custom', 'unique');
create type bey_part_kind as enum ('blade', 'ratchet', 'bit');

create table bey_parts (
  id uuid primary key default uuid_generate_v4(),
  kind bey_part_kind not null,
  name text not null,
  stat_attack int,
  stat_defense int,
  stat_stamina int,
  stat_burst_resistance int,
  image_url text,
  source_url text,
  created_at timestamptz not null default now()
);

create table beys (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_de text,
  name_jp text,
  product_code text,
  image_url text,
  type bey_type,
  line bey_line,
  blade_id uuid references bey_parts(id) on delete set null,
  ratchet_id uuid references bey_parts(id) on delete set null,
  bit_id uuid references bey_parts(id) on delete set null,
  stat_attack int,
  stat_defense int,
  stat_stamina int,
  stat_burst_resistance int,
  source_url text,
  available_in_de bool not null default false,
  canonical bool not null default true,
  scraped_at timestamptz,
  created_at timestamptz not null default now()
);

create table kid_beys (
  kid_id uuid not null references kids(id) on delete cascade,
  bey_id uuid not null references beys(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  nickname text,
  primary key (kid_id, bey_id)
);
```

- [ ] **Step 2: Apply**

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_init_schema_beys.sql
git commit -m "feat: schema part 2 — bey_parts, beys, kid_beys"
```

---

## Task 12: Migration — `battles` + `battle_rounds` + `disputes`

**Files:**
- Create: `supabase/migrations/0003_init_schema_battles.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0003_init_schema_battles.sql

create type battle_status as enum ('pending', 'confirmed', 'voided');
create type finish_type as enum ('spin', 'over', 'burst', 'extreme');
create type dispute_reason as enum (
  'wrong_score', 'didnt_happen', 'wrong_opponent', 'wrong_bey', 'other'
);

create table battles (
  id uuid primary key default uuid_generate_v4(),
  logger_kid_id uuid not null references kids(id) on delete restrict,
  winner_kid_id uuid not null references kids(id) on delete restrict,
  loser_kid_id uuid not null references kids(id) on delete restrict,
  winner_score int not null,
  loser_score int not null,
  winner_bey_id uuid references beys(id) on delete set null,
  loser_bey_id uuid references beys(id) on delete set null,
  status battle_status not null default 'pending',
  logged_at timestamptz not null default now(),
  confirmed_at timestamptz,
  voided_at timestamptz,
  voided_reason text,
  dispute_window_ends_at timestamptz generated always as (logged_at + interval '24 hours') stored,
  check (winner_kid_id <> loser_kid_id),
  check (winner_score > loser_score),
  check (winner_score >= 0 and loser_score >= 0)
);

create table battle_rounds (
  battle_id uuid not null references battles(id) on delete cascade,
  round_number int not null,
  finish_type finish_type not null,
  winner_kid_id uuid not null references kids(id) on delete restrict,
  points int not null,
  primary key (battle_id, round_number)
);

create table disputes (
  id uuid primary key default uuid_generate_v4(),
  battle_id uuid not null references battles(id) on delete cascade,
  disputer_kid_id uuid not null references kids(id) on delete cascade,
  reason_code dispute_reason not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (battle_id, disputer_kid_id)
);
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_init_schema_battles.sql
git commit -m "feat: schema part 3 — battles, battle_rounds, disputes"
```

---

## Task 13: Migration — `notifications` + `milestones` (catalog only)

**Files:**
- Create: `supabase/migrations/0004_init_schema_engagement.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0004_init_schema_engagement.sql

create type notification_kind as enum (
  'battle_confirmed', 'battle_voided', 'rank_up',
  'dispute_against_you', 'new_endorsement', 'milestone_unlocked', 'admin_msg'
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  kid_id uuid not null references kids(id) on delete cascade,
  kind notification_kind not null,
  payload_json jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Catalog tables (rows seeded in Task 18 + Plan 2)
create table milestones (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  icon_url text,
  created_at timestamptz not null default now()
);

create table kid_milestones (
  kid_id uuid not null references kids(id) on delete cascade,
  milestone_id uuid not null references milestones(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (kid_id, milestone_id)
);

-- Sticker catalog table created now (rows + endorsements logic in Plan 2)
create type sticker_rarity as enum ('common', 'rare', 'legendary');

create table stickers (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  emoji_or_image text not null,
  rarity sticker_rarity not null,
  min_floor_to_send int not null default 1,
  created_at timestamptz not null default now()
);

create table endorsements (
  id uuid primary key default uuid_generate_v4(),
  from_kid_id uuid not null references kids(id) on delete cascade,
  to_kid_id uuid not null references kids(id) on delete cascade,
  sticker_id uuid not null references stickers(id) on delete restrict,
  after_battle_id uuid references battles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_kid_id <> to_kid_id)
);
```

- [ ] **Step 2: Apply**

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_init_schema_engagement.sql
git commit -m "feat: schema part 4 — notifications, milestones, stickers (catalogs)"
```

---

## Task 14: RLS policies

**Files:**
- Create: `supabase/migrations/0005_rls.sql`

Policies follow Section 5.7 of the spec. Custom JWT carries `kid_id` claim.

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0005_rls.sql

-- Helper: extract kid_id from JWT claims
create or replace function auth.kid_id() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'kid_id', '')::uuid $$;

create or replace function auth.is_admin() returns boolean
  language sql stable
  as $$ select coalesce((current_setting('request.jwt.claims', true)::json->>'role') = 'admin', false) $$;

-- Enable RLS on all tables
alter table kids enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table push_subscriptions enable row level security;
alter table beys enable row level security;
alter table bey_parts enable row level security;
alter table kid_beys enable row level security;
alter table battles enable row level security;
alter table battle_rounds enable row level security;
alter table disputes enable row level security;
alter table notifications enable row level security;
alter table milestones enable row level security;
alter table kid_milestones enable row level security;
alter table stickers enable row level security;
alter table endorsements enable row level security;

-- KIDS: everyone reads everyone (public profiles); kid writes own profile basics; admin all
create policy kids_read on kids for select using (true);
create policy kids_update_self on kids for update
  using (id = auth.kid_id())
  with check (id = auth.kid_id());
create policy kids_admin_all on kids for all
  using (auth.is_admin())
  with check (auth.is_admin());

-- TEAMS: read all; create by any kid; update by creator
create policy teams_read on teams for select using (true);
create policy teams_insert on teams for insert with check (created_by_kid_id = auth.kid_id() or auth.is_admin());
create policy teams_update on teams for update
  using (created_by_kid_id = auth.kid_id() or auth.is_admin())
  with check (created_by_kid_id = auth.kid_id() or auth.is_admin());

-- TEAM_MEMBERS: read all; insert/delete by self
create policy team_members_read on team_members for select using (true);
create policy team_members_insert on team_members for insert with check (kid_id = auth.kid_id() or auth.is_admin());
create policy team_members_delete on team_members for delete using (kid_id = auth.kid_id() or auth.is_admin());

-- PUSH_SUBSCRIPTIONS: own only
create policy push_subs_self on push_subscriptions for all
  using (kid_id = auth.kid_id() or auth.is_admin())
  with check (kid_id = auth.kid_id() or auth.is_admin());

-- BEYS / BEY_PARTS: read all; admin writes
create policy beys_read on beys for select using (true);
create policy beys_admin on beys for all using (auth.is_admin()) with check (auth.is_admin());
create policy bey_parts_read on bey_parts for select using (true);
create policy bey_parts_admin on bey_parts for all using (auth.is_admin()) with check (auth.is_admin());

-- KID_BEYS: read all; write own
create policy kid_beys_read on kid_beys for select using (true);
create policy kid_beys_write on kid_beys for all
  using (kid_id = auth.kid_id() or auth.is_admin())
  with check (kid_id = auth.kid_id() or auth.is_admin());

-- BATTLES: read all; insert by logger=self; update by Edge Functions only (service role)
create policy battles_read on battles for select using (true);
create policy battles_insert on battles for insert
  with check (logger_kid_id = auth.kid_id() and (winner_kid_id = auth.kid_id() or loser_kid_id = auth.kid_id()));
-- update + delete reserved for service role + admin only (no kid policy = denied)
create policy battles_admin_all on battles for all using (auth.is_admin()) with check (auth.is_admin());

-- BATTLE_ROUNDS: read all; insert by logger of parent battle
create policy battle_rounds_read on battle_rounds for select using (true);
create policy battle_rounds_insert on battle_rounds for insert
  with check (exists(select 1 from battles where id = battle_id and logger_kid_id = auth.kid_id()));

-- DISPUTES: read all; insert by self
create policy disputes_read on disputes for select using (true);
create policy disputes_insert on disputes for insert
  with check (disputer_kid_id = auth.kid_id());

-- NOTIFICATIONS: read/update own
create policy notifs_read on notifications for select using (kid_id = auth.kid_id() or auth.is_admin());
create policy notifs_update on notifications for update
  using (kid_id = auth.kid_id())
  with check (kid_id = auth.kid_id());

-- MILESTONES / KID_MILESTONES / STICKERS: read all; admin writes catalog; service role grants kid_milestones
create policy milestones_read on milestones for select using (true);
create policy milestones_admin on milestones for all using (auth.is_admin()) with check (auth.is_admin());
create policy kid_milestones_read on kid_milestones for select using (true);
create policy stickers_read on stickers for select using (true);
create policy stickers_admin on stickers for all using (auth.is_admin()) with check (auth.is_admin());

-- ENDORSEMENTS: read all; insert by from_kid_id = self
create policy endorsements_read on endorsements for select using (true);
create policy endorsements_insert on endorsements for insert with check (from_kid_id = auth.kid_id());
```

- [ ] **Step 2: Apply**

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_rls.sql
git commit -m "feat: RLS policies for all tables"
```

---

## Task 15: Indexes

**Files:**
- Create: `supabase/migrations/0006_indexes.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0006_indexes.sql

create index battles_logged_at_idx on battles (logged_at desc);
create index battles_dispute_window_pending_idx
  on battles (dispute_window_ends_at) where status = 'pending';
create index battles_winner_idx on battles (winner_kid_id);
create index battles_loser_idx on battles (loser_kid_id);
create index kid_beys_kid_idx on kid_beys (kid_id);
create index team_members_kid_idx on team_members (kid_id);
create index team_members_team_idx on team_members (team_id);
create index kid_milestones_kid_idx on kid_milestones (kid_id);
create index endorsements_to_idx on endorsements (to_kid_id);
create index notifications_kid_unread_idx on notifications (kid_id) where read_at is null;
```

- [ ] **Step 2: Apply + commit**

```bash
supabase db push
git add supabase/migrations/0006_indexes.sql
git commit -m "feat: performance indexes"
```

---

## Task 16: Seed starter beys

**Files:**
- Create: `supabase/migrations/0007_seed_starter_beys.sql`

The 4 starter beys per spec Section 11.1 Wave 1. Real product data from canon.

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0007_seed_starter_beys.sql

insert into beys (name_en, name_jp, product_code, type, line, stat_attack, stat_defense, stat_stamina, stat_burst_resistance, source_url, canonical) values
  ('DranSword 3-60F', 'ドランソード 3-60F', 'BX-01', 'attack', 'basic', 8, 4, 5, 5, 'https://beyblade.fandom.com/wiki/DranSword_3-60F', true),
  ('HellsScythe 4-60T', 'ヘルズサイズ 4-60T', 'BX-02', 'balance', 'basic', 6, 6, 7, 5, 'https://beyblade.fandom.com/wiki/HellsScythe_4-60T', true),
  ('WizardArrow 4-80B', 'ウィザードアロー 4-80B', 'BX-03', 'stamina', 'basic', 5, 5, 8, 6, 'https://beyblade.fandom.com/wiki/WizardArrow_4-80B', true),
  ('KnightLance 4-80HN', 'ナイトランス 4-80HN', 'BX-04', 'defense', 'basic', 5, 8, 6, 7, 'https://beyblade.fandom.com/wiki/KnightLance_4-80HN', true);
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
```
Verify in Supabase dashboard: 4 rows in `beys` table.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_seed_starter_beys.sql
git commit -m "feat: seed 4 starter beys (DranSword, HellsScythe, WizardArrow, KnightLance)"
```

---

## Task 17: Generate TypeScript types from Supabase

**Files:**
- Create: `src/lib/supabase-types.ts`
- Modify: `package.json` scripts

- [ ] **Step 1: Add script to `package.json`**

```json
"types:supabase": "supabase gen types typescript --linked > src/lib/supabase-types.ts"
```

- [ ] **Step 2: Run it**

```bash
npm run types:supabase
```
Expected: file generated with types for all tables.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase-types.ts package.json
git commit -m "feat: generate Supabase TS types"
```

---

## Task 18: Supabase client + types module

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/types.ts`

- [ ] **Step 1: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from './supabase-types';

export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false }, // we manage session via custom JWT
  },
);

export function setAuthToken(token: string | null) {
  if (token) {
    supabase.auth.setSession({ access_token: token, refresh_token: '' } as never);
  }
}
```

- [ ] **Step 2: Create `src/lib/types.ts`**

```ts
import type { Database } from './supabase-types';

export type Kid = Database['public']['Tables']['kids']['Row'];
export type Bey = Database['public']['Tables']['beys']['Row'];
export type Battle = Database['public']['Tables']['battles']['Row'];
export type Dispute = Database['public']['Tables']['disputes']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type DraftBattle = {
  opponent_kid_id: string;
  i_won: boolean;
  my_score: number;
  opp_score: number;
  my_bey_id: string | null;
  opp_bey_id: string | null;
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts src/lib/types.ts
git commit -m "feat: Supabase client + typed exports"
```

---

# Phase C — Auth (QR cards)

## Task 19: Floor + ELO calculation utilities (shared)

**Files:**
- Create: `src/lib/floor.ts`, `src/lib/elo.ts`
- Test: `tests/unit/floor.test.ts`, `tests/unit/elo.test.ts`

These functions are pure and shared between client (optimistic UI) and Edge Functions (authoritative compute).

- [ ] **Step 1: Write failing test for floor calc**

```ts
// tests/unit/floor.test.ts
import { describe, it, expect } from 'vitest';
import { eloToFloor } from '../../src/lib/floor';

describe('eloToFloor (Section 6.2 of spec)', () => {
  it('returns 1 for starting elo 800', () => expect(eloToFloor(800)).toBe(1));
  it('returns 1 for elo 800-809', () => expect(eloToFloor(809)).toBe(1));
  it('returns 2 for elo 810', () => expect(eloToFloor(810)).toBe(2));
  it('returns 90 for elo 1690', () => expect(eloToFloor(1690)).toBe(90));
  it('returns 90 for elo 1699', () => expect(eloToFloor(1699)).toBe(90));
  it('returns 91 for elo 1700', () => expect(eloToFloor(1700)).toBe(91));
  it('returns 91 for elo 1732', () => expect(eloToFloor(1732)).toBe(91));
  it('returns 92 for elo 1733', () => expect(eloToFloor(1733)).toBe(92));
  it('returns 99 for elo 1964', () => expect(eloToFloor(1964)).toBe(99));
  it('returns 99 for elo 5000 (no king-of-hill applied)', () => expect(eloToFloor(5000)).toBe(99));
});
```

- [ ] **Step 2: Run, verify fails**

```bash
npm run test:run tests/unit/floor.test.ts
```
Expected: FAIL — `eloToFloor` undefined.

- [ ] **Step 3: Implement `src/lib/floor.ts`**

```ts
// src/lib/floor.ts
// Per spec Section 6.2. king-of-the-hill (floor 100) is NOT applied here —
// it's resolved at query time based on crew rankings, not a pure function of ELO.

export function eloToFloor(elo: number): number {
  if (elo < 800) return 1;
  if (elo < 1700) {
    return Math.floor((elo - 800) / 10) + 1;
  }
  // 91-99 zone: 33 ELO per floor, capped at 99
  const floor = 91 + Math.floor((elo - 1700) / 33);
  return Math.min(floor, 99);
}

export function floorToMinElo(floor: number): number {
  if (floor <= 1) return 800;
  if (floor <= 90) return 800 + (floor - 1) * 10;
  if (floor <= 99) return 1700 + (floor - 91) * 33;
  return 1964 + 1; // floor 100 = top, no fixed elo threshold
}
```

- [ ] **Step 4: Run, verify passes**

```bash
npm run test:run tests/unit/floor.test.ts
```

- [ ] **Step 5: Write ELO test**

```ts
// tests/unit/elo.test.ts
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
```

- [ ] **Step 6: Verify fails**

```bash
npm run test:run tests/unit/elo.test.ts
```

- [ ] **Step 7: Implement `src/lib/elo.ts`**

```ts
// src/lib/elo.ts
export const K = 16;

export function computeElo(winnerElo: number, loserElo: number, winnerWon = true) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const actualWinner = winnerWon ? 1 : 0;
  const delta = K * (actualWinner - expectedWinner);
  return {
    winnerNew: Math.round(winnerElo + delta),
    loserNew: Math.round(loserElo - delta),
    delta: Math.round(delta),
  };
}
```

- [ ] **Step 8: Verify passes**

```bash
npm run test:run
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/floor.ts src/lib/elo.ts tests/unit
git commit -m "feat: floor + ELO calculation utilities (tested)"
```

---

## Task 20: Edge Function — `exchange-token`

**Files:**
- Create: `supabase/functions/exchange-token/index.ts`

Validates QR token, signs custom JWT with `kid_id`, returns to client.

- [ ] **Step 1: Scaffold function**

```bash
supabase functions new exchange-token
```

- [ ] **Step 2: Replace `supabase/functions/exchange-token/index.ts`**

```ts
// supabase/functions/exchange-token/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3/mod.ts';
import { encode as hex } from 'https://deno.land/std@0.221.0/encoding/hex.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET')!;

const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return new TextDecoder().decode(hex(new Uint8Array(digest)));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ error: 'missing token' }), { status: 400 });
  }

  const tokenHash = await sha256Hex(token);
  const { data: kid, error } = await supa
    .from('kids')
    .select('id, display_name')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !kid) {
    return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 });
  }

  // Sign custom JWT with kid_id claim
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const jwt = await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: kid.id,
      kid_id: kid.id,
      role: 'authenticated',
      exp: getNumericDate(60 * 60 * 24 * 365), // 1y
    },
    key,
  );

  return Response.json({ jwt, kid });
});
```

- [ ] **Step 3: Set required secrets in Supabase**

```bash
supabase secrets set SUPABASE_JWT_SECRET=<copy from project settings → API>
```

- [ ] **Step 4: Deploy**

```bash
supabase functions deploy exchange-token
```

- [ ] **Step 5: Smoke test**

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/exchange-token" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"token":"nonsense"}'
```
Expected: HTTP 401.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/exchange-token
git commit -m "feat: exchange-token edge function (QR auth)"
```

---

## Task 21: Auth context + session store

**Files:**
- Create: `src/stores/session.ts`, `src/hooks/useAuth.ts`

- [ ] **Step 1: Create `src/stores/session.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kid } from '../lib/types';

interface SessionState {
  jwt: string | null;
  kid: Pick<Kid, 'id' | 'display_name'> | null;
  isAdmin: boolean;
  setKidSession: (jwt: string, kid: Pick<Kid, 'id' | 'display_name'>) => void;
  setAdminSession: (jwt: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      jwt: null,
      kid: null,
      isAdmin: false,
      setKidSession: (jwt, kid) => set({ jwt, kid, isAdmin: false }),
      setAdminSession: (jwt) => set({ jwt, isAdmin: true, kid: null }),
      clear: () => set({ jwt: null, kid: null, isAdmin: false }),
    }),
    { name: 'beystadium-session' },
  ),
);
```

- [ ] **Step 2: Create `src/hooks/useAuth.ts`**

```ts
import { useSession } from '../stores/session';
import { setAuthToken, supabase } from '../lib/supabase';
import { env } from '../lib/env';
import { useEffect } from 'react';

export function useAuth() {
  const { jwt, kid, isAdmin, setKidSession, setAdminSession, clear } = useSession();

  // Re-attach JWT to supabase client on every change
  useEffect(() => {
    setAuthToken(jwt);
  }, [jwt]);

  async function exchangeQrToken(token: string) {
    const res = await fetch(`${env.SUPABASE_URL}/functions/v1/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error('invalid QR');
    const { jwt, kid } = await res.json();
    setKidSession(jwt, kid);
  }

  async function adminLogin(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw error ?? new Error('admin login failed');
    if (email !== env.ADMIN_EMAIL) throw new Error('not authorized');
    setAdminSession(data.session.access_token);
  }

  return { jwt, kid, isAdmin, exchangeQrToken, adminLogin, signOut: clear };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/stores src/hooks
git commit -m "feat: session store + useAuth hook"
```

---

## Task 22: QR login page `/q/:token`

**Files:**
- Create: `src/pages/QrLoginPage.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Create page**

```tsx
// src/pages/QrLoginPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function QrLoginPage() {
  const { token } = useParams<{ token: string }>();
  const { exchangeQrToken } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    exchangeQrToken(token)
      .then(() => nav('/', { replace: true }))
      .catch((e) => setError(e.message ?? 'fehler'));
  }, [token]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Karte hat nicht funktioniert</h2>
        <p className="opacity-70">Frag {import.meta.env.VITE_ADMIN_EMAIL ?? 'den Admin'} nach einer neuen Karte.</p>
      </div>
    );
  }
  return <div className="p-6 text-center opacity-70">Logge ein…</div>;
}
```

- [ ] **Step 2: Wire in `src/routes.tsx`**

Replace the placeholder import:
```tsx
import { QrLoginPage } from './pages/QrLoginPage';
// ... in <Routes>
<Route path="/q/:token" element={<QrLoginPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/QrLoginPage.tsx src/routes.tsx
git commit -m "feat: QR login page"
```

---

## Task 23: Admin login page

**Files:**
- Create: `src/pages/AdminLoginPage.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Create page**

```tsx
// src/pages/AdminLoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminLogin(email, pw);
      nav('/werkstatt', { replace: true });
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="space-y-3 w-full max-w-sm">
        <h1 className="text-xl font-bold">Werkstatt-Login</h1>
        <input className="w-full p-2 bg-zinc-800 rounded" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full p-2 bg-zinc-800 rounded" placeholder="Passwort"
          type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="w-full p-3 bg-bx-yellow text-black font-bold rounded">Login</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Wire route**

```tsx
<Route path="/admin/login" element={<AdminLoginPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminLoginPage.tsx src/routes.tsx
git commit -m "feat: admin login page"
```

---

## Task 24: Auth guards (kid + admin)

**Files:**
- Create: `src/components/auth/KidRoute.tsx`, `src/components/auth/AdminRoute.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Create guards**

```tsx
// src/components/auth/KidRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function KidRoute({ children }: { children: React.ReactNode }) {
  const { kid } = useAuth();
  if (!kid) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
```

```tsx
// src/components/auth/AdminRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Apply to routes** in `src/routes.tsx`

```tsx
<Route path="/" element={<KidRoute><Home /></KidRoute>} />
<Route path="/tower" element={<KidRoute><Tower /></KidRoute>} />
<Route path="/profil" element={<KidRoute><Profile /></KidRoute>} />
<Route path="/feed" element={<KidRoute><Feed /></KidRoute>} />
<Route path="/log" element={<KidRoute><LogBattle /></KidRoute>} />
<Route path="/werkstatt/*" element={<AdminRoute><Werkstatt /></AdminRoute>} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth src/routes.tsx
git commit -m "feat: KidRoute + AdminRoute guards"
```

---

# Phase D — Core flows

## Task 25: Edge Function — `confirm-pending` cron

**Files:**
- Create: `supabase/functions/confirm-pending/index.ts`
- Note: scheduled via Supabase pg_cron (Step 4 below)

- [ ] **Step 1: Scaffold**

```bash
supabase functions new confirm-pending
```

- [ ] **Step 2: Implement**

```ts
// supabase/functions/confirm-pending/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const K = 16;

function expected(meElo: number, oppElo: number) {
  return 1 / (1 + Math.pow(10, (oppElo - meElo) / 400));
}

function eloToFloor(elo: number): number {
  if (elo < 800) return 1;
  if (elo < 1700) return Math.floor((elo - 800) / 10) + 1;
  return Math.min(91 + Math.floor((elo - 1700) / 33), 99);
}

Deno.serve(async () => {
  // 1. Find pending battles whose dispute window expired
  const { data: pending } = await supa
    .from('battles')
    .select('id, winner_kid_id, loser_kid_id')
    .eq('status', 'pending')
    .lt('dispute_window_ends_at', new Date().toISOString());

  if (!pending || pending.length === 0) return Response.json({ confirmed: 0 });

  // For each, compute fresh ELO from chronological history (winner + loser)
  let confirmed = 0;
  for (const b of pending) {
    await recomputeAndConfirm(b.id);
    confirmed++;
  }

  // After all confirms, recompute floor 100 (king-of-hill) globally
  await recomputeKingOfHill();

  return Response.json({ confirmed });
});

async function recomputeAndConfirm(battleId: string) {
  // Mark as confirmed first
  await supa.from('battles').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', battleId);

  // For both kids in this battle, recompute ELO from their full confirmed history
  const { data: battle } = await supa.from('battles').select('winner_kid_id, loser_kid_id').eq('id', battleId).single();
  if (!battle) return;

  for (const kidId of [battle.winner_kid_id, battle.loser_kid_id]) {
    await recomputeKidElo(kidId);
  }
}

async function recomputeKidElo(kidId: string) {
  const { data: history } = await supa
    .from('battles')
    .select('winner_kid_id, loser_kid_id, logged_at')
    .eq('status', 'confirmed')
    .or(`winner_kid_id.eq.${kidId},loser_kid_id.eq.${kidId}`)
    .order('logged_at', { ascending: true });

  if (!history) return;

  // Replay all confirmed battles for this kid
  // Need a snapshot of every kid's elo at each step. We approximate by computing
  // ratings against current opponent ratings (close enough at v1 scale).
  let elo = 800;
  for (const h of history) {
    const opp = h.winner_kid_id === kidId ? h.loser_kid_id : h.winner_kid_id;
    const { data: oppKid } = await supa.from('kids').select('elo').eq('id', opp).single();
    const oppElo = oppKid?.elo ?? 800;
    const won = h.winner_kid_id === kidId;
    const exp = expected(elo, oppElo);
    const delta = K * ((won ? 1 : 0) - exp);
    elo = Math.round(elo + delta);
  }

  const floor = eloToFloor(elo);
  await supa.from('kids').update({ elo, floor }).eq('id', kidId);
}

async function recomputeKingOfHill() {
  const { data: top } = await supa
    .from('kids')
    .select('id, elo')
    .order('elo', { ascending: false })
    .limit(1);
  if (!top || top.length === 0) return;
  // Reset all kids at floor 100 to 99 first, then promote top to 100
  await supa.from('kids').update({ floor: 99 }).eq('floor', 100);
  if (top[0].elo >= 1964) {
    await supa.from('kids').update({ floor: 100 }).eq('id', top[0].id);
  }
}
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy confirm-pending
```

- [ ] **Step 4: Schedule via pg_cron (in Supabase dashboard SQL editor)**

```sql
select cron.schedule(
  'confirm-pending-every-5min',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT>.supabase.co/functions/v1/confirm-pending',
       headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
     ); $$
);
```

- [ ] **Step 5: Smoke test — manually invoke**

```bash
curl -X POST "$SUPABASE_URL/functions/v1/confirm-pending" \
  -H "Authorization: Bearer $SERVICE_ROLE"
```
Expected: `{"confirmed": 0}` (no pending yet).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/confirm-pending
git commit -m "feat: confirm-pending cron Edge Function"
```

---

## Task 26: Edge Function — `dispute-battle`

**Files:**
- Create: `supabase/functions/dispute-battle/index.ts`

Atomically: insert dispute row, void battle. Wraps in service-role transaction.

- [ ] **Step 1: Scaffold + implement**

```bash
supabase functions new dispute-battle
```

```ts
// supabase/functions/dispute-battle/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function getKidIdFromJwt(req: Request): string | null {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return null;
  try {
    const payload = JSON.parse(atob(auth.split('.')[1]));
    return payload.kid_id ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const kidId = getKidIdFromJwt(req);
  if (!kidId) return new Response('unauthorized', { status: 401 });

  const { battle_id, reason_code, note } = await req.json();
  if (!battle_id || !reason_code) return new Response('missing fields', { status: 400 });

  // Verify battle is still pending
  const { data: battle } = await supa.from('battles').select('id, status').eq('id', battle_id).single();
  if (!battle) return new Response('battle not found', { status: 404 });
  if (battle.status !== 'pending') return new Response('battle not pending', { status: 409 });

  // Insert dispute (UNIQUE constraint enforces one per kid)
  const { error: dErr } = await supa.from('disputes').insert({
    battle_id, disputer_kid_id: kidId, reason_code, note: note?.slice(0, 200) ?? null,
  });
  if (dErr) return new Response(JSON.stringify({ error: dErr.message }), { status: 400 });

  // Void battle
  await supa.from('battles').update({
    status: 'voided',
    voided_at: new Date().toISOString(),
    voided_reason: `disputed_by_${kidId}`,
  }).eq('id', battle_id);

  return Response.json({ ok: true });
});
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy dispute-battle
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/dispute-battle
git commit -m "feat: dispute-battle edge function"
```

---

## Task 27: `useKid` + `useBattles` data hooks

**Files:**
- Create: `src/hooks/useKid.ts`, `src/hooks/useBattles.ts`

- [ ] **Step 1: Create `src/hooks/useKid.ts`**

```ts
// src/hooks/useKid.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../stores/session';

export function useCurrentKid() {
  const { kid } = useSession();
  return useQuery({
    queryKey: ['kid', kid?.id],
    queryFn: async () => {
      if (!kid) return null;
      const { data, error } = await supabase.from('kids').select('*').eq('id', kid.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!kid,
  });
}

export function useAllKids() {
  return useQuery({
    queryKey: ['kids', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kids').select('*').order('elo', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useKidById(id: string | null) {
  return useQuery({
    queryKey: ['kid', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('kids').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

- [ ] **Step 2: Create `src/hooks/useBattles.ts`**

```ts
// src/hooks/useBattles.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../stores/session';
import type { DraftBattle } from '../lib/types';

export function useFeed(filter: 'all' | 'pending' | 'mine' | 'voided' = 'all') {
  const { kid } = useSession();
  return useQuery({
    queryKey: ['feed', filter, kid?.id],
    queryFn: async () => {
      let q = supabase.from('battles').select('*').order('logged_at', { ascending: false }).limit(50);
      if (filter === 'pending') q = q.eq('status', 'pending');
      if (filter === 'voided') q = q.eq('status', 'voided');
      if (filter === 'mine' && kid) q = q.or(`winner_kid_id.eq.${kid.id},loser_kid_id.eq.${kid.id}`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLogBattle() {
  const { kid } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: DraftBattle) => {
      if (!kid) throw new Error('not logged in');
      const winner_kid_id = draft.i_won ? kid.id : draft.opponent_kid_id;
      const loser_kid_id = draft.i_won ? draft.opponent_kid_id : kid.id;
      const winner_score = draft.i_won ? draft.my_score : draft.opp_score;
      const loser_score = draft.i_won ? draft.opp_score : draft.my_score;
      const winner_bey_id = draft.i_won ? draft.my_bey_id : draft.opp_bey_id;
      const loser_bey_id = draft.i_won ? draft.opp_bey_id : draft.my_bey_id;

      const { data, error } = await supabase.from('battles').insert({
        logger_kid_id: kid.id,
        winner_kid_id, loser_kid_id, winner_score, loser_score, winner_bey_id, loser_bey_id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useKid.ts src/hooks/useBattles.ts
git commit -m "feat: useKid + useBattles hooks"
```

---

## Task 28: Log-battle flow shell + state machine

**Files:**
- Create: `src/pages/LogBattleFlow.tsx`, `src/stores/draft-battle.ts`

- [ ] **Step 1: Draft state store**

```ts
// src/stores/draft-battle.ts
import { create } from 'zustand';
import type { DraftBattle } from '../lib/types';

type Step = 'opponent' | 'score' | 'beys' | 'confirm';

interface DraftState extends Partial<DraftBattle> {
  step: Step;
  setStep: (s: Step) => void;
  patch: (p: Partial<DraftBattle>) => void;
  reset: () => void;
}

export const useDraftBattle = create<DraftState>((set) => ({
  step: 'opponent',
  setStep: (step) => set({ step }),
  patch: (p) => set((s) => ({ ...s, ...p })),
  reset: () => set({ step: 'opponent', opponent_kid_id: undefined, i_won: undefined, my_score: undefined, opp_score: undefined, my_bey_id: undefined, opp_bey_id: undefined }),
}));
```

- [ ] **Step 2: Flow page (renders correct step)**

```tsx
// src/pages/LogBattleFlow.tsx
import { useDraftBattle } from '../stores/draft-battle';
import { OpponentPicker } from '../components/battle/OpponentPicker';
import { ScoreInput } from '../components/battle/ScoreInput';
import { BeyPicker } from '../components/battle/BeyPicker';
import { LogBattleConfirm } from '../components/battle/LogBattleConfirm';

export function LogBattleFlow() {
  const step = useDraftBattle((s) => s.step);
  return (
    <div className="min-h-screen bg-black text-white p-4">
      {step === 'opponent' && <OpponentPicker />}
      {step === 'score' && <ScoreInput />}
      {step === 'beys' && <BeyPicker />}
      {step === 'confirm' && <LogBattleConfirm />}
    </div>
  );
}
```

- [ ] **Step 3: Wire route in `src/routes.tsx`**

```tsx
import { LogBattleFlow } from './pages/LogBattleFlow';
// ...
<Route path="/log" element={<KidRoute><LogBattleFlow /></KidRoute>} />
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/LogBattleFlow.tsx src/stores/draft-battle.ts src/routes.tsx
git commit -m "feat: log-battle flow shell + draft state machine"
```

---

## Task 29: Step 1 — `OpponentPicker`

**Files:**
- Create: `src/components/battle/OpponentPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/battle/OpponentPicker.tsx
import { useAllKids } from '../../hooks/useKid';
import { useSession } from '../../stores/session';
import { useDraftBattle } from '../../stores/draft-battle';

export function OpponentPicker() {
  const { kid: me } = useSession();
  const { data: kids } = useAllKids();
  const { patch, setStep } = useDraftBattle();

  function pick(opp_id: string) {
    patch({ opponent_kid_id: opp_id });
    setStep('score');
  }

  const others = kids?.filter((k) => k.id !== me?.id) ?? [];
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Wer war dein Gegner?</h2>
      <ul className="space-y-2">
        {others.map((k) => (
          <li key={k.id}>
            <button onClick={() => pick(k.id)} className="w-full text-left p-3 bg-zinc-900 rounded flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-bx-cobalt flex items-center justify-center font-bold">
                {k.display_name[0]}
              </span>
              <span className="flex-1 font-bold">{k.display_name}</span>
              <span className="opacity-60 text-sm">Etage {k.floor}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke** — defer until Task 41 (CreateKidPage) lets you seed real kids; skip the visual smoke for now.

- [ ] **Step 3: Commit**

```bash
git add src/components/battle/OpponentPicker.tsx
git commit -m "feat: log-battle step 1 — opponent picker"
```

---

## Task 30: Step 2 — `ScoreInput`

**Files:**
- Create: `src/components/battle/ScoreInput.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/battle/ScoreInput.tsx
import { useState } from 'react';
import { useDraftBattle } from '../../stores/draft-battle';

export function ScoreInput() {
  const { setStep, patch } = useDraftBattle();
  const [iWon, setIWon] = useState(true);
  const [my, setMy] = useState(3);
  const [opp, setOpp] = useState(1);

  function next() {
    patch({ i_won: iWon, my_score: my, opp_score: opp });
    setStep('beys');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Wer hat gewonnen?</h2>
      <div className="space-y-2">
        <button onClick={() => setIWon(true)} className={`w-full p-4 rounded font-bold ${iWon ? 'bg-green-600' : 'bg-zinc-800 opacity-60'}`}>🏆 Ich hab gewonnen</button>
        <button onClick={() => setIWon(false)} className={`w-full p-4 rounded font-bold ${!iWon ? 'bg-red-600' : 'bg-zinc-800 opacity-60'}`}>😤 Ich hab verloren</button>
      </div>
      <div className="space-y-2 bg-zinc-900 p-3 rounded">
        <Stepper label="Ich" value={my} setValue={setMy} />
        <Stepper label="Gegner" value={opp} setValue={setOpp} />
        <div className="flex gap-2 mt-2">
          {[[3,0],[3,1],[3,2],[5,3]].map(([a,b]) => (
            <button key={`${a}-${b}`} onClick={() => { setMy(a); setOpp(b); }} className="flex-1 p-2 bg-zinc-800 rounded text-sm">{a}-{b}</button>
          ))}
        </div>
      </div>
      <button onClick={next} disabled={my <= opp}
        className="w-full p-3 bg-bx-yellow text-black font-bold rounded disabled:opacity-30">
        Weiter →
      </button>
    </div>
  );
}

function Stepper({ label, value, setValue }: { label: string; value: number; setValue: (n: number) => void }) {
  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setValue(Math.max(0, value - 1))} className="w-8 h-8 bg-zinc-700 rounded">−</button>
        <span className="w-8 text-center font-bold text-xl">{value}</span>
        <button onClick={() => setValue(value + 1)} className="w-8 h-8 bg-zinc-700 rounded">+</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/battle/ScoreInput.tsx
git commit -m "feat: log-battle step 2 — score input"
```

---

## Task 31: Step 3 — `BeyPicker`

**Files:**
- Create: `src/components/battle/BeyPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/battle/BeyPicker.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useDraftBattle } from '../../stores/draft-battle';

export function BeyPicker() {
  const { setStep, patch } = useDraftBattle();
  const { data: beys } = useQuery({
    queryKey: ['beys', 'all'],
    queryFn: async () => (await supabase.from('beys').select('*').eq('canonical', true).order('product_code')).data ?? [],
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Welche Beys?</h2>
      <BeySection title="Mein Bey" beys={beys ?? []} onPick={(id) => patch({ my_bey_id: id })} />
      <BeySection title="Gegner-Bey" beys={beys ?? []} onPick={(id) => patch({ opp_bey_id: id })} />
      <button onClick={() => setStep('confirm')} className="w-full p-3 bg-bx-yellow text-black font-bold rounded">
        Weiter →
      </button>
    </div>
  );
}

function BeySection({ title, beys, onPick }: { title: string; beys: any[]; onPick: (id: string | null) => void }) {
  return (
    <div>
      <p className="text-sm opacity-70 mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {beys.map((b) => (
          <button key={b.id} onClick={() => onPick(b.id)}
            className="p-2 bg-zinc-900 rounded text-xs aspect-square flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-bx-crimson mb-1"></div>
            <span>{b.name_en}</span>
          </button>
        ))}
        <button onClick={() => onPick(null)} className="p-2 bg-zinc-800 rounded text-xs italic opacity-60">
          Unbekannt
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/battle/BeyPicker.tsx
git commit -m "feat: log-battle step 3 — bey picker"
```

---

## Task 32: Step 4 — `LogBattleConfirm` + submit

**Files:**
- Create: `src/components/battle/LogBattleConfirm.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/battle/LogBattleConfirm.tsx
import { useNavigate } from 'react-router-dom';
import { useDraftBattle } from '../../stores/draft-battle';
import { useLogBattle } from '../../hooks/useBattles';
import { useKidById } from '../../hooks/useKid';
import { eloToFloor } from '../../lib/floor';
import { useCurrentKid } from '../../hooks/useKid';
import { computeElo } from '../../lib/elo';

export function LogBattleConfirm() {
  const draft = useDraftBattle();
  const reset = useDraftBattle((s) => s.reset);
  const log = useLogBattle();
  const nav = useNavigate();
  const { data: me } = useCurrentKid();
  const { data: opp } = useKidById(draft.opponent_kid_id ?? null);

  if (!me || !opp || draft.i_won === undefined) return null;
  const myElo = me.elo, oppElo = opp.elo;
  const r = computeElo(draft.i_won ? myElo : oppElo, draft.i_won ? oppElo : myElo);
  const myNew = draft.i_won ? r.winnerNew : r.loserNew;
  const myFloorNew = eloToFloor(myNew);

  async function submit() {
    await log.mutateAsync({
      opponent_kid_id: draft.opponent_kid_id!,
      i_won: draft.i_won!,
      my_score: draft.my_score!,
      opp_score: draft.opp_score!,
      my_bey_id: draft.my_bey_id ?? null,
      opp_bey_id: draft.opp_bey_id ?? null,
    });
    reset();
    nav('/');
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-bold text-bx-yellow">Eingetragen?</h2>
      <div className="bg-zinc-900 p-4 rounded">
        <p>{draft.i_won ? 'Du hast' : 'Du gegen'} <strong>{opp.display_name}</strong></p>
        <p className="text-3xl font-bold my-2">{draft.my_score} — {draft.opp_score}</p>
        <p className="text-sm opacity-60">Etage {me.floor} → <span className="text-green-400">{myFloorNew}</span> (vorläufig)</p>
      </div>
      <p className="text-xs opacity-50">
        Wenn 24 Stunden niemand sagt "stimmt nicht", zählt's.
      </p>
      <button onClick={submit} disabled={log.isPending}
        className="w-full p-4 bg-bx-crimson font-bold rounded">
        {log.isPending ? 'Sende…' : '⚔ Eintragen'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/battle/LogBattleConfirm.tsx
git commit -m "feat: log-battle step 4 — confirm + submit"
```

---

## Task 33: Offline IndexedDB queue for battles

**Files:**
- Create: `src/lib/offline-queue.ts`
- Modify: `src/hooks/useBattles.ts` (use queue when offline)

- [ ] **Step 1: Create queue**

```ts
// src/lib/offline-queue.ts
import { openDB, type DBSchema } from 'idb';
import type { DraftBattle } from './types';

interface QueueDB extends DBSchema {
  pending: {
    key: number;
    value: { draft: DraftBattle; queued_at: number };
    indexes: { 'by-time': number };
  };
}

export const queueDb = openDB<QueueDB>('beystadium-queue', 1, {
  upgrade(db) {
    const store = db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
    store.createIndex('by-time', 'queued_at');
  },
});

export async function enqueueBattle(draft: DraftBattle) {
  const db = await queueDb;
  await db.add('pending', { draft, queued_at: Date.now() });
}

export async function drainQueue(submit: (d: DraftBattle) => Promise<unknown>) {
  const db = await queueDb;
  const all = await db.getAll('pending');
  for (const item of all) {
    try { await submit(item.draft); await db.delete('pending', (item as any).id); } catch { /* keep for next try */ }
  }
}
```

- [ ] **Step 2: Drain on app load** — modify `App.tsx`

```tsx
import { useEffect } from 'react';
import { drainQueue } from './lib/offline-queue';
import { useLogBattle } from './hooks/useBattles';

export default function App() {
  const log = useLogBattle();
  useEffect(() => {
    function tryDrain() { drainQueue((d) => log.mutateAsync(d)); }
    tryDrain();
    window.addEventListener('online', tryDrain);
    return () => window.removeEventListener('online', tryDrain);
  }, []);
  return <AppRoutes />;
}
```

- [ ] **Step 3: Update `useLogBattle` in `src/hooks/useBattles.ts`** — replace its `mutationFn` with the offline-aware version

```ts
// src/hooks/useBattles.ts (replace useLogBattle's mutationFn entirely)
import { enqueueBattle } from '../lib/offline-queue';

export function useLogBattle() {
  const { kid } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: DraftBattle) => {
      if (!kid) throw new Error('not logged in');
      const winner_kid_id = draft.i_won ? kid.id : draft.opponent_kid_id;
      const loser_kid_id = draft.i_won ? draft.opponent_kid_id : kid.id;
      const winner_score = draft.i_won ? draft.my_score : draft.opp_score;
      const loser_score = draft.i_won ? draft.opp_score : draft.my_score;
      const winner_bey_id = draft.i_won ? draft.my_bey_id : draft.opp_bey_id;
      const loser_bey_id = draft.i_won ? draft.opp_bey_id : draft.my_bey_id;

      try {
        const { data, error } = await supabase.from('battles').insert({
          logger_kid_id: kid.id,
          winner_kid_id, loser_kid_id, winner_score, loser_score, winner_bey_id, loser_bey_id,
        }).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        if (!navigator.onLine) {
          await enqueueBattle(draft);
          return { queued: true } as never;
        }
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/offline-queue.ts src/App.tsx src/hooks/useBattles.ts
git commit -m "feat: offline IndexedDB queue for battles"
```

---

## Task 34: Dispute sheet from feed

**Files:**
- Create: `src/components/battle/DisputeSheet.tsx`, `src/hooks/useDispute.ts`

- [ ] **Step 1: Hook**

```ts
// src/hooks/useDispute.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../stores/session';
import { env } from '../lib/env';

export function useDisputeBattle() {
  const { jwt } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { battle_id: string; reason_code: string; note?: string }) => {
      const res = await fetch(`${env.SUPABASE_URL}/functions/v1/dispute-battle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, apikey: env.SUPABASE_ANON_KEY },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}
```

- [ ] **Step 2: Component**

```tsx
// src/components/battle/DisputeSheet.tsx
import { useState } from 'react';
import { useDisputeBattle } from '../../hooks/useDispute';

const REASONS: Array<{ code: string; emoji: string; label: string }> = [
  { code: 'wrong_score', emoji: '📊', label: 'Score stimmt nicht' },
  { code: 'didnt_happen', emoji: '👻', label: 'Das gab\'s gar nicht' },
  { code: 'wrong_opponent', emoji: '🔄', label: 'Falsche Person' },
  { code: 'wrong_bey', emoji: '🎯', label: 'Falscher Bey' },
  { code: 'other', emoji: '…', label: 'Was anderes' },
];

export function DisputeSheet({ battleId, onClose }: { battleId: string; onClose: () => void }) {
  const dispute = useDisputeBattle();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function submit() {
    if (!reason) return;
    await dispute.mutateAsync({ battle_id: battleId, reason_code: reason, note: note.slice(0, 200) });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="bg-zinc-900 w-full p-4 rounded-t-2xl space-y-3">
        <h3 className="font-bold">Was stimmt nicht?</h3>
        {REASONS.map((r) => (
          <button key={r.code} onClick={() => setReason(r.code)}
            className={`w-full p-3 rounded text-left flex items-center gap-3 ${reason === r.code ? 'bg-red-900' : 'bg-zinc-800'}`}>
            <span>{r.emoji}</span><span>{r.label}</span>
          </button>
        ))}
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Was war wirklich? (optional)" maxLength={200}
          className="w-full p-2 bg-zinc-800 rounded text-sm" rows={2} />
        <p className="text-xs text-yellow-500">Wenn du das meldest, zählt die Schlacht sofort nicht mehr.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 p-3 bg-zinc-700 rounded">Doch nicht</button>
          <button onClick={submit} disabled={!reason || dispute.isPending}
            className="flex-1 p-3 bg-red-600 font-bold rounded disabled:opacity-30">
            🚩 Melden
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/battle/DisputeSheet.tsx src/hooks/useDispute.ts
git commit -m "feat: dispute sheet + hook"
```

---

# Phase E — Surfaces

## Task 35: Tower view (sparse leaderboard)

**Files:**
- Create: `src/pages/TowerPage.tsx`, `src/components/tower/TowerView.tsx`, `src/components/tower/TowerRow.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: TowerView**

```tsx
// src/components/tower/TowerView.tsx
import { useAllKids } from '../../hooks/useKid';
import { useSession } from '../../stores/session';
import { TowerRow } from './TowerRow';
import { useNavigate } from 'react-router-dom';

const ZONE_MARKERS = [
  { floor: 90, label: 'Approach Zone (91-99)' },
  { floor: 50, label: 'Mid Tower (50-90)' },
];

export function TowerView() {
  const { kid: me } = useSession();
  const { data: kids = [] } = useAllKids();
  const nav = useNavigate();

  // sort by floor desc, then elo desc
  const sorted = [...kids].sort((a, b) => b.floor - a.floor || b.elo - a.elo);
  const peakKid = sorted.find((k) => k.floor === 100);

  // build sparse rows: each occupied floor + zone markers
  const rows: Array<{ kind: 'kid' | 'zone'; data: any }> = [];
  if (peakKid) rows.push({ kind: 'kid', data: peakKid });
  ZONE_MARKERS.forEach((z) => {
    rows.push({ kind: 'zone', data: z });
    sorted.filter((k) => k.floor < z.floor + 1 && k.floor >= (z.floor === 50 ? 1 : 50)).forEach((k) => {
      // dedupe peak kid
      if (k.id !== peakKid?.id) rows.push({ kind: 'kid', data: k });
    });
  });

  return (
    <div className="p-4 space-y-1">
      <h1 className="text-xl font-bold mb-3">Der Turm — The X</h1>
      {rows.map((r, i) =>
        r.kind === 'zone'
          ? <div key={i} className="text-xs uppercase tracking-widest opacity-40 py-2 text-center">— {r.data.label} —</div>
          : <TowerRow key={r.data.id} kid={r.data} isMe={r.data.id === me?.id} onTap={() => nav(`/profil/${r.data.id}`)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: TowerRow**

```tsx
// src/components/tower/TowerRow.tsx
import type { Kid } from '../../lib/types';

export function TowerRow({ kid, isMe, onTap }: { kid: Kid; isMe: boolean; onTap: () => void }) {
  const peak = kid.floor === 100;
  return (
    <button onClick={onTap}
      className={`w-full p-2 rounded flex items-center gap-3 ${peak ? 'bg-gradient-to-r from-bx-yellow via-orange-500 to-bx-crimson text-black' : isMe ? 'bg-bx-yellow/15 border border-bx-yellow/40' : 'bg-zinc-900'}`}>
      <span className="w-8 text-xs font-bold opacity-60">{kid.floor}</span>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${peak ? 'bg-black/30' : 'bg-bx-cobalt'}`}>{kid.display_name[0]}</span>
      <span className="flex-1 text-left">{kid.display_name}{isMe && <em className="not-italic ml-1 opacity-70 text-xs">(du)</em>}</span>
      {peak && <span className="text-xs font-bold">👑 The Peak</span>}
    </button>
  );
}
```

- [ ] **Step 3: Page wrapper**

```tsx
// src/pages/TowerPage.tsx
import { TowerView } from '../components/tower/TowerView';
export function TowerPage() { return <div className="min-h-screen bg-black text-white"><TowerView /></div>; }
```

- [ ] **Step 4: Wire route + commit**

```tsx
// src/routes.tsx — replace placeholder
import { TowerPage } from './pages/TowerPage';
<Route path="/tower" element={<KidRoute><TowerPage /></KidRoute>} />
```

```bash
git add src/components/tower src/pages/TowerPage.tsx src/routes.tsx
git commit -m "feat: tower view (sparse leaderboard)"
```

---

## Task 36: Profile page (own + public)

**Files:**
- Create: `src/pages/ProfilePage.tsx`, `src/pages/PublicProfilePage.tsx`, `src/components/profile/ProfileCard.tsx`, `src/components/profile/StatGrid.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: `ProfileCard.tsx` (placeholder card — Plan 2 upgrades it)**

```tsx
// src/components/profile/ProfileCard.tsx
import type { Kid } from '../../lib/types';

export function ProfileCard({ kid }: { kid: Kid }) {
  return (
    <div className="bg-gradient-to-b from-zinc-900 to-black border border-bx-yellow/30 rounded-xl p-5 text-center">
      <div className="text-xs tracking-widest opacity-60 mb-2">⚔ ETAGE {kid.floor}</div>
      <div className="w-20 h-20 mx-auto rounded-full bg-bx-crimson flex items-center justify-center text-3xl font-bold mb-2">
        {kid.display_name[0]}
      </div>
      <div className="text-2xl font-bold tracking-wider">{kid.display_name.toUpperCase()}</div>
      <div className="text-sm opacity-60 mt-1">ELO {kid.elo}</div>
    </div>
  );
}
```

- [ ] **Step 2: `StatGrid.tsx`**

```tsx
// src/components/profile/StatGrid.tsx
export function StatGrid({ stats }: { stats: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="bg-zinc-900 rounded p-3 text-center">
          <div className="text-2xl font-bold text-bx-yellow">{s.value}</div>
          <div className="text-xs opacity-60 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `ProfilePage.tsx` (own profile)**

```tsx
// src/pages/ProfilePage.tsx
import { useCurrentKid } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';
import { useSession } from '../stores/session';
import { ProfileCard } from '../components/profile/ProfileCard';
import { StatGrid } from '../components/profile/StatGrid';

export function ProfilePage() {
  const { kid: session } = useSession();
  const { data: kid } = useCurrentKid();
  const { data: battles = [] } = useFeed('mine');
  if (!kid || !session) return null;

  const wins = battles.filter((b) => b.status === 'confirmed' && b.winner_kid_id === session.id).length;
  const losses = battles.filter((b) => b.status === 'confirmed' && b.loser_kid_id === session.id).length;
  const winrate = wins + losses > 0 ? Math.round((100 * wins) / (wins + losses)) : 0;

  return (
    <div className="p-4 space-y-4">
      <ProfileCard kid={kid} />
      <StatGrid stats={[
        { label: 'Kämpfe', value: wins + losses },
        { label: 'Gewonnen', value: `${winrate}%` },
        { label: 'Etage', value: kid.floor },
      ]} />
    </div>
  );
}
```

- [ ] **Step 4: `PublicProfilePage.tsx` (other kid)**

```tsx
// src/pages/PublicProfilePage.tsx
import { useParams } from 'react-router-dom';
import { useKidById } from '../hooks/useKid';
import { ProfileCard } from '../components/profile/ProfileCard';

export function PublicProfilePage() {
  const { id } = useParams();
  const { data: kid } = useKidById(id ?? null);
  if (!kid) return <div className="p-6 opacity-60">Lade…</div>;
  return <div className="p-4"><ProfileCard kid={kid} /></div>;
}
```

- [ ] **Step 5: Wire routes + commit**

```tsx
// src/routes.tsx
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
<Route path="/profil" element={<KidRoute><ProfilePage /></KidRoute>} />
<Route path="/profil/:id" element={<KidRoute><PublicProfilePage /></KidRoute>} />
```

```bash
git add src/components/profile src/pages/ProfilePage.tsx src/pages/PublicProfilePage.tsx src/routes.tsx
git commit -m "feat: profile pages (own + public) + placeholder card"
```

---

## Task 37: Crew feed page

**Files:**
- Create: `src/pages/FeedPage.tsx`, `src/components/battle/BattleCard.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: `BattleCard.tsx`**

```tsx
// src/components/battle/BattleCard.tsx
import { useState } from 'react';
import type { Battle } from '../../lib/types';
import { useKidById } from '../../hooks/useKid';
import { DisputeSheet } from './DisputeSheet';

export function BattleCard({ b }: { b: Battle }) {
  const [showDispute, setShowDispute] = useState(false);
  const { data: w } = useKidById(b.winner_kid_id);
  const { data: l } = useKidById(b.loser_kid_id);
  if (!w || !l) return null;
  const border = b.status === 'pending' ? 'border-l-bx-yellow' : b.status === 'confirmed' ? 'border-l-green-500' : 'border-l-red-500 opacity-60';

  return (
    <div className={`p-3 bg-zinc-900 rounded border-l-4 ${border} mb-2`}>
      <div className="text-sm">
        <strong>{w.display_name}</strong> besiegt <strong>{l.display_name}</strong> {b.winner_score}-{b.loser_score}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs opacity-60">
          {b.status === 'pending' ? '⏳ zählt in 24h' : b.status === 'confirmed' ? '✓ zählt' : '🚩 zählt nicht'}
        </span>
        {b.status === 'pending' && (
          <button onClick={() => setShowDispute(true)} className="text-xs text-red-400">🚩 stimmt nicht</button>
        )}
      </div>
      {showDispute && <DisputeSheet battleId={b.id} onClose={() => setShowDispute(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: `FeedPage.tsx`**

```tsx
// src/pages/FeedPage.tsx
import { useState } from 'react';
import { useFeed } from '../hooks/useBattles';
import { BattleCard } from '../components/battle/BattleCard';

const FILTERS = [
  { key: 'all', label: 'Alle' },
  { key: 'pending', label: 'Wartet' },
  { key: 'mine', label: 'Meine' },
  { key: 'voided', label: 'Gemeldet' },
] as const;

export function FeedPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const { data: battles = [] } = useFeed(filter);
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">Was geht ab?</h1>
      <div className="flex gap-2 mb-3">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded text-sm ${filter === f.key ? 'bg-bx-yellow text-black' : 'bg-zinc-800'}`}>
            {f.label}
          </button>
        ))}
      </div>
      {battles.map((b) => <BattleCard key={b.id} b={b} />)}
    </div>
  );
}
```

- [ ] **Step 3: Wire route + commit**

```tsx
import { FeedPage } from './pages/FeedPage';
<Route path="/feed" element={<KidRoute><FeedPage /></KidRoute>} />
```

```bash
git add src/components/battle/BattleCard.tsx src/pages/FeedPage.tsx src/routes.tsx
git commit -m "feat: crew feed page + battle card"
```

---

## Task 38: Home / Dashboard

**Files:**
- Create: `src/pages/HomePage.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import { useCurrentKid, useAllKids } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';

export function HomePage() {
  const { data: kid } = useCurrentKid();
  const { data: kids = [] } = useAllKids();
  const { data: feed = [] } = useFeed('all');
  if (!kid) return null;
  const aboveMe = kids.filter((k) => k.elo > kid.elo).sort((a, b) => a.elo - b.elo);
  const next = aboveMe[0];
  const gap = next ? next.floor - kid.floor : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-bx-crimson flex items-center justify-center font-bold text-xl">
          {kid.display_name[0]}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold">Hi {kid.display_name}!</div>
          <div className="text-sm opacity-60">Etage {kid.floor} von 100</div>
        </div>
      </div>

      <Link to="/log" className="block w-full p-4 bg-gradient-to-r from-bx-yellow via-orange-500 to-bx-crimson text-black font-bold rounded text-center text-lg">
        ⚔ Was war heute?
      </Link>

      <div>
        <div className="text-xs uppercase tracking-widest opacity-50 mb-2">Was geht ab?</div>
        {feed.slice(0, 3).map((b) => (
          <div key={b.id} className="text-sm py-2 opacity-80 border-b border-zinc-800">
            {b.status === 'confirmed' ? '✓' : b.status === 'pending' ? '⏳' : '🚩'} Schlacht eingetragen
          </div>
        ))}
      </div>

      {next && (
        <div className="bg-bx-cobalt/20 border-l-2 border-bx-cobalt p-3 rounded text-sm">
          👁 {next.display_name} ist nur <strong>{gap} Etage{gap === 1 ? '' : 'n'}</strong> über dir — schaffst du sie?
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire route + commit**

```tsx
import { HomePage } from './pages/HomePage';
<Route path="/" element={<KidRoute><HomePage /></KidRoute>} />
```

```bash
git add src/pages/HomePage.tsx src/routes.tsx
git commit -m "feat: home dashboard"
```

---

## Task 39: Bottom navigation

**Files:**
- Create: `src/components/nav/BottomNav.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/nav/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Heim', icon: '🏠' },
  { to: '/tower', label: 'Tower', icon: '🗼' },
  { to: '/profil', label: 'Karte', icon: '🃏' },
  { to: '/feed', label: 'Feed', icon: '📜' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 grid grid-cols-4">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'}
          className={({ isActive }) => `p-2 text-center text-xs ${isActive ? 'text-bx-yellow' : 'opacity-50'}`}>
          <div className="text-lg">{t.icon}</div>
          <div>{t.label}</div>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Render in `App.tsx` (only on kid routes)**

```tsx
import { useLocation } from 'react-router-dom';
import { BottomNav } from './components/nav/BottomNav';
import { useSession } from './stores/session';

function AppShell() {
  const loc = useLocation();
  const { kid } = useSession();
  const showNav = kid && !loc.pathname.startsWith('/admin') && !loc.pathname.startsWith('/werkstatt') && !loc.pathname.startsWith('/q/');
  return (
    <>
      <main className={showNav ? 'pb-20' : ''}><AppRoutes /></main>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() { /* unchanged init logic + return <AppShell /> */ }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/nav src/App.tsx
git commit -m "feat: bottom nav"
```

---

# Phase F — Admin Werkstatt

## Task 40: Werkstatt layout + kids list

**Files:**
- Create: `src/pages/werkstatt/WerkstattLayout.tsx`, `src/pages/werkstatt/KidsListPage.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Layout with sub-routes**

```tsx
// src/pages/werkstatt/WerkstattLayout.tsx
import { Link, NavLink, Outlet } from 'react-router-dom';

export function WerkstattLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Werkstatt</h1>
        <Link to="/admin/login" className="text-sm opacity-60">Logout</Link>
      </header>
      <nav className="flex gap-3 mb-6 border-b border-zinc-800 pb-2">
        <NavLink to="/werkstatt" end className={({ isActive }) => isActive ? 'text-bx-yellow' : 'opacity-60'}>Spieler</NavLink>
        <NavLink to="/werkstatt/disputes" className={({ isActive }) => isActive ? 'text-bx-yellow' : 'opacity-60'}>Disputes</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
```

- [ ] **Step 2: Kids list page**

```tsx
// src/pages/werkstatt/KidsListPage.tsx
import { Link } from 'react-router-dom';
import { useAllKids } from '../../hooks/useKid';

export function KidsListPage() {
  const { data: kids = [] } = useAllKids();
  return (
    <div className="space-y-3">
      <Link to="/werkstatt/new" className="inline-block p-3 bg-bx-yellow text-black font-bold rounded">+ Neuer Spieler</Link>
      <table className="w-full">
        <thead className="text-left text-xs opacity-50">
          <tr><th className="py-2">Name</th><th>Etage</th><th>ELO</th><th></th></tr>
        </thead>
        <tbody>
          {kids.map((k) => (
            <tr key={k.id} className="border-t border-zinc-800">
              <td className="py-2">{k.display_name}</td>
              <td>{k.floor}</td>
              <td>{k.elo}</td>
              <td><Link to={`/werkstatt/${k.id}`} className="text-bx-yellow text-sm">Karte / Token</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Wire routes**

```tsx
// src/routes.tsx
import { WerkstattLayout } from './pages/werkstatt/WerkstattLayout';
import { KidsListPage } from './pages/werkstatt/KidsListPage';
<Route path="/werkstatt" element={<AdminRoute><WerkstattLayout /></AdminRoute>}>
  <Route index element={<KidsListPage />} />
  {/* sub-routes added in next tasks */}
</Route>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/werkstatt src/routes.tsx
git commit -m "feat: werkstatt layout + kids list"
```

---

## Task 41: Create kid + generate QR card

**Files:**
- Create: `src/pages/werkstatt/CreateKidPage.tsx`, `src/lib/qr-card.ts`

- [ ] **Step 1: Helper to generate token + QR card PDF**

```ts
// src/lib/qr-card.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function generateToken(): Promise<{ token: string; tokenHash: string }> {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join('');
  return { token, tokenHash };
}

export async function buildQrCardPdf(displayName: string, qrUrl: string): Promise<Uint8Array> {
  // Need qrcode library: install with `npm install qrcode @types/qrcode`
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([252, 360]); // ~2.5x3.5 inch trading card
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 252, height: 360, color: rgb(0, 0, 0) });
  page.drawText(displayName.toUpperCase(), { x: 20, y: 320, size: 22, font, color: rgb(1, 0.86, 0.28) });
  page.drawText('THE X TRACKER', { x: 20, y: 340, size: 8, font, color: rgb(1, 1, 1) });
  // QR code as PNG bytes
  const qrPngBytes = await QRCode.toBuffer(qrUrl, { width: 200, margin: 1, color: { dark: '#FFFFFF', light: '#00000000' } });
  const qrImg = await pdf.embedPng(qrPngBytes);
  page.drawImage(qrImg, { x: 26, y: 50, width: 200, height: 200 });
  page.drawText('Scan zum Login', { x: 80, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6) });
  return pdf.save();
}
```

Install: `npm install qrcode @types/qrcode`

- [ ] **Step 2: Create kid page**

```tsx
// src/pages/werkstatt/CreateKidPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateToken, buildQrCardPdf } from '../../lib/qr-card';
import { env } from '../../lib/env';

export function CreateKidPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const { token, tokenHash } = await generateToken();
      const { data, error } = await supabase.from('kids').insert({
        display_name: name,
        token_hash: tokenHash,
      }).select('id, display_name').single();
      if (error) throw error;

      const qrUrl = `${window.location.origin}/q/${token}`;
      const pdfBytes = await buildQrCardPdf(data.display_name, qrUrl);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `karte-${data.display_name}.pdf`; a.click();
      URL.revokeObjectURL(url);
      nav('/werkstatt');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Neuer Spieler</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name"
        className="w-full p-2 bg-zinc-800 rounded" />
      <button onClick={create} disabled={!name || busy}
        className="p-3 bg-bx-yellow text-black font-bold rounded disabled:opacity-30">
        Anlegen + Karte drucken
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire route**

```tsx
import { CreateKidPage } from './pages/werkstatt/CreateKidPage';
// inside Werkstatt route:
<Route path="new" element={<CreateKidPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/qr-card.ts src/pages/werkstatt/CreateKidPage.tsx src/routes.tsx
git commit -m "feat: create kid + generate QR card PDF"
```

---

## Task 42: Disputes admin page (override)

**Files:**
- Create: `src/pages/werkstatt/DisputesPage.tsx`

- [ ] **Step 1: Page**

```tsx
// src/pages/werkstatt/DisputesPage.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function DisputesPage() {
  const qc = useQueryClient();
  const { data: voided = [] } = useQuery({
    queryKey: ['voided'],
    queryFn: async () => (await supabase.from('battles').select('*, disputes(*)').eq('status', 'voided').order('voided_at', { ascending: false })).data ?? [],
  });
  const override = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('battles').update({ status: 'confirmed', voided_at: null, voided_reason: 'admin_override', confirmed_at: new Date().toISOString() }).eq('id', id);
      // Trigger ELO recompute via cron (will pick up via separate run)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voided'] }),
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Gemeldete Schlachten</h2>
      {voided.map((b: any) => (
        <div key={b.id} className="p-3 bg-zinc-900 rounded">
          <div className="text-sm">Battle {b.id.slice(0, 8)} — voided {b.voided_reason}</div>
          <button onClick={() => override.mutate(b.id)} className="text-xs text-bx-yellow mt-1">Doch zählen lassen</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire route + commit**

```tsx
import { DisputesPage } from './pages/werkstatt/DisputesPage';
<Route path="disputes" element={<DisputesPage />} />
```

```bash
git add src/pages/werkstatt/DisputesPage.tsx src/routes.tsx
git commit -m "feat: disputes admin page (override)"
```

---

# Phase G — PWA + Deploy

## Task 43: PWA manifest + service worker

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png` (use a placeholder design or commission)

- [ ] **Step 1: Update `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Beystadium',
        short_name: 'Beystadium',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', networkTimeoutSeconds: 5 },
        }],
      },
    }),
  ],
});
```

- [ ] **Step 2: Add placeholder icons**

Use a simple "X" on black for placeholder. Engineer creates 192px / 512px / 512px maskable PNG files in `public/icons/`. For the placeholder, any black-bg yellow-X PNG works. Sketch in Figma or use inkscape.

- [ ] **Step 3: Build + verify**

```bash
npm run build
```
Expected: `dist/sw.js` + `dist/manifest.webmanifest` generated.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts public/icons
git commit -m "feat: PWA manifest + service worker"
```

---

## Task 44: Deploy to Vercel

**Files:**
- Create: `vercel.json` (optional config)

- [ ] **Step 1: Push repo to GitHub**

```bash
git remote add origin <github-url>
git push -u origin main
```

- [ ] **Step 2: Connect Vercel**

In Vercel dashboard: New Project → import GitHub repo. Build command auto-detected (`npm run build`), output dir `dist`.

- [ ] **Step 3: Configure env vars** in Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

- [ ] **Step 4: Deploy + verify**

Trigger deployment. Visit deploy URL. Confirm:
- Admin login works
- Werkstatt → create a kid + download PDF
- Print PDF, scan QR with phone → kid lands on home

- [ ] **Step 5: Smoke test the full kid flow**

1. Create 2 kids (Marc + Marie test accounts)
2. Print both QR cards
3. Scan card 1 on a phone → log a battle vs Marie 3-1
4. Wait > 24h OR manually run cron: `curl POST /functions/v1/confirm-pending`
5. Verify battle confirmed, both kids' floor/ELO updated
6. Scan card 2 on second phone → dispute the battle
7. Verify battle voided, ELO reverts

- [ ] **Step 6: Commit any deploy fixes + tag**

```bash
git tag v0.1.0-mvp
git push origin v0.1.0-mvp
```

---

# End of Plan 1

## What Plan 1 ships:
- Authenticated PWA with QR-card login
- Kids log battles in 4 steps with offline tolerance
- 24h dispute window with anyone-can-flag, auto-void, admin override
- Auto-confirm cron (every 5 min) computing K=16 ELO + floor
- Tower view (sparse leaderboard with king-of-hill at floor 100)
- Profile pages (own + public) with placeholder card
- Crew feed with filters
- Home dashboard with motivator hook
- Admin Werkstatt: create kid, print QR card, override disputes
- 4 starter beys seeded manually

## Plan 2 (next):
Trading-card visual upgrades (5 tiers, holo foils, slash-cuts, X-watermarks, tagline editing, card share-as-image, animations), endorsement stickers + flow, push notifications.

## Plan 3 (after that):
Bey roster scraping pipeline (admin-triggered Edge Function), bey browser, bey detail pages, bey ownership management UI, Wave 2 character/team/term scrapes.
