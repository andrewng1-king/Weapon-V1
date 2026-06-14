-- =====================================================================
-- WEAPON V1 — DATABASE SCHEMA (Supabase / Postgres)
-- File 00 of 04: tables, types, indexes
-- Run order: 00_schema → 01_rls → 02_seed_exercises → 03_triggers_functions → 04_views
-- Multi-user social strength/endurance tracker.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- case-insensitive usernames

-- ----- enums ---------------------------------------------------------
do $$ begin
  create type training_mode as enum ('strength', 'endurance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workout_visibility as enum ('private', 'followers', 'public');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- profiles — 1:1 with auth.users (Supabase Auth owns the credentials)
-- =====================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  bodyweight_kg numeric(5,1) default 75,
  mode_pref     training_mode default 'strength',
  is_public     boolean not null default true,   -- profile discoverable / followable
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,24}$')
);

-- =====================================================================
-- exercises — shared catalogue. owner_id NULL = global preset (seeded).
-- A user's custom exercise has owner_id = their id.
-- =====================================================================
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles(id) on delete cascade,  -- NULL = preset
  name         text not null,
  muscle_group text not null,            -- Chest | Back | Shoulders | Arms | Legs | Core
  description  text,                     -- the app's "t" hint
  default_kg   numeric(6,2) default 0,   -- the app's "start"
  is_preset    boolean not null default false,
  created_at   timestamptz not null default now()
);
-- one name per owner; preset names unique among presets (owner_id NULL)
create unique index if not exists exercises_owner_name_uniq
  on public.exercises (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- =====================================================================
-- workouts — one training day/session per row.
-- =====================================================================
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date not null default current_date,
  mode        training_mode not null default 'strength',
  note        text,
  visibility  workout_visibility not null default 'followers',
  created_at  timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists workouts_visibility_idx on public.workouts (visibility, created_at desc);

-- =====================================================================
-- workout_logs — one row per exercise within a workout.
-- Mirrors the app's log {ex, kg, reps, sets} + endurance fields.
-- e1rm is a generated column (Epley) for leaderboards/PRs.
-- =====================================================================
create table if not exists public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,  -- denormalized for RLS speed
  exercise_id  uuid not null references public.exercises(id),
  -- strength
  kg           numeric(6,2),
  reps         integer,
  sets         integer default 1,
  -- endurance
  distance_m   numeric(8,1),
  duration_s   integer,
  rpe          numeric(3,1),
  created_at   timestamptz not null default now(),
  e1rm         numeric(7,2) generated always as (
                 case when kg is not null and reps is not null and reps > 0
                      then round((kg * (1 + reps::numeric / 30.0))::numeric, 2)
                      else null end
               ) stored
);
create index if not exists logs_workout_idx  on public.workout_logs (workout_id);
create index if not exists logs_user_ex_idx  on public.workout_logs (user_id, exercise_id, created_at desc);

-- =====================================================================
-- SOCIAL
-- =====================================================================
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

create table if not exists public.workout_likes (   -- "kudos"
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

create table if not exists public.workout_comments (
  id         uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_workout_idx on public.workout_comments (workout_id, created_at);

-- =====================================================================
-- personal_records — best e1RM per user/exercise (maintained by trigger in 03)
-- =====================================================================
create table if not exists public.personal_records (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  best_e1rm    numeric(7,2),
  best_kg      numeric(6,2),
  best_reps    integer,
  log_id       uuid references public.workout_logs(id) on delete set null,
  achieved_at  timestamptz,
  primary key (user_id, exercise_id)
);
