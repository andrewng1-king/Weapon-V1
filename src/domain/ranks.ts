import type { LogEntry, LevelInfo, RankInfo } from './types';

export const MAXLVL = 21;

export const STR_RANKS = [
  'Recruit', 'Lifter', 'Trainee', 'Grinder', 'Builder', 'Strongman',
  'Ironbound', 'Powerhouse', 'Vanguard', 'Veteran', 'Elite', 'Titan',
  'Juggernaut', 'Colossus', 'Behemoth', 'Leviathan', 'Mythic',
  'Ascendant', 'Legend', 'Warlord', 'Immortal',
];

export const END_AXES = ['Speed', 'Endurance', 'Explosiveness', 'Power', 'Pace', 'Distance'];

export function logXP(l: LogEntry): number {
  return Math.round((l.kg || 0) * (l.reps || 0) * (l.sets || 1) / 30) + (l.sets || 1);
}

export function totalXP(logs: LogEntry[]): number {
  return logs.reduce((a, l) => a + logXP(l), 0);
}

export function levelInfo(logs: LogEntry[]): LevelInfo {
  const xp = totalXP(logs);
  let lvl = 1, need = 120, acc = 0;
  while (lvl < MAXLVL && xp >= acc + need) {
    acc += need;
    lvl++;
    need = Math.round(need * 1.32);
  }
  const into = xp - acc;
  return { xp, lvl, into, need: lvl < MAXLVL ? need : 0, pct: lvl < MAXLVL ? Math.max(0, Math.min(1, into / need)) : 1 };
}

export function rankFor(lvl: number): RankInfo {
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
