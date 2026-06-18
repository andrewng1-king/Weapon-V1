import type { WorkoutRepository } from './ports';
import type { LogEntry, CustomExercise, WeaponState, Bucket, Group } from '@/domain/types';
import { uid, todayStr } from '@/domain/format';

export function createLogEntry(kg: number, reps: number, ex: string): LogEntry {
  return { id: uid(), date: todayStr(), ex, kg, reps, sets: 3 };
}

export async function logSet(
  repo: WorkoutRepository,
  userId: string,
  state: WeaponState,
  log: LogEntry
): Promise<void> {
  await repo.addLog(userId, log, state.mode);
}

export function isLoggedToday(bucket: Bucket, exName: string): boolean {
  const today = todayStr();
  return bucket.logs.some((l) => l.ex === exName && l.date === today);
}

export function toggleTodayLog(bucket: Bucket, exName: string): { action: 'log' | 'unlog'; logId?: string } {
  const today = todayStr();
  const existing = bucket.logs.find((l) => l.ex === exName && l.date === today);
  if (existing) return { action: 'unlog', logId: existing.id };
  return { action: 'log' };
}

export async function deleteLog(
  repo: WorkoutRepository,
  userId: string,
  logId: string
): Promise<void> {
  await repo.deleteLog(userId, logId);
}

export async function addCustomExercise(
  repo: WorkoutRepository,
  userId: string,
  ex: CustomExercise
): Promise<void> {
  await repo.addCustomExercise(userId, ex);
}

export function removeExercise(state: WeaponState, exName: string): WeaponState {
  const bucket = state[state.mode];
  return {
    ...state,
    [state.mode]: {
      ...bucket,
      removed: [...bucket.removed, exName],
    },
  };
}

export function setOrder(state: WeaponState, group: Group, order: string[]): WeaponState {
  const bucket = state[state.mode];
  return {
    ...state,
    [state.mode]: {
      ...bucket,
      order: { ...bucket.order, [group]: order },
    },
  };
}
