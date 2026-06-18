import type { WeaponState, LogEntry, CustomExercise, Bucket } from '@/domain/types';
import type { WorkoutRepository } from '@/application/ports';
import { getSupabase } from './client';
import { todayStr } from '@/domain/format';

const EMPTY_BUCKET: Bucket = { logs: [], custom: [], removed: [], order: {} };

const DEFAULT_STATE: WeaponState = {
  mode: 'strength',
  bw: 75,
  strength: { ...EMPTY_BUCKET },
  endurance: { ...EMPTY_BUCKET },
  profile: {},
  goals: { calTarget: 3000 },
  theme: 'dark',
  logo: 'weapon',
  dev: { on: false, lvl: 1, color: 0 },
};

export class SupabaseWorkoutRepository implements WorkoutRepository {
  async loadState(userId: string): Promise<WeaponState> {
    const sb = getSupabase();

    const [userRes, exRes, workoutsRes] = await Promise.all([
      sb.from('app_users').select('bodyweight_kg, settings').eq('id', userId).single(),
      sb.from('exercises').select('id, name, muscle_group, description, default_kg, is_preset, owner_id')
        .or(`owner_id.eq.${userId},owner_id.is.null`),
      sb.from('workouts').select('id, date, mode, workout_logs(id, exercise_id, kg, reps, sets)')
        .eq('user_id', userId).order('date', { ascending: false }),
    ]);

    if (userRes.error) throw userRes.error;
    const settings = (userRes.data?.settings as Partial<WeaponState>) ?? {};
    const bw = userRes.data?.bodyweight_kg ?? 75;

    const exercises = exRes.data ?? [];
    const exMap = new Map(exercises.map((e) => [e.id, e]));

    const logs: LogEntry[] = [];
    const customExercises: CustomExercise[] = exercises
      .filter((e) => e.owner_id === userId && !e.is_preset)
      .map((e) => ({ n: e.name, g: e.muscle_group, t: e.description ?? '', start: e.default_kg ?? 0 }));

    for (const w of workoutsRes.data ?? []) {
      const wlogs = (w as { workout_logs: Array<{ id: string; exercise_id: string; kg: number; reps: number; sets: number }> }).workout_logs ?? [];
      for (const l of wlogs) {
        const ex = exMap.get(l.exercise_id);
        if (!ex) continue;
        logs.push({ id: l.id, date: w.date, ex: ex.name, kg: l.kg ?? 0, reps: l.reps ?? 0, sets: l.sets ?? 1 });
      }
    }

    return {
      ...DEFAULT_STATE,
      ...settings,
      bw,
      strength: {
        ...EMPTY_BUCKET,
        ...(settings.strength ?? {}),
        logs,
        custom: customExercises,
      },
      endurance: { ...EMPTY_BUCKET, ...(settings.endurance ?? {}) },
    };
  }

  async saveSettings(userId: string, state: WeaponState): Promise<void> {
    const settings: Record<string, unknown> = {
      mode: state.mode,
      profile: state.profile,
      goals: state.goals,
      theme: state.theme,
      logo: state.logo,
      dev: state.dev,
      strength: { removed: state.strength.removed, order: state.strength.order, seenLevel: state.strength.seenLevel },
      endurance: { removed: state.endurance.removed, order: state.endurance.order, seenLevel: state.endurance.seenLevel },
    };

    const { error } = await getSupabase()
      .from('app_users')
      .update({ settings, bodyweight_kg: state.bw })
      .eq('id', userId);
    if (error) throw error;
  }

  async addLog(userId: string, log: LogEntry, mode: 'strength' | 'endurance'): Promise<void> {
    const sb = getSupabase();

    const exerciseId = await this.resolveExerciseId(userId, log.ex);

    const { data: workout, error: wErr } = await sb
      .from('workouts')
      .upsert({ user_id: userId, date: log.date, mode }, { onConflict: 'user_id,date,mode' })
      .select('id')
      .single();
    if (wErr) throw wErr;

    const { error: lErr } = await sb.from('workout_logs').insert({
      id: log.id,
      workout_id: workout.id,
      user_id: userId,
      exercise_id: exerciseId,
      kg: log.kg,
      reps: log.reps,
      sets: log.sets,
    });
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
    });
    if (error) throw error;
  }

  private async resolveExerciseId(userId: string, exName: string): Promise<string> {
    const sb = getSupabase();
    const { data } = await sb
      .from('exercises')
      .select('id')
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .ilike('name', exName)
      .limit(1)
      .single();
    if (data) return data.id;

    const { data: created, error } = await sb.from('exercises')
      .insert({ owner_id: userId, name: exName, muscle_group: 'Other', is_preset: false })
      .select('id')
      .single();
    if (error) throw error;
    return created!.id;
  }
}
