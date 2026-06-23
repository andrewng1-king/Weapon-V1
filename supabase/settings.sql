-- =====================================================================
-- WEAPON V1 — settings column + helper indexes for the normalized model.
-- Run AFTER setup.sql. Idempotent: safe to re-run.
--
-- The original app stored its entire state as one JSON blob in
-- app_users.data. The migrated app normalizes logs/exercises/workouts into
-- relational tables, but UI-only state that has no relational meaning
-- (theme, accent, logo, goals.calTarget, per-group exercise order, the
-- "removed" preset list, seenLevel, profile extras, mode preference, and the
-- otherwise-unused endurance bucket) is kept in this jsonb column.
--
-- SECURITY NOTE: unchanged from setup.sql — no auth; the anon key may read
-- and write everything. This matches the chosen no-auth user-picker model.
-- =====================================================================

alter table public.app_users
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Custom exercises are resolved by (owner_id, lower(name)); presets by name.
-- These indexes support the reconstruction queries in the data layer.
create index if not exists workout_logs_user_created_idx
  on public.workout_logs (user_id, created_at);

create index if not exists exercises_lower_name_idx
  on public.exercises (lower(name));

-- Convenience: each (user, date, mode) maps to exactly one workout row.
create unique index if not exists workouts_user_date_mode_uniq
  on public.workouts (user_id, date, mode);
