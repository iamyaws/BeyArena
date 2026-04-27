-- supabase/migrations/0001_init_schema_part1.sql

create extension if not exists "uuid-ossp";

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

create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color_hex text not null,
  logo_url text,
  created_by_kid_id uuid references kids(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table kids add constraint kids_primary_team_fk
  foreign key (primary_team_id) references teams(id) on delete set null;

create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  kid_id uuid not null references kids(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, kid_id)
);

create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  kid_id uuid not null references kids(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (kid_id, endpoint)
);
