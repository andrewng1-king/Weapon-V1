-- =====================================================================
-- WEAPON V1 — DATABASE SETUP (user-picker model, no login/auth)
-- Run this ONE file in the Supabase SQL Editor. Idempotent-ish: safe to
-- re-run, but the seed only inserts missing exercises.
--
-- SECURITY NOTE: there is no authentication. Policies allow the public
-- (anon) key to read/write everything. Anyone with the site URL can act
-- as any user. Fine for a personal/friends tracker; NOT for a public app.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

do $$ begin
  create type training_mode as enum ('strength', 'endurance');
exception when duplicate_object then null; end $$;

-- ----- users (plain table, NOT tied to Supabase Auth) ----------------
create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  username      citext unique not null,
  display_name  text,
  avatar_url    text,
  bodyweight_kg numeric(5,1) default 75,
  created_at    timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_ ]{2,24}$')
);

-- ----- exercise catalogue (owner_id NULL = global preset) ------------
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.app_users(id) on delete cascade,
  name         text not null,
  muscle_group text not null,
  description  text,
  default_kg   numeric(6,2) default 0,
  is_preset    boolean not null default false,
  created_at   timestamptz not null default now()
);
create unique index if not exists exercises_owner_name_uniq
  on public.exercises (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ----- workouts (one training day) -----------------------------------
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  date        date not null default current_date,
  mode        training_mode not null default 'strength',
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

-- ----- workout_logs (one exercise within a workout) ------------------
create table if not exists public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  user_id      uuid not null references public.app_users(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id),
  kg           numeric(6,2),
  reps         integer,
  sets         integer default 1,
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
create index if not exists logs_workout_idx on public.workout_logs (workout_id);
create index if not exists logs_user_ex_idx on public.workout_logs (user_id, exercise_id, created_at desc);

-- ----- social --------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references public.app_users(id) on delete cascade,
  following_id uuid not null references public.app_users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create table if not exists public.workout_likes (
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id    uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

create table if not exists public.workout_comments (
  id         uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id    uuid not null references public.app_users(id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_workout_idx on public.workout_comments (workout_id, created_at);

create table if not exists public.personal_records (
  user_id      uuid not null references public.app_users(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  best_e1rm    numeric(7,2),
  best_kg      numeric(6,2),
  best_reps    integer,
  log_id       uuid references public.workout_logs(id) on delete set null,
  achieved_at  timestamptz,
  primary key (user_id, exercise_id)
);

-- =====================================================================
-- RLS — open access (no auth). The anon key may do everything.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'app_users','exercises','workouts','workout_logs',
    'follows','workout_likes','workout_comments','personal_records'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists open_all on public.%I;', t);
    execute format(
      'create policy open_all on public.%I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- =====================================================================
-- Personal records trigger (best estimated 1RM per user+exercise)
-- =====================================================================
create or replace function public.maintain_pr()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.e1rm is null then return new; end if;
  insert into public.personal_records
    (user_id, exercise_id, best_e1rm, best_kg, best_reps, log_id, achieved_at)
  values
    (new.user_id, new.exercise_id, new.e1rm, new.kg, new.reps, new.id, now())
  on conflict (user_id, exercise_id) do update
    set best_e1rm=excluded.best_e1rm, best_kg=excluded.best_kg,
        best_reps=excluded.best_reps, log_id=excluded.log_id, achieved_at=excluded.achieved_at
    where excluded.best_e1rm > public.personal_records.best_e1rm;
  return new;
end $$;

drop trigger if exists logs_maintain_pr on public.workout_logs;
create trigger logs_maintain_pr
  after insert or update of kg, reps on public.workout_logs
  for each row execute function public.maintain_pr();

-- =====================================================================
-- Views (feed / leaderboard / profile stats) — no auth.uid() used.
-- "liked_by_me" is computed client-side from the picker's current user.
-- =====================================================================
create or replace view public.v_feed as
select
  w.id as workout_id, w.user_id, u.username, u.display_name, u.avatar_url,
  w.date, w.mode, w.note, w.created_at,
  coalesce(agg.total_volume,0)   as total_volume,
  coalesce(agg.exercise_count,0) as exercise_count,
  coalesce(lk.like_count,0)      as like_count,
  coalesce(cm.comment_count,0)   as comment_count
from public.workouts w
join public.app_users u on u.id = w.user_id
left join lateral (
  select sum(coalesce(l.kg,0)*coalesce(l.reps,0)*coalesce(l.sets,1)) as total_volume,
         count(*) as exercise_count
  from public.workout_logs l where l.workout_id = w.id
) agg on true
left join (select workout_id, count(*) like_count from public.workout_likes group by workout_id) lk
  on lk.workout_id = w.id
left join (select workout_id, count(*) comment_count from public.workout_comments group by workout_id) cm
  on cm.workout_id = w.id;

create or replace view public.v_leaderboard as
select
  pr.exercise_id, e.name as exercise_name, e.muscle_group,
  pr.user_id, u.username, u.display_name,
  pr.best_e1rm, pr.best_kg, pr.best_reps, pr.achieved_at,
  rank() over (partition by pr.exercise_id order by pr.best_e1rm desc) as rank
from public.personal_records pr
join public.app_users u on u.id = pr.user_id
join public.exercises e on e.id = pr.exercise_id
where pr.best_e1rm is not null;

create or replace view public.v_profile_stats as
select
  u.id as user_id, u.username, u.display_name,
  (select count(*) from public.workouts w where w.user_id = u.id) as workout_count,
  (select count(*) from public.follows f where f.following_id = u.id) as followers,
  (select count(*) from public.follows f where f.follower_id  = u.id) as following,
  (select coalesce(sum(coalesce(l.kg,0)*coalesce(l.reps,0)*coalesce(l.sets,1)),0)
     from public.workout_logs l where l.user_id = u.id) as lifetime_volume
from public.app_users u;

-- =====================================================================
-- Seed: 30 preset exercises (from app.js)
-- =====================================================================
insert into public.exercises (owner_id, name, muscle_group, description, default_kg, is_preset) values
  (null,'Bench Press','Chest','Mid chest · front delts · triceps',40,true),
  (null,'Incline Press','Chest','Upper chest · front delts',30,true),
  (null,'Dip','Chest','Lower chest · triceps',0,true),
  (null,'Cable Fly','Chest','Inner & mid chest',12.5,true),
  (null,'Pull-up','Back','Lats · upper back',0,true),
  (null,'Lat Pulldown','Back','Lats — back width',40,true),
  (null,'Barbell Row','Back','Mid back · lats — thickness',40,true),
  (null,'Seated Cable Row','Back','Mid back · rhomboids',40,true),
  (null,'Deadlift','Back','Lower back · glutes · hamstrings',60,true),
  (null,'Overhead Press','Shoulders','Front & side delts · triceps',30,true),
  (null,'Lateral Raise','Shoulders','Side delts — width',8,true),
  (null,'Rear Delt Fly','Shoulders','Rear delts · upper back',8,true),
  (null,'Face Pull','Shoulders','Rear delts · traps — posture',15,true),
  (null,'Shrug','Shoulders','Upper traps',40,true),
  (null,'Barbell Curl','Arms','Biceps — overall mass',20,true),
  (null,'Hammer Curl','Arms','Biceps · brachialis',10,true),
  (null,'Preacher Curl','Arms','Biceps — strict isolation',15,true),
  (null,'Tricep Pushdown','Arms','Triceps — lateral head',20,true),
  (null,'Skull Crusher','Arms','Triceps — long head',20,true),
  (null,'Squat','Legs','Quads · glutes',50,true),
  (null,'Leg Press','Legs','Quads · glutes',80,true),
  (null,'Leg Extension','Legs','Quads — isolation',30,true),
  (null,'Romanian Deadlift','Legs','Hamstrings · glutes',50,true),
  (null,'Leg Curl','Legs','Hamstrings — isolation',30,true),
  (null,'Hip Thrust','Legs','Glutes',60,true),
  (null,'Calf Raise','Legs','Calves',40,true),
  (null,'Cable Crunch','Core','Abs — weighted',25,true),
  (null,'Hanging Leg Raise','Core','Lower abs · hip flexors',0,true),
  (null,'Russian Twist','Core','Obliques — rotation',5,true),
  (null,'Plank','Core','Whole core — reps = seconds',0,true)
on conflict do nothing;
