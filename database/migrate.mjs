/**
 * WEAPON — one-time migration: app_users.data (JSON blob) -> normalized tables
 * + app_users.settings (jsonb).
 *
 * Run OFFLINE with the service role (never ship this key to a client):
 *   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE=...  node database/migrate.mjs
 *
 * Idempotent: for each user it rewrites that user's settings, custom exercises,
 * workouts and workout_logs from the current blob, so re-running converges.
 *
 * Requires: @supabase/supabase-js (npm i -w database @supabase/supabase-js, or
 * run from a folder where it is installed). Build @weapon/core first
 * (npm run build -w @weapon/core) so the shared mappers are available.
 */
import { createClient } from '@supabase/supabase-js';
import {
  normaliseState,
  extractSettings,
  groupOf,
  PRESETS,
  GROUPS,
} from '../packages/core/dist/index.js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE;
if (!URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in the environment.');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

/** Resolve the exercise_id for a log name: a user's custom exercise wins, else preset. */
async function buildExerciseIndex(userId, bucket) {
  // Ensure custom exercises exist as rows owned by the user.
  for (const c of bucket.custom || []) {
    await sb
      .from('exercises')
      .upsert(
        {
          owner_id: userId,
          name: c.n,
          muscle_group: c.g,
          description: c.t || null,
          default_kg: c.start || 0,
          is_preset: false,
        },
        { onConflict: 'owner_id,name', ignoreDuplicates: false },
      )
      .select('id');
  }
  const { data: own } = await sb
    .from('exercises')
    .select('id,name')
    .eq('owner_id', userId);
  const { data: presets } = await sb
    .from('exercises')
    .select('id,name')
    .is('owner_id', null);
  const index = new Map();
  for (const p of presets || []) index.set(p.name.toLowerCase(), p.id);
  for (const o of own || []) index.set(o.name.toLowerCase(), o.id); // custom overrides
  return index;
}

async function migrateUser(user) {
  const state = normaliseState(user.data);
  const bucket = state.strength;

  // 1) Settings (UI-only state).
  const settings = extractSettings(state);
  await sb
    .from('app_users')
    .update({ settings, bodyweight_kg: state.bw })
    .eq('id', user.id);

  // 2) Custom exercises + name -> id index.
  const exIndex = await buildExerciseIndex(user.id, bucket);

  // 3) Rewrite workouts + logs from the blob (idempotent full replace).
  await sb.from('workouts').delete().eq('user_id', user.id).eq('mode', 'strength');

  const byDate = new Map();
  for (const l of bucket.logs || []) {
    if (!byDate.has(l.date)) byDate.set(l.date, []);
    byDate.get(l.date).push(l);
  }

  let workoutCount = 0;
  let logCount = 0;
  let skipped = 0;
  for (const [date, logs] of byDate) {
    const { data: w, error: we } = await sb
      .from('workouts')
      .insert({ user_id: user.id, date, mode: 'strength' })
      .select('id')
      .single();
    if (we) {
      console.error(`  workout insert failed (${date}):`, we.message);
      continue;
    }
    workoutCount++;
    const rows = [];
    for (const l of logs) {
      const exId = exIndex.get(String(l.ex).toLowerCase());
      if (!exId) {
        skipped++;
        continue;
      }
      rows.push({
        workout_id: w.id,
        user_id: user.id,
        exercise_id: exId,
        kg: l.kg ?? null,
        reps: l.reps ?? null,
        sets: l.sets ?? 1,
      });
    }
    if (rows.length) {
      const { error: le } = await sb.from('workout_logs').insert(rows);
      if (le) console.error(`  logs insert failed (${date}):`, le.message);
      else logCount += rows.length;
    }
  }
  return { workoutCount, logCount, skipped };
}

async function main() {
  console.log('Preset groups:', GROUPS.join(', '));
  const { data: users, error } = await sb.from('app_users').select('id,username,data');
  if (error) {
    console.error('Could not list users:', error.message);
    process.exit(1);
  }
  console.log(`Found ${users.length} user(s).`);
  for (const u of users) {
    if (!u.data) {
      console.log(`- ${u.username}: no blob, skipping logs (settings only).`);
      continue;
    }
    process.stdout.write(`- ${u.username}: migrating... `);
    try {
      const r = await migrateUser(u);
      console.log(
        `done (${r.workoutCount} workouts, ${r.logCount} logs${r.skipped ? `, ${r.skipped} skipped` : ''}).`,
      );
    } catch (e) {
      console.log('FAILED');
      console.error('  ', e?.message || e);
    }
  }
  console.log('Migration complete.');
  // Touch groupOf/PRESETS so the import is meaningful for type-checkers/linters.
  void groupOf;
  void PRESETS;
}

main();
