/* =====================================================================
 * WEAPON V1 — client sync layer (Supabase, user-picker model, no login)
 *
 * Load AFTER app.js:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="app.js"></script>
 *   <script src="database/sync.js"></script>
 *   <!-- then paste database/user-picker.html before </body> -->
 *
 * There are no passwords. A "user" is a row in app_users. The picker
 * stores the chosen user id in localStorage and everything reads/writes
 * as that user. Data lives in Supabase (cloud) and syncs across devices.
 * ===================================================================== */

// Keys are injected at deploy time via env.js (generated from GitHub Secrets).
// Falls back to the placeholders so the app still loads if env.js is missing.
const SB_URL  = (window.SUPABASE_URL  || 'https://YOUR-PROJECT.supabase.co');
const SB_ANON = (window.SUPABASE_ANON || 'YOUR-ANON-KEY');

const sb = window.supabase.createClient(SB_URL, SB_ANON);
const CUR = 'weapon_user_id';   // localStorage key holding the selected user id

/* ---------- users ---------------------------------------------------- */
async function listUsers() {
  const { data, error } = await sb.from('app_users')
    .select('id,username,display_name,bodyweight_kg').order('username');
  if (error) throw error;
  return data || [];
}

async function addUser(username) {
  const name = (username || '').trim();
  const { data, error } = await sb.from('app_users')
    .insert({ username: name, display_name: name }).select('id,username').single();
  if (error) throw error;
  return data;
}

function currentUserId() { return localStorage.getItem(CUR); }

async function selectUser(id) {
  localStorage.setItem(CUR, id);
  // import this browser's OLD local history ONE time only (into whoever is
  // picked first) — never re-import it into every new user.
  if (!localStorage.getItem('weapon_legacy_imported')) {
    await migrateLocalToCloud(id);
    localStorage.setItem('weapon_legacy_imported', '1');
  }
  await loadProfileIntoApp(id);   // this user's own profile
  await pullCloudIntoApp();        // this user's own workouts
  document.dispatchEvent(new CustomEvent('wpn-user-changed', { detail: { id } }));
  renderApp();
}

/* Pull one user's profile fields into the app's in-memory db, so the ID
   card / settings / bodyweight all reflect THAT user. */
async function loadProfileIntoApp(id) {
  const { data } = await sb.from('app_users')
    .select('display_name,job,height,bio,spotify,bodyweight_kg,display')
    .eq('id', id).single();
  if (!data || typeof db === 'undefined') return;
  db.profile = {
    name: data.display_name || '', job: data.job || '',
    height: data.height || '', bio: data.bio || '', spotify: data.spotify || '',
  };
  db.bw = Number(data.bodyweight_kg) || 75;
  db.display = data.display || {};
}

/* Save the current user's profile (name/job/height/bio/spotify/bw/display). */
async function pushProfile() {
  const id = currentUserId();
  if (!id || typeof db === 'undefined') return;
  const p = db.profile || {};
  await sb.from('app_users').update({
    display_name: p.name || null, job: p.job || null, height: p.height || null,
    bio: p.bio || null, spotify: p.spotify || null,
    bodyweight_kg: db.bw || 75, display: db.display || {},
  }).eq('id', id);
}

/* Re-render using the app's real render functions (no single renderAll). */
function renderApp() {
  try { if (typeof applyDisplay === 'function') applyDisplay(); } catch (e) {}
  try { if (typeof applyMode === 'function') applyMode(); } catch (e) {}
  try { if (typeof renderIDCard === 'function') renderIDCard(); } catch (e) {}
}

/* ---------- one-time migration of the local blob into a user --------- */
async function migrateLocalToCloud(userId) {
  let blob;
  try { blob = JSON.parse(localStorage.getItem('gymtracker_v3')); } catch { return; }
  if (!blob) return;

  // carry the old local profile into this first user too
  const prof = blob.profile || {};
  const upd = {
    job: prof.job || null, height: prof.height || null, bio: prof.bio || null,
    spotify: prof.spotify || null, bodyweight_kg: Number(blob.bw) || 75,
    display: blob.display || {},
  };
  if (prof.name) upd.display_name = prof.name;
  await sb.from('app_users').update(upd).eq('id', userId);

  const exMap = await loadExerciseMap(userId, blob);
  const logs = (blob.strength?.logs || []).concat(blob.endurance?.logs || []);
  const byDate = {};
  for (const l of logs) (byDate[l.date] ||= []).push(l);

  for (const [date, dayLogs] of Object.entries(byDate)) {
    const { data: w, error } = await sb.from('workouts')
      .insert({ user_id: userId, date, mode: 'strength' }).select('id').single();
    if (error) { console.error(error); continue; }
    const rows = dayLogs.map(l => ({
      workout_id: w.id, user_id: userId, exercise_id: exMap[l.ex],
      kg: l.kg ?? null, reps: l.reps ?? null, sets: l.sets ?? 1,
    })).filter(r => r.exercise_id);
    if (rows.length) await sb.from('workout_logs').insert(rows);
  }
}

async function loadExerciseMap(userId, blob) {
  const { data: ex } = await sb.from('exercises')
    .select('id,name,owner_id').or(`is_preset.eq.true,owner_id.eq.${userId}`);
  const map = {};
  for (const e of ex || []) map[e.name] = e.id;
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

/* ---------- pull / push for the current user ------------------------- */
async function pullCloudIntoApp() {
  const uid = currentUserId();
  if (!uid) return;
  const { data: logs } = await sb.from('workout_logs')
    .select('id,kg,reps,sets,created_at, workouts!inner(date,mode), exercises!inner(name)')
    .eq('user_id', uid).order('created_at', { ascending: true });
  const flat = (logs || []).map(r => ({
    id: r.id, date: r.workouts.date, ex: r.exercises.name,
    kg: r.kg, reps: r.reps, sets: r.sets,
  }));
  if (typeof db !== 'undefined') {
    db.strength.logs = flat;   // TODO: split strength vs endurance by workouts.mode
    if (typeof save === 'function') save();
  }
}

async function pushLog(log) {
  const uid = currentUserId();
  if (!uid) return;   // no user selected → stays local only
  let { data: w } = await sb.from('workouts')
    .select('id').eq('user_id', uid).eq('date', log.date).maybeSingle();
  if (!w) {
    const ins = await sb.from('workouts').insert({ user_id: uid, date: log.date }).select('id').single();
    w = ins.data;
  }
  const exId = await ensureExerciseId(uid, log.ex);
  await sb.from('workout_logs').insert({
    workout_id: w.id, user_id: uid, exercise_id: exId,
    kg: log.kg, reps: log.reps, sets: log.sets,
  });
}

async function ensureExerciseId(uid, name) {
  const { data } = await sb.from('exercises')
    .select('id').or(`is_preset.eq.true,owner_id.eq.${uid}`).eq('name', name).maybeSingle();
  if (data) return data.id;
  const ins = await sb.from('exercises')
    .insert({ owner_id: uid, name, muscle_group: 'Chest', is_preset: false }).select('id').single();
  return ins.data.id;
}

/* ---------- social helpers (for the feed/leaderboard UI later) ------- */
const followUser   = (id) => sb.from('follows').insert({ follower_id: currentUserId(), following_id: id });
const unfollowUser = (id) => sb.from('follows').delete().eq('follower_id', currentUserId()).eq('following_id', id);
const likeWorkout  = (id) => sb.from('workout_likes').insert({ workout_id: id, user_id: currentUserId() });
const getFeed      = ()   => sb.from('v_feed').select('*').order('created_at', { ascending: false }).limit(50);
const getBoard     = (exId) => sb.from('v_leaderboard').select('*').eq('exercise_id', exId).order('rank').limit(100);

window.WeaponSync = {
  listUsers, addUser, selectUser, currentUserId,
  loadProfileIntoApp, pushProfile, pullCloudIntoApp, pushLog,
  followUser, unfollowUser, likeWorkout, getFeed, getBoard,
};

/* auto-load the current user's profile + data on page load */
if (currentUserId()) {
  (async () => {
    await loadProfileIntoApp(currentUserId());
    await pullCloudIntoApp();
    renderApp();
  })();
}
