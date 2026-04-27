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
  dispute_window_ends_at timestamptz not null default (now() + interval '24 hours'),
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
