/* =====================================================================
 * WEAPON V1 — client sync layer (Supabase)
 * Drop-in scaffold. Load AFTER app.js with the Supabase UMD bundle:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="app.js"></script>
 *   <script src="database/sync.js"></script>
 *
 * What it does:
 *   1. Connects to Supabase + handles email/OAuth sign-in.
 *   2. On first login, MIGRATES the existing localStorage blob (gymtracker_v3)
 *      into the cloud tables — so nobody loses their history.
 *   3. Pulls cloud data back into the app's `db` object and re-renders.
 *   4. Pushes new workouts up as they're saved.
 *
 * This is a starting point, not a finished feature. The TODOs mark the
 * spots that depend on decisions still open in DATABASE-PLAN.md.
 * ===================================================================== */

const SB_URL  = 'https://YOUR-PROJECT.supabase.co';   // TODO: from Supabase dashboard
const SB_ANON = 'YOUR-ANON-KEY';                       // TODO: anon/public key (safe in client)

const sb = window.supabase.createClient(SB_URL, SB_ANON);

/* ---------- auth ------------------------------------------------------ */
async function signInWithEmail(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
async function signUpWithEmail(email, password, username) {
  const { error } = await sb.auth.signUp({
    email, password,
    options: { data: { username } },   // handle_new_user() reads this
  });
  if (error) throw error;
}
async function signOut() { await sb.auth.signOut(); }

/* react to login/logout */
sb.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await onSignedIn(session.user);
  }
});

async function onSignedIn(user) {
  // one-time migration of the local blob
  if (!localStorage.getItem('weapon_migrated')) {
    await migrateLocalToCloud(user.id);
    localStorage.setItem('weapon_migrated', '1');
  }
  await pullCloudIntoApp();   // refresh in-memory db from server
  if (typeof renderAll === 'function') renderAll();   // app's own re-render hook
}

/* ---------- one-time migration --------------------------------------- */
/* Reads the app's existing JSON blob and writes it into the new tables. */
async function migrateLocalToCloud(userId) {
  let blob;
  try { blob = JSON.parse(localStorage.getItem('gymtracker_v3')); } catch { return; }
  if (!blob) return;

  // map the user's profile bits
  await sb.from('profiles').update({
    bodyweight_kg: Number(blob.bw) || 75,
    mode_pref: blob.mode === 'endurance' ? 'endurance' : 'strength',
  }).eq('id', userId);

  // build a name->exercise_id map (presets + this user's customs)
  const exMap = await loadExerciseMap(userId, blob);

  // group the flat logs into workouts by date
  const logs = (blob.strength?.logs || []).concat(blob.endurance?.logs || []);
  const byDate = {};
  for (const l of logs) (byDate[l.date] ||= []).push(l);

  for (const [date, dayLogs] of Object.entries(byDate)) {
    const { data: w, error } = await sb.from('workouts')
      .insert({ user_id: userId, date, mode: 'strength', visibility: 'private' })
      .select('id').single();
    if (error) { console.error('workout insert', error); continue; }

    const rows = dayLogs.map(l => ({
      workout_id: w.id, user_id: userId,
      exercise_id: exMap[l.ex],
      kg: l.kg ?? null, reps: l.reps ?? null, sets: l.sets ?? 1,
    })).filter(r => r.exercise_id);   // skip logs whose exercise we couldn't map
    if (rows.length) await sb.from('workout_logs').insert(rows);
  }
}

/* Ensure every exercise name in the blob has a row; create customs as needed. */
async function loadExerciseMap(userId, blob) {
  const { data: ex } = await sb.from('exercises')
    .select('id,name,owner_id').or(`is_preset.eq.true,owner_id.eq.${userId}`);
  const map = {};
  for (const e of ex || []) map[e.name] = e.id;

  // create custom exercises that exist locally but not in the catalogue
  const customs = (blob.strength?.custom || []).concat(blob.endurance?.custom || []);
  for (const c of customs) {
    if (map[c.n]) continue;
    const { data, error } = await sb.from('exercises').insert({
      owner_id: userId, name: c.n, muscle_group: c.g || 'Chest',
      description: c.t || null, default_kg: c.start || 0, is_preset: false,
    }).select('id').single();
    if (!error) map[c.n] = data.id;
  }
  return map;
}

/* ---------- pull / push ---------------------------------------------- */
/* Rebuild the app's in-memory `db` from the cloud. */
async function pullCloudIntoApp() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data: logs } = await sb.from('workout_logs')
    .select('id,kg,reps,sets,created_at, workouts!inner(date,mode), exercises!inner(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  // reshape into the app's {ex,kg,reps,sets,date,id} log format
  const flat = (logs || []).map(r => ({
    id: r.id, date: r.workouts.date, ex: r.exercises.name,
    kg: r.kg, reps: r.reps, sets: r.sets,
  }));

  if (typeof db !== 'undefined') {
    db.strength.logs = flat;            // TODO: split strength vs endurance by workouts.mode
    if (typeof save === 'function') save();   // keep local cache warm/offline
  }
}

/* Call this from the app's addLog() after a set is recorded. */
async function pushLog(log, opts = {}) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;                    // offline / logged-out: stays in localStorage only

  // find-or-create the workout for that date
  let { data: w } = await sb.from('workouts')
    .select('id').eq('user_id', user.id).eq('date', log.date).maybeSingle();
  if (!w) {
    const ins = await sb.from('workouts')
      .insert({ user_id: user.id, date: log.date, visibility: opts.visibility || 'followers' })
      .select('id').single();
    w = ins.data;
  }
  const exId = await ensureExerciseId(user.id, log.ex);
  await sb.from('workout_logs').insert({
    workout_id: w.id, user_id: user.id, exercise_id: exId,
    kg: log.kg, reps: log.reps, sets: log.sets,
  });
}

async function ensureExerciseId(userId, name) {
  const { data } = await sb.from('exercises')
    .select('id').or(`is_preset.eq.true,owner_id.eq.${userId}`).eq('name', name).maybeSingle();
  if (data) return data.id;
  const ins = await sb.from('exercises')
    .insert({ owner_id: userId, name, muscle_group: 'Chest', is_preset: false })
    .select('id').single();
  return ins.data.id;
}

/* ---------- social helpers (used by the feed UI you build next) ------ */
const followUser   = (id) => sb.from('follows').insert({ following_id: id });
const unfollowUser = (id) => sb.from('follows').delete().eq('following_id', id);
const likeWorkout  = (id) => sb.from('workout_likes').insert({ workout_id: id });
const getFeed      = ()   => sb.from('v_feed').select('*').order('created_at', { ascending: false }).limit(50);
const getBoard     = (exId) => sb.from('v_leaderboard').select('*').eq('exercise_id', exId).order('rank').limit(100);

/* expose for the rest of the app */
window.WeaponSync = {
  signInWithEmail, signUpWithEmail, signOut,
  pullCloudIntoApp, pushLog,
  followUser, unfollowUser, likeWorkout, getFeed, getBoard,
};
