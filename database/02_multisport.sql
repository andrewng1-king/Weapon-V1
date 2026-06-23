-- =====================================================================
-- WEAPON V1 — multi-sport schema extension
-- Run AFTER setup.sql + 01_settings.sql. Idempotent where possible.
-- =====================================================================

-- ----- workouts: sport column (replaces mode for uniqueness) ---------
alter table public.workouts
  add column if not exists sport text;

update public.workouts
set sport = case when mode = 'endurance' then 'run' else 'gym' end
where sport is null;

alter table public.workouts
  alter column sport set default 'gym';

alter table public.workouts
  alter column sport set not null;

drop index if exists public.workouts_user_date_mode_uniq;

create unique index if not exists workouts_user_date_sport_uniq
  on public.workouts (user_id, date, sport);

-- ----- workout_logs: polymorphic fields ------------------------------
alter table public.workout_logs
  add column if not exists metric text not null default 'weight',
  add column if not exists v1 numeric,
  add column if not exists v2 numeric,
  add column if not exists u1 text,
  add column if not exists u2 text,
  add column if not exists set_type text,
  add column if not exists note text,
  add column if not exists ex_name text;

alter table public.workout_logs
  alter column exercise_id drop not null;

-- backfill ex_name + v1 from legacy weight columns
update public.workout_logs wl
set
  ex_name = coalesce(wl.ex_name, e.name),
  metric = case when wl.metric is null or wl.metric = 'weight' then 'weight' else wl.metric end,
  v1 = coalesce(wl.v1, wl.kg),
  u1 = coalesce(wl.u1, 'kg')
from public.exercises e
where wl.exercise_id = e.id
  and (wl.ex_name is null or wl.v1 is null);

update public.workout_logs
set v1 = kg, u1 = 'kg', metric = 'weight'
where metric = 'weight' and v1 is null and kg is not null;

-- ----- exercises: sport + metric metadata ----------------------------
alter table public.exercises
  add column if not exists sport text default 'gym',
  add column if not exists metric text default 'weight',
  add column if not exists u1 text,
  add column if not exists u2 text;

-- ----- profiles storage bucket (public read) -------------------------
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do update set public = true;

drop policy if exists profiles_public_read on storage.objects;
create policy profiles_public_read on storage.objects
  for select using (bucket_id = 'profiles');

-- ----- verify no duplicate workouts ----------------------------------
-- SELECT user_id, date, sport, COUNT(*) FROM workouts GROUP BY 1,2,3 HAVING COUNT(*) > 1;
