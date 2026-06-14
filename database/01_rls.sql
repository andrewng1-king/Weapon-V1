-- =====================================================================
-- WEAPON V1 — ROW LEVEL SECURITY
-- File 01 of 04. Run AFTER 00_schema.sql.
-- Principle: a user sees their own rows always; other people's rows only
-- when visibility + follow relationship allow it.
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_logs      enable row level security;
alter table public.follows           enable row level security;
alter table public.workout_likes     enable row level security;
alter table public.workout_comments  enable row level security;
alter table public.personal_records  enable row level security;

-- helper: does the current user follow :target ?
create or replace function public.is_following(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target
  );
$$;

-- helper: can current user view this workout?
create or replace function public.can_view_workout(w_user uuid, w_vis workout_visibility)
returns boolean language sql stable security definer set search_path = public as $$
  select
    w_user = auth.uid()
    or w_vis = 'public'
    or (w_vis = 'followers' and public.is_following(w_user));
$$;

-- ----- profiles ------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (is_public or id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ----- exercises -----------------------------------------------------
-- everyone reads presets; users read/manage their own custom exercises
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select
  using (is_preset or owner_id = auth.uid());

drop policy if exists exercises_cud on public.exercises;
create policy exercises_cud on public.exercises for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and is_preset = false);

-- ----- workouts ------------------------------------------------------
drop policy if exists workouts_select on public.workouts;
create policy workouts_select on public.workouts for select
  using (public.can_view_workout(user_id, visibility));

drop policy if exists workouts_cud on public.workouts;
create policy workouts_cud on public.workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----- workout_logs --------------------------------------------------
drop policy if exists logs_select on public.workout_logs;
create policy logs_select on public.workout_logs for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.workouts w
      where w.id = workout_id and public.can_view_workout(w.user_id, w.visibility)
    )
  );

drop policy if exists logs_cud on public.workout_logs;
create policy logs_cud on public.workout_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----- follows -------------------------------------------------------
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select
  using (follower_id = auth.uid() or following_id = auth.uid());

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert
  with check (follower_id = auth.uid());

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete
  using (follower_id = auth.uid());

-- ----- likes ---------------------------------------------------------
drop policy if exists likes_select on public.workout_likes;
create policy likes_select on public.workout_likes for select
  using (
    exists (select 1 from public.workouts w
            where w.id = workout_id and public.can_view_workout(w.user_id, w.visibility))
  );

drop policy if exists likes_insert on public.workout_likes;
create policy likes_insert on public.workout_likes for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workouts w
                where w.id = workout_id and public.can_view_workout(w.user_id, w.visibility))
  );

drop policy if exists likes_delete on public.workout_likes;
create policy likes_delete on public.workout_likes for delete
  using (user_id = auth.uid());

-- ----- comments ------------------------------------------------------
drop policy if exists comments_select on public.workout_comments;
create policy comments_select on public.workout_comments for select
  using (
    exists (select 1 from public.workouts w
            where w.id = workout_id and public.can_view_workout(w.user_id, w.visibility))
  );

drop policy if exists comments_insert on public.workout_comments;
create policy comments_insert on public.workout_comments for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workouts w
                where w.id = workout_id and public.can_view_workout(w.user_id, w.visibility))
  );

drop policy if exists comments_delete on public.workout_comments;
create policy comments_delete on public.workout_comments for delete
  using (user_id = auth.uid());

-- ----- personal_records ---------------------------------------------
drop policy if exists pr_select on public.personal_records;
create policy pr_select on public.personal_records for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = user_id and p.is_public)
  );
-- writes happen via SECURITY DEFINER trigger only; no user write policy.
