import type { LogEntry, AvatarStats, Achievement, SportId } from './types';
import { catsFor, groupOf } from './catalogue';

export function calForVals(kg: number, reps: number, sets: number, bw: number): number {
  kg = +kg || 0;
  reps = +reps || 0;
  sets = +sets || 1;
  bw = bw || 75;
  const durMin = sets * (reps * 3 + 45) / 60;
  const met = 3.5 + 2.5 * Math.min(1, bw > 0 ? kg / bw : 0);
  return Math.round(met * 3.5 * bw / 200 * durMin);
}

/** Calories for a single log, branching on its metric (weight/dist/hold/reps). */
export function calForLog(l: LogEntry, bw: number): number {
  if (!l.m || l.m === 'weight') return calForVals(l.kg, l.reps, l.sets || 1, bw);
  bw = bw || 75;
  const v1 = l.v1 || 0;
  const v2 = l.v2 || 0;
  const sets = l.sets || 1;
  switch (l.m) {
    case 'dist': {
      const km = l.u1 === 'm' ? v1 / 1000 : v1;
      const elev = l.u2 && /↑/.test(l.u2) ? v2 : 0;
      return Math.round(km * bw * 0.95 + elev * bw * 0.0085);
    }
    case 'hold':
      return Math.round(v1 * sets * 0.15);
    case 'reps':
    default:
      return Math.round(v1 * sets * 0.45);
  }
}

/** Primary numeric value of a log for its metric (kg for weight, else v1). */
export function primaryVal(l: LogEntry): number {
  return !l.m || l.m === 'weight' ? l.kg || 0 : l.v1 || 0;
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
  return (log.kg || 0) * (log.reps || 0) * (log.sets || 1);
}

export function setsByGroup(logs: LogEntry[], sport: SportId): Record<string, number> {
  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    const g = groupOf(sport, l.ex) || 'Other';
    counts[g] = (counts[g] || 0) + (l.sets || 1);
  });
  return counts;
}

export function avStats(logs: LogEntry[], sport: SportId, devLvl?: number): AvatarStats {
  let vol = 0, maxSet = 0;
  const groups: Record<string, boolean> = {};
  const days: Record<string, boolean> = {};

  logs.forEach((l) => {
    vol += (l.kg || 0) * (l.reps || 0) * (l.sets || 1);
    if ((l.kg || 0) > maxSet) maxSet = l.kg || 0;
    const g = groupOf(sport, l.ex);
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
    { nm: 'First set', ic: '<path d="M5 12l4 4L19 6"/>', got: st.logs >= 1, p: Math.min(1, st.logs / 1) },
    { nm: '10 sessions', ic: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/>', got: st.sessions >= 10, p: Math.min(1, st.sessions / 10) },
    { nm: '100k volume', ic: '<path d="M4 19V5M4 19h16M8 19v-6M12 19v-9M16 19v-4"/>', got: st.vol >= 100000, p: Math.min(1, st.vol / 100000) },
    { nm: '100kg set', ic: '<path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13"/>', got: st.maxSet >= 100, p: Math.min(1, st.maxSet / 100) },
    { nm: 'All-rounder', ic: '<path d="M12 2l2.6 5.6 6.1.9-4.4 4.3 1 6.1L12 20l-5.5 2.9 1-6.1L3.1 8.5l6.1-.9z"/>', got: st.groupsHit >= 6, p: Math.min(1, st.groupsHit / 6) },
    { nm: '7-day streak', ic: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', got: st.streak >= 7, p: Math.min(1, st.streak / 7) },
    { nm: 'Level 10', ic: '<path d="M12 2.5l8 4.6v9.2L12 21l-8-4.7V7.1z"/>', got: st.lvl >= 10, p: Math.min(1, st.lvl / 10) },
    { nm: 'Triple plate', ic: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.6"/>', got: st.maxSet >= 140, p: Math.min(1, st.maxSet / 140) },
  ];
}

export function groupCounts(logs: LogEntry[], sport: SportId): Record<string, number> {
  const counts: Record<string, number> = {};
  catsFor(sport).forEach((g) => (counts[g] = 0));
  logs.forEach((l) => {
    const g = groupOf(sport, l.ex);
    if (g && counts[g] != null) counts[g] += l.sets || 1;
  });
  return counts;
}
