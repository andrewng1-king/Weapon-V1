import type { LogEntry } from './types';

export function logVolume(l: LogEntry): number {
  const metric = l.metric ?? 'weight';
  const sets = l.sets || 1;
  if (metric === 'weight') return (l.kg ?? l.v1 ?? 0) * (l.reps ?? 0) * sets;
  return (l.v1 ?? 0) * sets;
}

export function logXP(l: LogEntry): number {
  const metric = l.metric ?? 'weight';
  const sets = l.sets || 1;
  if (metric === 'weight') {
    return Math.round(((l.kg ?? 0) * (l.reps ?? 0) * sets) / 30) + sets;
  }
  if (metric === 'dist') return Math.round((l.v1 ?? 0) * 2) + sets;
  if (metric === 'reps') return Math.round((l.v1 ?? 0) / 3) + sets;
  if (metric === 'hold') return Math.round((l.v1 ?? 0) / 10) + sets;
  if (metric === 'time') return Math.round((l.v1 ?? 0) * 3) + sets;
  if (metric === 'rounds') return Math.round((l.v1 ?? 0) * 5 + (l.v2 ?? 0)) + sets;
  return sets;
}

export const MAXLVL = 21;

export const STR_RANKS = [
  'Recruit', 'Lifter', 'Trainee', 'Grinder', 'Builder', 'Strongman',
  'Ironbound', 'Powerhouse', 'Vanguard', 'Veteran', 'Elite', 'Titan',
  'Juggernaut', 'Colossus', 'Behemoth', 'Leviathan', 'Mythic',
  'Ascendant', 'Legend', 'Warlord', 'Immortal',
];

export const END_AXES = ['Speed', 'Endurance', 'Explosiveness', 'Power', 'Pace', 'Distance'];

export function totalXP(logs: LogEntry[]): number {
  return logs.reduce((a, l) => a + logXP(l), 0);
}

export function levelInfo(logs: LogEntry[]): import('./types').LevelInfo {
  const xp = totalXP(logs);
  let lvl = 1, need = 120, acc = 0;
  while (lvl < MAXLVL && xp >= acc + need) {
    acc += need;
    lvl++;
    need = Math.round(need * 1.32);
  }
  const into = xp - acc;
  return {
    xp,
    lvl,
    into,
    need: lvl < MAXLVL ? need : 0,
    pct: lvl < MAXLVL ? Math.max(0, Math.min(1, into / need)) : 1,
  };
}

export function rankFor(lvl: number): import('./types').RankInfo {
  const i = Math.min(lvl, MAXLVL) - 1;
  return { name: STR_RANKS[i], next: lvl < MAXLVL ? STR_RANKS[lvl] : null, nextLvl: lvl + 1 };
}

export function xpToReach(L: number): number {
  let need = 120, acc = 0;
  for (let i = 1; i < L; i++) { acc += need; need = Math.round(need * 1.32); }
  return acc;
}

export function e1rm(kg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30));
}

export function allSportLogs(state: import('./types').WeaponState): LogEntry[] {
  return Object.values(state.sports).flatMap((b) => b.logs);
}
