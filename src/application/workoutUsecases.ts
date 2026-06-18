import type { WorkoutRepository } from './ports';
import type { LogEntry, CustomExercise, PresetExercise, WeaponState, SportId } from '@/domain/types';
import { uid, todayStr } from '@/domain/format';
import { exMetric, sportDef, exU1, exU2 } from '@/domain/sports';

export function createLogEntry(
  ex: PresetExercise | CustomExercise,
  vals: { kg?: number; reps?: number; v1?: number; v2?: number },
  sport: SportId,
  sets: number,
  meta?: { set_type?: LogEntry['set_type']; rpe?: number; note?: string }
): LogEntry {
  const metric = exMetric(ex, sport);
  const entry: LogEntry = {
    id: uid(),
    date: todayStr(),
    ex: ex.n,
    sets,
    metric,
    set_type: meta?.set_type ?? 'work',
    rpe: meta?.rpe,
    note: meta?.note,
    u1: exU1(ex, sport),
    u2: exU2(ex, sport),
  };
  if (metric === 'weight') {
    entry.kg = vals.kg ?? ex.start;
    entry.reps = vals.reps ?? 8;
    entry.v1 = entry.kg;
  } else {
    entry.v1 = vals.v1 ?? ex.start;
    entry.v2 = vals.v2;
  }
  return entry;
}

export async function logSet(
  repo: WorkoutRepository,
  userId: string,
  state: WeaponState,
  log: LogEntry
): Promise<void> {
  await repo.addLog(userId, log, state.sport);
}

export function isLoggedToday(bucket: WeaponState['sports'][SportId], exName: string): boolean {
  const today = todayStr();
  return bucket.logs.some((l) => l.ex === exName && l.date === today);
}

export function toggleTodayLog(bucket: WeaponState['sports'][SportId], exName: string): { action: 'log' | 'unlog'; logId?: string } {
  const today = todayStr();
  const existing = bucket.logs.find((l) => l.ex === exName && l.date === today);
  if (existing) return { action: 'unlog', logId: existing.id };
  return { action: 'log' };
}

export async function deleteLog(repo: WorkoutRepository, userId: string, logId: string): Promise<void> {
  await repo.deleteLog(userId, logId);
}

export async function addCustomExercise(
  repo: WorkoutRepository,
  userId: string,
  sport: SportId,
  ex: CustomExercise
): Promise<void> {
  await repo.addCustomExercise(userId, sport, ex);
}

export function removeExercise(state: WeaponState, exName: string): WeaponState {
  const bucket = state.sports[state.sport];
  return {
    ...state,
    sports: {
      ...state.sports,
      [state.sport]: {
        ...bucket,
        removed: [...bucket.removed, exName],
      },
    },
  };
}

export function setOrder(state: WeaponState, group: string, order: string[]): WeaponState {
  const bucket = state.sports[state.sport];
  return {
    ...state,
    sports: {
      ...state.sports,
      [state.sport]: {
        ...bucket,
        order: { ...bucket.order, [group]: order },
      },
    },
  };
}

export function bestE1RM(logs: LogEntry[], exName: string): number {
  let best = 0;
  for (const l of logs) {
    if (l.ex !== exName || l.set_type === 'warm') continue;
    const kg = l.kg ?? l.v1 ?? 0;
    const reps = l.reps ?? 0;
    if (reps <= 0) continue;
    const e = kg * (1 + reps / 30);
    if (e > best) best = e;
  }
  return Math.round(best);
}
