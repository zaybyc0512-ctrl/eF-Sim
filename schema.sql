-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Auth & Permissions)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. PLAYERS (Wiki Entires)
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  team text,
  position text,
  card_type text not null, -- e.g., "Big Time 11 Jan '15"
  
  -- Fingerprint for Uniqueness: card_type + name
  -- Example: "Big Time 11 Jan '15_Lionel Messi"
  fingerprint text GENERATED ALWAYS AS (card_type || '_' || name) STORED unique,
  
  evidence_url text, -- Screenshot URL
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. PLAYER STATS (Attributes)
create table public.player_stats (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.players(id) on delete cascade not null,
  level_variant text not null check (level_variant in ('lvl1', 'max')),
  
  -- Core Stats (Example set - expand as needed)
  offensive_awareness integer,
  ball_control integer,
  dribbling integer,
  tight_possession integer,
  low_pass integer,
  loft_pass integer,
  finishing integer,
  heading integer,
  place_kicking integer,
  curl integer,
  speed integer,
  acceleration integer,
  kicking_power integer,
  jump integer,
  physical_contact integer,
  balance integer,
  stamina integer,
  defensive_engagement integer,
  tackling integer,
  aggression integer,
  gk_awareness integer,
  gk_catching integer,
  gk_parrying integer,
  gk_reflexes integer,
  gk_reach integer,
  
  updated_at timestamptz default now(),
  
  -- Constraint: One set of stats per level variant per player
  unique(player_id, level_variant)
);

-- 4. EDIT HISTORY (Audit Log)
create table public.edit_history (
  id uuid default uuid_generate_v4() primary key,
  target_table text not null, -- 'players' or 'player_stats'
  record_id uuid not null,
  old_data jsonb, -- Snapshot before change
  new_data jsonb, -- Snapshot after change
  changed_by uuid references public.profiles(id) not null,
  changed_at timestamptz default now()
);

-- RLS POLICIES
alter table profiles enable row level security;
alter table players enable row level security;
alter table player_stats enable row level security;
alter table edit_history enable row level security;

-- Public read access
create policy "Public read profiles" on profiles for select using (true);
create policy "Public read players" on players for select using (true);
create policy "Public read stats" on player_stats for select using (true);
create policy "Public read history" on edit_history for select using (true);

-- Authenticated update access
create policy "Auth insert players" on players for insert with check (auth.uid() = created_by);
-- Note: Further policies for update/delete and other tables should be added based on specific app logic
