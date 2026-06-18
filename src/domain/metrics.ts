import type { LogEntry, AvatarStats, Achievement, SportId } from './types';
import { groupOfSport, sportDef } from './sports';

export function calForVals(kg: number, reps: number, sets: number, bw: number): number {
  kg = +kg || 0;
  reps = +reps || 0;
  sets = +sets || 1;
  bw = bw || 75;
  const durMin = sets * (reps * 3 + 45) / 60;
  const met = 3.5 + 2.5 * Math.min(1, bw > 0 ? kg / bw : 0);
  return Math.round(met * 3.5 * bw / 200 * durMin);
}

export function weekDates(): string[] {
  const now = new Date();
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
}

export function volume(log: LogEntry): number {
  const metric = log.metric ?? 'weight';
  const sets = log.sets || 1;
  if (metric === 'weight') return (log.kg || 0) * (log.reps || 0) * sets;
  return (log.v1 || 0) * sets;
}

export function setsByGroup(logs: LogEntry[], sport: SportId, custom: import('./types').CustomExercise[]): Record<string, number> {
  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    const g = groupOfSport(sport, l.ex, custom) || 'Other';
    counts[g] = (counts[g] || 0) + (l.sets || 1);
  });
  return counts;
}

export function avStats(logs: LogEntry[], sport: SportId, custom: import('./types').CustomExercise[], devLvl?: number): AvatarStats {
  let vol = 0, maxSet = 0;
  const groups: Record<string, boolean> = {};
  const days: Record<string, boolean> = {};

  logs.forEach((l) => {
    vol += volume(l);
    const metric = l.metric ?? 'weight';
    if (metric === 'weight' && (l.kg || 0) > maxSet) maxSet = l.kg || 0;
    const g = groupOfSport(sport, l.ex, custom);
    if (g) groups[g] = true;
    const d = new Date(l.date);
    if (!isNaN(d.getTime())) days[d.toISOString().slice(0, 10)] = true;
  });

  let streak = 0;
  const dt = new Date();
  const todayKey = dt.toISOString().slice(0, 10);
  for (;;) {
    const key = dt.toISOString().slice(0, 10);
    if (days[key]) {
      streak++;
      dt.setDate(dt.getDate() - 1);
    } else if (streak === 0 && key === todayKey) {
      dt.setDate(dt.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    vol: Math.round(vol),
    maxSet: Math.round(maxSet),
    groupsHit: Object.keys(groups).length,
    sessions: Object.keys(days).length,
    streak,
    lvl: devLvl ?? 1,
    logs: logs.length,
  };
}

export function achList(st: AvatarStats): Achievement[] {
  return [
    { nm: 'First set', ic: '🏋', got: st.logs >= 1, p: Math.min(1, st.logs) },
    { nm: '10 sessions', ic: '📅', got: st.sessions >= 10, p: Math.min(1, st.sessions / 10) },
    { nm: '100k volume', ic: '💪', got: st.vol >= 100000, p: Math.min(1, st.vol / 100000) },
    { nm: '100kg set', ic: '🏆', got: st.maxSet >= 100, p: Math.min(1, st.maxSet / 100) },
    { nm: 'All-rounder', ic: '🎯', got: st.groupsHit >= 6, p: Math.min(1, st.groupsHit / 6) },
    { nm: '7-day streak', ic: '🔥', got: st.streak >= 7, p: Math.min(1, st.streak / 7) },
    { nm: 'Level 10', ic: '⭐', got: st.lvl >= 10, p: Math.min(1, st.lvl / 10) },
    { nm: 'Triple plate', ic: '🥇', got: st.maxSet >= 140, p: Math.min(1, st.maxSet / 140) },
  ];
}

export function groupCounts(logs: LogEntry[], sport: SportId, custom: import('./types').CustomExercise[]): Record<string, number> {
  return setsByGroup(logs, sport, custom);
}

export function weeklyGoalValue(
  sport: SportId,
  logs: LogEntry[],
  bw: number,
  target?: number
): { value: number; target: number; pct: number } {
  const def = sportDef(sport);
  const t = target ?? def.goal.def;
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const weekLogs = logs.filter((l) => l.date >= weekAgo);
  let value = 0;
  switch (def.goal.kind) {
    case 'cal':
      value = weekLogs.reduce((s, l) => {
        if ((l.metric ?? 'weight') === 'weight') {
          return s + calForVals(l.kg ?? 0, l.reps ?? 0, l.sets ?? 1, bw);
        }
        return s + 50;
      }, 0);
      break;
    case 'dist':
      value = weekLogs.reduce((s, l) => s + (l.v1 ?? l.kg ?? 0), 0);
      break;
    case 'dist_m':
      value = weekLogs.reduce((s, l) => s + (l.v1 ?? 0), 0);
      break;
    case 'elev':
      value = weekLogs.reduce((s, l) => s + (l.v2 ?? 0), 0);
      break;
    case 'time':
      value = weekLogs.reduce((s, l) => s + (l.v1 ?? 0), 0);
      break;
    case 'sessions':
      value = new Set(weekLogs.map((l) => l.date)).size;
      break;
  }
  return { value, target: t, pct: t > 0 ? Math.min(1, value / t) : 0 };
}

export function kgDisplay(kg: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? Math.round(kg * 2.20462 * 10) / 10 : kg;
}

export function kgCanonical(display: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? display / 2.20462 : display;
}

export function weightStep(unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? 5 : 2.5;
}

export function platesFor(totalKg: number, barKg: number, unit: 'kg' | 'lb'): number[] {
  const plates = unit === 'lb'
    ? [20.412, 15.876, 11.34, 4.536, 2.268].map((p) => p * 2)
    : [25, 20, 15, 10, 5, 2.5, 1.25];
  const bar = barKg > 0 ? barKg : 20;
  let perSide = (totalKg - bar) / 2;
  if (perSide <= 0) return [];
  const out: number[] = [];
  for (const p of plates) {
    while (perSide >= p - 0.01) {
      out.push(p);
      perSide -= p;
    }
  }
  return out;
}
