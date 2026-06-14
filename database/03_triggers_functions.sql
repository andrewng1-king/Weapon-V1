-- =====================================================================
-- WEAPON V1 — TRIGGERS & FUNCTIONS
-- File 03 of 04. Run AFTER 00_schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Auto-create a profile row when a new auth user signs up.
--    Username comes from auth metadata or falls back to user_<short id>.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname citext;
begin
  uname := nullif(new.raw_user_meta_data->>'username', '');
  if uname is null or not (uname ~ '^[a-zA-Z0-9_]{3,24}$') then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  -- guarantee uniqueness
  while exists (select 1 from public.profiles where username = uname) loop
    uname := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, uname, coalesce(new.raw_user_meta_data->>'display_name', uname));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2) keep profiles.updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3) Maintain personal_records when a strength log is inserted/updated.
--    PR = highest estimated 1RM (Epley) per user+exercise.
-- ---------------------------------------------------------------------
create or replace function public.maintain_pr()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.e1rm is null then
    return new;
  end if;

  insert into public.personal_records
    (user_id, exercise_id, best_e1rm, best_kg, best_reps, log_id, achieved_at)
  values
    (new.user_id, new.exercise_id, new.e1rm, new.kg, new.reps, new.id, now())
  on conflict (user_id, exercise_id) do update
    set best_e1rm   = excluded.best_e1rm,
        best_kg     = excluded.best_kg,
        best_reps   = excluded.best_reps,
        log_id      = excluded.log_id,
        achieved_at = excluded.achieved_at
    where excluded.best_e1rm > public.personal_records.best_e1rm;

  return new;
end $$;

drop trigger if exists logs_maintain_pr on public.workout_logs;
create trigger logs_maintain_pr
  after insert or update of kg, reps on public.workout_logs
  for each row execute function public.maintain_pr();
