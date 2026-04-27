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
