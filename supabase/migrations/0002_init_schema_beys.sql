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
