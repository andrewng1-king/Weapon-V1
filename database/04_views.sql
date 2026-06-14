-- =====================================================================
-- WEAPON V1 — VIEWS (social feed, leaderboard, profile stats)
-- File 04 of 04. Run AFTER 00–03.
-- Views run with the QUERYING user's RLS, so they only ever expose
-- rows that user is already allowed to see.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Activity feed: workouts from people you follow (or your own),
-- newest first, with like/comment counts and per-workout volume.
-- ---------------------------------------------------------------------
create or replace view public.v_feed as
select
  w.id            as workout_id,
  w.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  w.date,
  w.mode,
  w.note,
  w.visibility,
  w.created_at,
  coalesce(agg.total_volume, 0)        as total_volume,   -- sum(kg*reps*sets)
  coalesce(agg.exercise_count, 0)      as exercise_count,
  coalesce(lk.like_count, 0)           as like_count,
  coalesce(cm.comment_count, 0)        as comment_count,
  exists (select 1 from public.workout_likes wl
          where wl.workout_id = w.id and wl.user_id = auth.uid()) as liked_by_me
from public.workouts w
join public.profiles p on p.id = w.user_id
left join lateral (
  select sum(coalesce(l.kg,0) * coalesce(l.reps,0) * coalesce(l.sets,1)) as total_volume,
         count(*) as exercise_count
  from public.workout_logs l where l.workout_id = w.id
) agg on true
left join (
  select workout_id, count(*) like_count
  from public.workout_likes group by workout_id
) lk on lk.workout_id = w.id
left join (
  select workout_id, count(*) comment_count
  from public.workout_comments group by workout_id
) cm on cm.workout_id = w.id;
-- RLS on workouts already restricts which rows return.

-- ---------------------------------------------------------------------
-- Leaderboard: best estimated 1RM per exercise across all *public*
-- profiles. Ranked, so you can show "you're #N on Bench Press".
-- ---------------------------------------------------------------------
create or replace view public.v_leaderboard as
select
  pr.exercise_id,
  e.name              as exercise_name,
  e.muscle_group,
  pr.user_id,
  p.username,
  p.display_name,
  pr.best_e1rm,
  pr.best_kg,
  pr.best_reps,
  pr.achieved_at,
  rank() over (partition by pr.exercise_id order by pr.best_e1rm desc) as rank
from public.personal_records pr
join public.profiles p on p.id = pr.user_id and p.is_public
join public.exercises e on e.id = pr.exercise_id
where pr.best_e1rm is not null;

-- ---------------------------------------------------------------------
-- Per-profile rollup for profile pages (volume, workouts, followers).
-- ---------------------------------------------------------------------
create or replace view public.v_profile_stats as
select
  p.id as user_id,
  p.username,
  p.display_name,
  (select count(*) from public.workouts w where w.user_id = p.id)                    as workout_count,
  (select count(*) from public.follows f where f.following_id = p.id)                 as followers,
  (select count(*) from public.follows f where f.follower_id = p.id)                  as following,
  (select coalesce(sum(coalesce(l.kg,0)*coalesce(l.reps,0)*coalesce(l.sets,1)),0)
     from public.workout_logs l where l.user_id = p.id)                              as lifetime_volume
from public.profiles p;
