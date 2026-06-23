import type { PresetExercise, CustomExercise, Group, GymGroup, SportId, Metric, Bucket } from './types';

export const SPORT_IDS: SportId[] = ['gym', 'run', 'calisthenics', 'hyrox'];

export const GROUP_COLORS: Record<GymGroup, string> = {
  Chest: '#e8ff00',
  Back: '#9bbf8f',
  Shoulders: '#5b9bff',
  Arms: '#c08a6a',
  Legs: '#b06ae0',
  Core: '#cfc9cd',
};

const CAT_PALETTE = ['#e8ff00', '#3ddc97', '#5b9bff', '#e0603a', '#b06ae0', '#cfc9cd', '#6ad0c8', '#e0b76a'];

export const SP_ICON: Record<SportId, string> = {
  gym: '<path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13"/>',
  run: '<circle cx="13" cy="4.5" r="2"/><path d="M6 21l3.5-6 3-2.5 1.5 4 3 3M9.5 12.5 8 8l5-1.5 3 3 3 .5"/>',
  calisthenics: '<circle cx="12" cy="4.5" r="2"/><path d="M5 8h14M12 6.5V14m0 0-4 7m4-7 4 7"/>',
  hyrox: '<path d="M3 7h4l2 10 3-14 3 14 2-10h4"/>',
};

// ── Gym muscle-group presets ─────────────────────────────────────────
export const PRESETS: Record<GymGroup, PresetExercise[]> = {
  Chest: [
    { n: 'Bench Press', t: 'Mid chest · front delts · triceps', start: 40 },
    { n: 'Incline Press', t: 'Upper chest · front delts', start: 30 },
    { n: 'Decline Press', t: 'Lower chest', start: 30 },
    { n: 'Dumbbell Press', t: 'Mid chest — free range', start: 20 },
    { n: 'Incline Dumbbell Press', t: 'Upper chest — free range', start: 16 },
    { n: 'Dip', t: 'Lower chest · triceps', start: 0 },
    { n: 'Cable Fly', t: 'Inner & mid chest', start: 12.5 },
    { n: 'Incline Cable Fly', t: 'Upper chest stretch', start: 10 },
    { n: 'Pec Deck', t: 'Inner chest — isolation', start: 25 },
    { n: 'Push-up', t: 'Chest · core — bodyweight', start: 0 },
  ],
  Back: [
    { n: 'Pull-up', t: 'Lats · upper back', start: 0 },
    { n: 'Chin-up', t: 'Lats · biceps', start: 0 },
    { n: 'Lat Pulldown', t: 'Lats — back width', start: 40 },
    { n: 'Close-grip Pulldown', t: 'Lower lats', start: 40 },
    { n: 'Barbell Row', t: 'Mid back · lats — thickness', start: 40 },
    { n: 'Pendlay Row', t: 'Explosive mid back', start: 40 },
    { n: 'Dumbbell Row', t: 'Lats — unilateral', start: 22 },
    { n: 'Seated Cable Row', t: 'Mid back · rhomboids', start: 40 },
    { n: 'T-Bar Row', t: 'Mid back thickness', start: 30 },
    { n: 'Deadlift', t: 'Lower back · glutes · hamstrings', start: 60 },
    { n: 'Straight-arm Pulldown', t: 'Lats — isolation', start: 20 },
  ],
  Shoulders: [
    { n: 'Overhead Press', t: 'Front & side delts · triceps', start: 30 },
    { n: 'Seated Dumbbell Press', t: 'Front & side delts', start: 16 },
    { n: 'Arnold Press', t: 'All three delt heads', start: 12 },
    { n: 'Lateral Raise', t: 'Side delts — width', start: 8 },
    { n: 'Cable Lateral Raise', t: 'Side delts — constant tension', start: 7 },
    { n: 'Rear Delt Fly', t: 'Rear delts · upper back', start: 8 },
    { n: 'Face Pull', t: 'Rear delts · traps — posture', start: 15 },
    { n: 'Front Raise', t: 'Front delts — isolation', start: 8 },
    { n: 'Upright Row', t: 'Side delts · traps', start: 25 },
    { n: 'Shrug', t: 'Upper traps', start: 40 },
  ],
  Arms: [
    { n: 'Barbell Curl', t: 'Biceps — overall mass', start: 20 },
    { n: 'Dumbbell Curl', t: 'Biceps — unilateral', start: 10 },
    { n: 'Hammer Curl', t: 'Biceps · brachialis', start: 10 },
    { n: 'Preacher Curl', t: 'Biceps — strict isolation', start: 15 },
    { n: 'Incline Dumbbell Curl', t: 'Biceps — long head stretch', start: 8 },
    { n: 'Cable Curl', t: 'Biceps — constant tension', start: 15 },
    { n: 'Concentration Curl', t: 'Biceps peak', start: 8 },
    { n: 'Tricep Pushdown', t: 'Triceps — lateral head', start: 20 },
    { n: 'Rope Pushdown', t: 'Triceps — all heads', start: 18 },
    { n: 'Skull Crusher', t: 'Triceps — long head', start: 20 },
    { n: 'Overhead Tricep Extension', t: 'Triceps — long head stretch', start: 15 },
    { n: 'Close-grip Bench Press', t: 'Triceps · chest', start: 35 },
    { n: 'Wrist Curl', t: 'Forearms — flexors', start: 10 },
  ],
  Legs: [
    { n: 'Squat', t: 'Quads · glutes', start: 50 },
    { n: 'Front Squat', t: 'Quads — upright', start: 40 },
    { n: 'Hack Squat', t: 'Quads — machine', start: 60 },
    { n: 'Leg Press', t: 'Quads · glutes', start: 80 },
    { n: 'Leg Extension', t: 'Quads — isolation', start: 30 },
    { n: 'Bulgarian Split Squat', t: 'Quads · glutes — unilateral', start: 16 },
    { n: 'Walking Lunge', t: 'Quads · glutes', start: 16 },
    { n: 'Romanian Deadlift', t: 'Hamstrings · glutes', start: 50 },
    { n: 'Leg Curl', t: 'Hamstrings — isolation', start: 30 },
    { n: 'Hip Thrust', t: 'Glutes', start: 60 },
    { n: 'Glute Kickback', t: 'Glutes — isolation', start: 15 },
    { n: 'Calf Raise', t: 'Calves', start: 40 },
    { n: 'Seated Calf Raise', t: 'Soleus — lower calf', start: 30 },
  ],
  Core: [
    { n: 'Cable Crunch', t: 'Abs — weighted', start: 25 },
    { n: 'Hanging Leg Raise', t: 'Lower abs · hip flexors', start: 0 },
    { n: 'Russian Twist', t: 'Obliques — rotation', start: 5 },
    { n: 'Plank', t: 'Whole core — reps = seconds', start: 0 },
    { n: 'Ab Wheel Rollout', t: 'Whole core — anti-extension', start: 0 },
    { n: 'Decline Sit-up', t: 'Upper abs — weighted', start: 5 },
    { n: 'Side Plank', t: 'Obliques — reps = seconds', start: 0 },
    { n: 'Mountain Climber', t: 'Core · cardio', start: 0 },
    { n: 'Leg Raise', t: 'Lower abs — floor', start: 0 },
  ],
};

export interface SportGoal {
  kind: 'cal' | 'dist' | 'sessions';
  label: string;
  unit: string;
  def: number;
}

export interface SportDef {
  name: string;
  metric: Metric;
  u1?: string;
  u2?: string;
  v2kind?: string;
  goal: SportGoal;
  cats: Record<string, PresetExercise[]>;
  colors?: Record<string, string>;
}

export const SPORTS: Record<SportId, SportDef> = {
  gym: {
    name: 'Gym', metric: 'weight', u1: 'kg', u2: 'reps', colors: GROUP_COLORS,
    goal: { kind: 'cal', label: 'Weekly calories', unit: 'kcal', def: 3000 },
    cats: PRESETS as unknown as Record<string, PresetExercise[]>,
  },
  run: {
    name: 'Run', metric: 'dist', u1: 'km', u2: 'min', v2kind: 'time',
    goal: { kind: 'dist', label: 'Weekly distance', unit: 'km', def: 20 },
    cats: {
      Easy: [
        { n: 'Easy run', t: 'Conversational pace', start: 5 },
        { n: 'Recovery run', t: 'Very easy — flush the legs', start: 4 },
        { n: 'Base run', t: 'Steady aerobic effort', start: 8 },
      ],
      Tempo: [
        { n: 'Tempo run', t: 'Comfortably hard · 85–90% HR', start: 6 },
        { n: 'Threshold run', t: 'At lactate threshold', start: 5 },
        { n: 'Progression run', t: 'Finish faster than you start', start: 8 },
      ],
      Intervals: [
        { n: '400m repeats', t: 'Speed · VO₂max', start: 3 },
        { n: '800m repeats', t: 'VO₂max', start: 4 },
        { n: '1km repeats', t: 'Threshold / VO₂', start: 5 },
        { n: 'Fartlek', t: 'Unstructured speed play', start: 6 },
      ],
      Long: [
        { n: 'Long run', t: 'Build endurance', start: 16 },
        { n: 'Marathon-pace run', t: 'Race-pace blocks', start: 14 },
      ],
      Speed: [
        { n: 'Strides', t: '20–30s relaxed sprints', start: 1 },
        { n: 'Hill sprints', t: '10–30s max effort', start: 1 },
        { n: 'Track 200m', t: 'Sharpen turnover', start: 2 },
      ],
    },
  },
  calisthenics: {
    name: 'Calisthenics', metric: 'reps', u1: 'reps',
    goal: { kind: 'sessions', label: 'Weekly sessions', unit: 'days', def: 4 },
    cats: {
      Push: [
        { n: 'Push-up', t: 'Chest · triceps', start: 15 },
        { n: 'Diamond push-up', t: 'Triceps', start: 10 },
        { n: 'Wide push-up', t: 'Chest', start: 12 },
        { n: 'Dip', t: 'Lower chest · triceps', start: 8 },
        { n: 'Bench dip', t: 'Triceps', start: 12 },
        { n: 'Pike push-up', t: 'Shoulders — HSPU progression', start: 8 },
        { n: 'Pseudo-planche push-up', t: 'Planche lean', start: 6 },
        { n: 'Handstand push-up', t: 'Vertical press', start: 3 },
      ],
      Pull: [
        { n: 'Pull-up', t: 'Lats · upper back', start: 8 },
        { n: 'Chin-up', t: 'Lats · biceps', start: 8 },
        { n: 'Australian row', t: 'Horizontal pull', start: 12 },
        { n: 'Inverted row', t: 'Horizontal pull', start: 12 },
        { n: 'Towel row', t: 'Grip · back', start: 10 },
        { n: 'Archer pull-up', t: 'Unilateral strength', start: 4 },
        { n: 'Muscle-up', t: 'Pull + transition + dip', start: 2 },
      ],
      Skills: [
        { n: 'Tuck planche', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 8 },
        { n: 'Straddle planche', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 5 },
        { n: 'Tuck front lever', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 8 },
        { n: 'Front lever', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 5 },
        { n: 'Back lever', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 6 },
        { n: 'Handstand', t: 'Free balance — seconds', m: 'hold', u1: 'sec', start: 10 },
      ],
      Core: [
        { n: 'Hanging leg raise', t: 'Lower abs', start: 10 },
        { n: 'Toes-to-bar', t: 'Full core', start: 8 },
        { n: 'L-sit', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 10 },
        { n: 'Hollow hold', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 20 },
        { n: 'Plank', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 45 },
        { n: 'Crunch', t: 'Upper abs', start: 20 },
        { n: 'Leg raise', t: 'Lower abs', start: 15 },
        { n: 'Mountain climber', t: 'Core · cardio', start: 30 },
        { n: 'Russian twist', t: 'Obliques', start: 30 },
        { n: 'Dragon flag', t: 'Anti-extension', start: 5 },
      ],
      Legs: [
        { n: 'Pistol squat', t: 'Single-leg strength', start: 6 },
        { n: 'Shrimp squat', t: 'Single-leg + balance', start: 5 },
        { n: 'Sissy squat', t: 'Quads', start: 10 },
        { n: 'Bodyweight squat', t: 'Quads · glutes', start: 20 },
        { n: 'Lunge', t: 'Quads · glutes', start: 16 },
        { n: 'Bulgarian split squat', t: 'Single-leg', start: 12 },
        { n: 'Glute bridge', t: 'Glutes · hamstrings', start: 18 },
        { n: 'Calf raise', t: 'Calves', start: 25 },
        { n: 'Wall sit', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 45 },
        { n: 'Nordic curl', t: 'Hamstrings', start: 5 },
      ],
    },
  },
  hyrox: {
    name: 'HYROX', metric: 'reps',
    goal: { kind: 'sessions', label: 'Weekly sessions', unit: 'days', def: 3 },
    cats: {
      Run: [{ n: '1 km run', t: 'Between every station', m: 'dist', u1: 'km', u2: 'min', start: 1 }],
      Erg: [
        { n: 'SkiErg', t: '1000m', m: 'dist', u1: 'm', u2: 'min', start: 1000 },
        { n: 'Row', t: '1000m', m: 'dist', u1: 'm', u2: 'min', start: 1000 },
      ],
      Sled: [
        { n: 'Sled push', t: '4×12.5m', m: 'dist', u1: 'm', start: 50 },
        { n: 'Sled pull', t: '4×12.5m', m: 'dist', u1: 'm', start: 50 },
      ],
      Carry: [
        { n: 'Farmers carry', t: '200m', m: 'dist', u1: 'm', start: 200 },
        { n: 'Sandbag lunges', t: '100m', m: 'dist', u1: 'm', start: 100 },
      ],
      Functional: [
        { n: 'Burpee broad jumps', t: '80m', m: 'dist', u1: 'm', start: 80 },
        { n: 'Wall balls', t: '100 reps', m: 'reps', u1: 'reps', start: 100 },
      ],
    },
  },
};

export function sportDef(sport: SportId): SportDef {
  return SPORTS[sport] || SPORTS.gym;
}

export function catsFor(sport: SportId): string[] {
  return Object.keys(sportDef(sport).cats);
}

export function exMetric(sport: SportId, ex?: { m?: Metric }): Metric {
  return (ex && ex.m) || sportDef(sport).metric || 'weight';
}

export function exU1(sport: SportId, ex?: { u1?: string }): string {
  return (ex && ex.u1) || sportDef(sport).u1 || '';
}

export function exU2(sport: SportId, ex?: { u2?: string }): string | null {
  if (ex && 'u2' in ex) return ex.u2 ?? null;
  return sportDef(sport).u2 || null;
}

export function v2kind(sport: SportId): string {
  return sportDef(sport).v2kind || 'time';
}

export function step1For(sport: SportId, ex?: { m?: Metric; u1?: string }): number {
  const m = exMetric(sport, ex);
  if (m === 'weight') return 2.5;
  if (m === 'dist') return exU1(sport, ex) === 'm' ? 50 : 0.5;
  if (m === 'hold') return 5;
  return 1;
}

export function step2For(sport: SportId, ex?: { m?: Metric }): number {
  if (exMetric(sport, ex) === 'weight') return 1;
  return v2kind(sport) === 'elev' ? 50 : 1;
}

export function catColor(sport: SportId, cat: string): string {
  const d = sportDef(sport);
  if (d.colors && d.colors[cat]) return d.colors[cat];
  const i = catsFor(sport).indexOf(cat);
  return CAT_PALETTE[(i < 0 ? 0 : i) % CAT_PALETTE.length];
}

export function exercisesFor(sport: SportId, group: Group, bucket: Bucket): PresetExercise[] {
  const lib = sportDef(sport).cats;
  if (!lib[group]) return [];
  const list: PresetExercise[] = lib[group]
    .filter((e) => !bucket.removed.includes(e.n))
    .concat(
      bucket.custom
        .filter((c: CustomExercise) => c.g === group)
        .map((c: CustomExercise) => ({ n: c.n, t: c.t, start: c.start, m: c.m, u1: c.u1, u2: c.u2, custom: true }))
    );
  const ord = bucket.order?.[group] || [];
  if (ord.length) {
    const ix = (n: string) => {
      const i = ord.indexOf(n);
      return i < 0 ? 9999 : i;
    };
    list.sort((a, b) => ix(a.n) - ix(b.n));
  }
  return list;
}

export function groupOf(sport: SportId, exName: string): Group | null {
  const lib = sportDef(sport).cats;
  for (const g of catsFor(sport)) {
    if (lib[g].some((e) => e.n === exName)) return g;
  }
  return null;
}

export function findEx(sport: SportId, name: string): PresetExercise | undefined {
  const lib = sportDef(sport).cats;
  for (const g of catsFor(sport)) {
    const found = lib[g].find((e) => e.n === name);
    if (found) return found;
  }
  return undefined;
}
