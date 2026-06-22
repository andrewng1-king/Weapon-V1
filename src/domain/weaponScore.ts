import type { WeaponState, SportId } from './types';
import { e1rm } from './ranks';

/**
 * Bodyweight ratio targets for the strength half of the Weapon Score.
 * Ported 1:1 from `_legacy/index.html` `WS_STR`.
 */
export const WS_STR: Record<string, number> = {
  Squat: 2.0,
  'Bench Press': 1.5,
  Deadlift: 2.5,
  'Overhead Press': 1.0,
  'Barbell Row': 1.4,
  'Leg Press': 3.0,
};

export interface WeaponScorePart {
  name: string;
  score: number;
  detail: string;
}

export interface WeaponScoreResult {
  total: number;
  strength: number | null;
  engine: number | null;
  parts: WeaponScorePart[];
  note: string;
}

function bestE1RMof(state: WeaponState, lift: string): number {
  const logs = state.sports.gym?.logs ?? [];
  let best = 0;
  for (const l of logs) {
    if (l.ex === lift) {
      const v = e1rm(l.kg ?? 0, l.reps ?? 0);
      if (v > best) best = v;
    }
  }
  return best;
}

function fmtPace(p: number): string {
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function wsStrengthParts(state: WeaponState): WeaponScorePart[] {
  const bw = state.bw || 75;
  const out: WeaponScorePart[] = [];
  for (const lift of Object.keys(WS_STR)) {
    const best = bestE1RMof(state, lift);
    if (best > 0) {
      const ratio = best / bw;
      const score = clampScore((ratio / WS_STR[lift]) * 100);
      out.push({
        name: lift,
        score,
        detail: `${Math.round(best)} kg e1RM · ${ratio.toFixed(2)}×BW`,
      });
    }
  }
  return out;
}

export function wsEngineParts(state: WeaponState): WeaponScorePart[] {
  const out: WeaponScorePart[] = [];

  let bestPace: number | null = null;
  for (const id of ['run', 'trail'] as const) {
    const bucket = state.sports[id];
    if (!bucket) continue;
    for (const l of bucket.logs) {
      const km = l.v1 ?? 0;
      const min = l.v2 ?? 0;
      if (km >= 1 && min > 0) {
        const p = min / km;
        if (bestPace == null || p < bestPace) bestPace = p;
      }
    }
  }
  if (bestPace != null) {
    const score = clampScore(((7.5 - bestPace) / (7.5 - 3.0)) * 100);
    out.push({ name: 'Best run pace', score, detail: `${fmtPace(bestPace)} /km` });
  }

  const since = Date.now() - 28 * 864e5;
  const engineSports: Array<readonly [SportId, number]> = [
    ['run', 1],
    ['trail', 1],
    ['swimming', 0.001],
    ['hyrox', 0.001],
  ];
  let km = 0;
  for (const [id, mult] of engineSports) {
    const bucket = state.sports[id];
    if (!bucket) continue;
    for (const l of bucket.logs) {
      const t = new Date(l.date).getTime();
      if (!Number.isNaN(t) && t >= since) km += (l.v1 ?? 0) * mult;
    }
  }
  if (km > 0) {
    const score = clampScore((km / 40) * 100);
    out.push({ name: '28-day engine volume', score, detail: `${km.toFixed(1)} km` });
  }

  return out;
}

/**
 * Cross-modal Weapon Score (strength × engine), 0–100.
 * Ported 1:1 from `_legacy/index.html` `weaponScore()`.
 */
export function weaponScore(state: WeaponState): WeaponScoreResult {
  const sp = wsStrengthParts(state);
  const ep = wsEngineParts(state);
  const strength = sp.length
    ? Math.round(sp.reduce((a, p) => a + p.score, 0) / sp.length)
    : null;
  const engine = ep.length
    ? Math.round(ep.reduce((a, p) => a + p.score, 0) / ep.length)
    : null;

  let total: number;
  let note = '';
  if (strength != null && engine != null) {
    total = Math.round((strength + engine) / 2);
  } else if (strength != null) {
    total = Math.round(strength * 0.65);
    note = 'Add running (or Strava) to unlock the engine half.';
  } else if (engine != null) {
    total = Math.round(engine * 0.65);
    note = 'Log barbell lifts to unlock the strength half.';
  } else {
    total = 0;
    note = 'Log a few lifts and runs to generate your score.';
  }

  return { total, strength, engine, parts: [...sp, ...ep], note };
}
