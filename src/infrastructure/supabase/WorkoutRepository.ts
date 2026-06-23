import type { WeaponState, LogEntry, CustomExercise, Bucket, SportId, Metric } from '@/domain/types';
import type { WorkoutRepository } from '@/application/ports';
import { getSupabase } from './client';
import { SPORT_IDS } from '@/domain/catalogue';

const EMPTY_BUCKET: Bucket = { logs: [], custom: [], removed: [], order: {} };

function emptySports(): Record<SportId, Bucket> {
  const r = {} as Record<SportId, Bucket>;
  for (const s of SPORT_IDS) r[s] = { logs: [], custom: [], removed: [], order: {} };
  return r;
}

const DEFAULT_STATE: WeaponState = {
  sport: 'gym',
  bw: 75,
  sports: emptySports(),
  profile: {},
  goals: { targets: {} },
  theme: 'dark',
  logo: 'weapon',
  dev: { on: false, lvl: 1, color: 0 },
};

/** workouts.mode is a legacy NOT NULL enum (strength|endurance). Map sport→mode. */
function sportToMode(sport: SportId): 'strength' | 'endurance' {
  return sport === 'run' ? 'endurance' : 'strength';
}

interface RawLog {
  id: string;
  exercise_id: string | null;
  kg: number | null;
  reps: number | null;
  sets: number | null;
  metric?: string | null;
  v1?: number | null;
  v2?: number | null;
  u1?: string | null;
  u2?: string | null;
  ex_name?: string | null;
}

export class SupabaseWorkoutRepository implements WorkoutRepository {
  async loadState(userId: string): Promise<WeaponState> {
    const sb = getSupabase();

    const [userRes, exRes, workoutsRes] = await Promise.all([
      sb.from('app_users').select('bodyweight_kg, settings').eq('id', userId).single(),
      sb
        .from('exercises')
        .select('id, name, muscle_group, description, default_kg, is_preset, owner_id, sport, metric, u1, u2')
        .or(`owner_id.eq.${userId},owner_id.is.null`),
      sb
        .from('workouts')
        .select('id, date, sport, workout_logs(id, exercise_id, kg, reps, sets, metric, v1, v2, u1, u2, ex_name)')
        .eq('user_id', userId)
        .order('date', { ascending: false }),
    ]);

    if (userRes.error) throw userRes.error;
    const settings = (userRes.data?.settings as Partial<WeaponState>) ?? {};
    const bw = userRes.data?.bodyweight_kg ?? 75;

    const exercises = exRes.data ?? [];
    const exMap = new Map(exercises.map((e) => [e.id, e]));

    const sports = emptySports();

    // custom exercises grouped by sport
    for (const e of exercises) {
      if (e.owner_id !== userId || e.is_preset) continue;
      const sp = (e.sport as SportId) ?? 'gym';
      if (!sports[sp]) continue;
      sports[sp].custom.push({
        n: e.name,
        g: e.muscle_group,
        t: e.description ?? '',
        start: e.default_kg ?? 0,
        ...(e.metric && e.metric !== 'weight' ? { m: e.metric as Metric } : {}),
        ...(e.u1 ? { u1: e.u1 } : {}),
        ...(e.u2 ? { u2: e.u2 } : {}),
      });
    }

    for (const w of workoutsRes.data ?? []) {
      const sp = ((w as { sport?: string }).sport as SportId) ?? 'gym';
      const bucket = sports[sp] ?? sports.gym;
      const wlogs = (w as { workout_logs: RawLog[] }).workout_logs ?? [];
      for (const l of wlogs) {
        const ex = l.exercise_id ? exMap.get(l.exercise_id) : undefined;
        const name = l.ex_name ?? ex?.name;
        if (!name) continue;
        const metric = (l.metric as Metric) ?? 'weight';
        const entry: LogEntry = {
          id: l.id,
          date: w.date,
          ex: name,
          kg: l.kg ?? 0,
          reps: l.reps ?? 0,
          sets: l.sets ?? 1,
        };
        if (metric !== 'weight') {
          entry.m = metric;
          entry.v1 = l.v1 ?? 0;
          if (l.v2 != null) entry.v2 = l.v2;
          if (l.u1) entry.u1 = l.u1;
          if (l.u2) entry.u2 = l.u2;
        }
        bucket.logs.push(entry);
      }
    }

    // merge persisted per-sport meta (removed/order/seenLevel) from settings
    const persistedSports = (settings.sports ?? {}) as Partial<Record<SportId, Partial<Bucket>>>;

    const mergedSports = {} as Record<SportId, Bucket>;
    for (const s of SPORT_IDS) {
      const meta = persistedSports[s] ?? {};
      mergedSports[s] = {
        ...EMPTY_BUCKET,
        ...meta,
        logs: sports[s].logs,
        custom: sports[s].custom,
        removed: meta.removed ?? [],
        order: meta.order ?? {},
      };
    }

    return {
      ...DEFAULT_STATE,
      ...settings,
      bw,
      sports: mergedSports,
      goals: settings.goals ?? { targets: {} },
    };
  }

  async saveSettings(userId: string, state: WeaponState): Promise<void> {
    const sportsMeta = {} as Record<SportId, { removed: string[]; order: Record<string, string[]>; seenLevel?: number }>;
    for (const s of SPORT_IDS) {
      const b = state.sports[s];
      sportsMeta[s] = { removed: b.removed, order: b.order, seenLevel: b.seenLevel };
    }

    const settings: Record<string, unknown> = {
      sport: state.sport,
      profile: state.profile,
      goals: state.goals,
      theme: state.theme,
      logo: state.logo,
      dev: state.dev,
      sports: sportsMeta,
    };

    const { error } = await getSupabase()
      .from('app_users')
      .update({ settings, bodyweight_kg: state.bw })
      .eq('id', userId);
    if (error) throw error;
  }

  async addLog(userId: string, log: LogEntry, sport: SportId): Promise<void> {
    const sb = getSupabase();

    const exerciseId = await this.resolveExerciseId(userId, log.ex, sport);

    const { data: workout, error: wErr } = await sb
      .from('workouts')
      .upsert(
        { user_id: userId, date: log.date, sport, mode: sportToMode(sport) },
        { onConflict: 'user_id,date,sport' }
      )
      .select('id')
      .single();
    if (wErr) throw wErr;

    const metric: Metric = log.m ?? 'weight';
    const row: Record<string, unknown> = {
      id: log.id,
      workout_id: workout.id,
      user_id: userId,
      exercise_id: exerciseId,
      ex_name: log.ex,
      sets: log.sets,
      metric,
    };
    if (metric === 'weight') {
      row.kg = log.kg;
      row.reps = log.reps;
      row.v1 = log.kg;
      row.u1 = 'kg';
    } else {
      row.v1 = log.v1 ?? 0;
      if (log.v2 != null) row.v2 = log.v2;
      if (log.u1) row.u1 = log.u1;
      if (log.u2) row.u2 = log.u2;
    }

    const { error: lErr } = await sb.from('workout_logs').insert(row);
    if (lErr) throw lErr;
  }

  async deleteLog(userId: string, logId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('workout_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async addCustomExercise(userId: string, ex: CustomExercise): Promise<void> {
    const { error } = await getSupabase().from('exercises').insert({
      owner_id: userId,
      name: ex.n,
      muscle_group: ex.g,
      description: ex.t,
      default_kg: ex.start,
      is_preset: false,
      ...(ex.m ? { metric: ex.m } : {}),
      ...(ex.u1 ? { u1: ex.u1 } : {}),
      ...(ex.u2 ? { u2: ex.u2 } : {}),
    });
    if (error) throw error;
  }

  private async resolveExerciseId(userId: string, exName: string, sport: SportId): Promise<string | null> {
    const sb = getSupabase();
    const { data } = await sb
      .from('exercises')
      .select('id')
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .ilike('name', exName)
      .limit(1)
      .single();
    if (data) return data.id;

    const { data: created, error } = await sb
      .from('exercises')
      .insert({ owner_id: userId, name: exName, muscle_group: 'Other', is_preset: false, sport })
      .select('id')
      .single();
    if (error) {
      // exercise_id is nullable post-migration; fall back to ex_name only
      return null;
    }
    return created?.id ?? null;
  }
}
