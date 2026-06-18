import type { MetricType, PresetExercise, SportId, Bucket, CustomExercise } from './types';

export const GROUP_COLORS: Record<string, string> = {
  Chest: '#c2a878',
  Back: '#9bbf8f',
  Shoulders: '#5b9bff',
  Arms: '#c08a6a',
  Legs: '#b06ae0',
  Core: '#cfc9cd',
};

export const CAT_PALETTE = ['#c2a878', '#9bbf8f', '#5b9bff', '#c08a6a', '#b06ae0', '#cfc9cd', '#6ad0c8', '#e0b76a'];

export const PRESETS: Record<string, PresetExercise[]> = {
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
    { n: 'Plank', t: 'Whole core — reps = seconds', start: 0, m: 'hold', u1: 'sec' },
    { n: 'Ab Wheel Rollout', t: 'Whole core — anti-extension', start: 0 },
    { n: 'Decline Sit-up', t: 'Upper abs — weighted', start: 5 },
    { n: 'Side Plank', t: 'Obliques — reps = seconds', start: 0, m: 'hold', u1: 'sec' },
    { n: 'Mountain Climber', t: 'Core · cardio', start: 0 },
    { n: 'Leg Raise', t: 'Lower abs — floor', start: 0 },
  ],
};

export const GYM_GROUPS = Object.keys(PRESETS);

export interface SportGoalDef {
  kind: 'cal' | 'dist' | 'dist_m' | 'time' | 'elev' | 'sessions';
  label: string;
  unit: string;
  def: number;
}

export interface SportDef {
  name: string;
  metric: MetricType;
  u1: string;
  u2?: string;
  v2kind?: 'time' | 'elev';
  goal: SportGoalDef;
  cats: Record<string, PresetExercise[]>;
  colors?: Record<string, string>;
}

export const SPORTS: Record<SportId, SportDef> = {
  gym: {
    name: 'Gym',
    metric: 'weight',
    u1: 'kg',
    u2: 'reps',
    colors: GROUP_COLORS,
    goal: { kind: 'cal', label: 'Weekly calories', unit: 'kcal', def: 3000 },
    cats: PRESETS,
  },
  run: {
    name: 'Run',
    metric: 'dist',
    u1: 'km',
    u2: 'min',
    v2kind: 'time',
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
    name: 'Calisthenics',
    metric: 'reps',
    u1: 'reps',
    goal: { kind: 'sessions', label: 'Weekly sessions', unit: 'days', def: 4 },
    cats: {
      Push: [
        { n: 'Push-up', t: 'Chest · triceps', start: 15 },
        { n: 'Dip', t: 'Lower chest · triceps', start: 8 },
        { n: 'Pike push-up', t: 'Shoulders — HSPU progression', start: 8 },
        { n: 'Pseudo-planche push-up', t: 'Planche lean', start: 6 },
        { n: 'Handstand push-up', t: 'Vertical press', start: 3 },
      ],
      Pull: [
        { n: 'Pull-up', t: 'Lats · upper back', start: 8 },
        { n: 'Chin-up', t: 'Lats · biceps', start: 8 },
        { n: 'Australian row', t: 'Horizontal pull', start: 12 },
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
        { n: 'Dragon flag', t: 'Anti-extension', start: 5 },
      ],
      Legs: [
        { n: 'Pistol squat', t: 'Single-leg strength', start: 6 },
        { n: 'Shrimp squat', t: 'Single-leg + balance', start: 5 },
        { n: 'Sissy squat', t: 'Quads', start: 10 },
        { n: 'Nordic curl', t: 'Hamstrings', start: 5 },
      ],
    },
  },
  hyrox: {
    name: 'HYROX',
    metric: 'reps',
    u1: 'reps',
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
  swimming: {
    name: 'Swim',
    metric: 'dist',
    u1: 'm',
    u2: 'min',
    v2kind: 'time',
    goal: { kind: 'dist_m', label: 'Weekly distance', unit: 'm', def: 4000 },
    cats: {
      Freestyle: [
        { n: 'Freestyle 50m', t: 'Front crawl — speed', start: 50 },
        { n: 'Freestyle 100m', t: 'Front crawl', start: 100 },
        { n: 'Freestyle 200m', t: 'Aerobic', start: 200 },
        { n: 'Freestyle 400m', t: 'Endurance', start: 400 },
      ],
      Backstroke: [
        { n: 'Backstroke 50m', t: 'On the back', start: 50 },
        { n: 'Backstroke 100m', t: 'Backstroke', start: 100 },
      ],
      Breaststroke: [
        { n: 'Breaststroke 50m', t: 'Technical stroke', start: 50 },
        { n: 'Breaststroke 100m', t: 'Breaststroke', start: 100 },
      ],
      Butterfly: [
        { n: 'Butterfly 25m', t: 'Most demanding stroke', start: 25 },
        { n: 'Butterfly 50m', t: 'Butterfly', start: 50 },
      ],
      'Drills & IM': [
        { n: 'Kick drill', t: 'Legs only', start: 100 },
        { n: 'Pull drill', t: 'Arms only', start: 100 },
        { n: 'IM 100m', t: 'All four strokes', start: 100 },
        { n: 'IM 200m', t: 'Individual medley', start: 200 },
      ],
    },
  },
  boxing: {
    name: 'Boxing',
    metric: 'time',
    u1: 'min',
    goal: { kind: 'time', label: 'Weekly minutes', unit: 'min', def: 120 },
    cats: {
      'Bag work': [
        { n: 'Heavy bag', t: 'Power · rounds', m: 'rounds', u1: 'rounds', u2: 'min', start: 3 },
        { n: 'Speed bag', t: 'Timing · rhythm', start: 3 },
        { n: 'Double-end bag', t: 'Accuracy · reflex', start: 3 },
      ],
      'Pad work': [{ n: 'Mitts / pads', t: 'Combinations', m: 'rounds', u1: 'rounds', u2: 'min', start: 3 }],
      Shadowboxing: [
        { n: 'Shadowboxing', t: 'Form · movement', m: 'rounds', u1: 'rounds', u2: 'min', start: 3 },
        { n: 'Footwork drill', t: 'Step-drag · pivots', start: 5 },
      ],
      Sparring: [{ n: 'Sparring', t: 'Live rounds', m: 'rounds', u1: 'rounds', u2: 'min', start: 3 }],
      Combos: [
        { n: '1-2 (jab-cross)', t: 'Reps of the combo', m: 'reps', u1: 'reps', start: 50 },
        { n: '1-2-3 (+lead hook)', t: 'Reps of the combo', m: 'reps', u1: 'reps', start: 40 },
        { n: 'Slip & counter', t: 'Defense → counter', m: 'reps', u1: 'reps', start: 30 },
      ],
      Conditioning: [
        { n: 'Jump rope', t: 'Foot speed · cardio', start: 10 },
        { n: 'Core circuit', t: 'Rotational power', start: 10 },
      ],
    },
  },
  bodyweight: {
    name: 'Bodyweight',
    metric: 'reps',
    u1: 'reps',
    goal: { kind: 'sessions', label: 'Weekly sessions', unit: 'days', def: 4 },
    cats: {
      Push: [
        { n: 'Push-up', t: 'Chest · triceps', start: 15 },
        { n: 'Diamond push-up', t: 'Triceps', start: 10 },
        { n: 'Wide push-up', t: 'Chest', start: 12 },
        { n: 'Pike push-up', t: 'Shoulders', start: 8 },
        { n: 'Bench dip', t: 'Triceps', start: 12 },
      ],
      Pull: [
        { n: 'Pull-up', t: 'Lats · upper back', start: 8 },
        { n: 'Chin-up', t: 'Lats · biceps', start: 8 },
        { n: 'Inverted row', t: 'Horizontal pull', start: 12 },
        { n: 'Towel row', t: 'Grip · back', start: 10 },
      ],
      Legs: [
        { n: 'Bodyweight squat', t: 'Quads · glutes', start: 20 },
        { n: 'Lunge', t: 'Quads · glutes', start: 16 },
        { n: 'Bulgarian split squat', t: 'Single-leg', start: 12 },
        { n: 'Glute bridge', t: 'Glutes · hamstrings', start: 18 },
        { n: 'Calf raise', t: 'Calves', start: 25 },
        { n: 'Wall sit', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 45 },
      ],
      Core: [
        { n: 'Plank', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 45 },
        { n: 'Crunch', t: 'Upper abs', start: 20 },
        { n: 'Leg raise', t: 'Lower abs', start: 15 },
        { n: 'Mountain climber', t: 'Core · cardio', start: 30 },
        { n: 'Russian twist', t: 'Obliques', start: 30 },
        { n: 'Hollow hold', t: 'Hold — seconds', m: 'hold', u1: 'sec', start: 25 },
      ],
    },
  },
  trail: {
    name: 'Trail',
    metric: 'dist',
    u1: 'km',
    u2: 'm↑',
    v2kind: 'elev',
    goal: { kind: 'elev', label: 'Weekly vert', unit: 'm↑', def: 1000 },
    cats: {
      'Easy trail': [{ n: 'Easy trail run', t: 'Aerobic on terrain', start: 6 }],
      Climb: [
        { n: 'Uphill / vert push', t: 'Sustained climbing', start: 5 },
        { n: 'Vertical km', t: '1000m of D+', start: 5 },
      ],
      Descent: [{ n: 'Technical descent', t: 'Downhill skill · control', start: 5 }],
      Long: [{ n: 'Long trail run', t: 'Time on feet', start: 18 }],
      Intervals: [{ n: 'Hill repeats', t: 'Power · leg strength', start: 6 }],
    },
  },
  trekking: {
    name: 'Trek',
    metric: 'dist',
    u1: 'km',
    u2: 'm↑',
    v2kind: 'elev',
    goal: { kind: 'dist', label: 'Weekly distance', unit: 'km', def: 15 },
    cats: {
      'Day hike': [{ n: 'Day hike', t: 'Distance + vert', start: 10 }],
      Summit: [{ n: 'Summit push', t: 'Big ascent', start: 12 }],
      'Multi-day': [{ n: 'Multi-day leg', t: 'Section of a thru-hike', start: 18 }],
      Incline: [{ n: 'Incline training', t: 'Treadmill / hill incline', start: 6 }],
      Loaded: [{ n: 'Ruck / loaded carry', t: 'Pack weight on terrain', start: 8 }],
    },
  },
};

export function sportDef(sport: SportId): SportDef {
  return SPORTS[sport] ?? SPORTS.gym;
}

export function categoriesFor(sport: SportId): string[] {
  return Object.keys(sportDef(sport).cats);
}

export function exMetric(ex: PresetExercise | CustomExercise, sport: SportId): MetricType {
  return (ex.m ?? sportDef(sport).metric) as MetricType;
}

export function exU1(ex: PresetExercise | CustomExercise, sport: SportId): string {
  return ex.u1 ?? sportDef(sport).u1;
}

export function exU2(ex: PresetExercise | CustomExercise, sport: SportId): string | undefined {
  if ('u2' in ex && ex.u2 !== undefined) return ex.u2;
  return sportDef(sport).u2;
}

export function isWeightMetric(ex: PresetExercise | CustomExercise, sport: SportId): boolean {
  return exMetric(ex, sport) === 'weight';
}

export function catColor(sport: SportId, cat: string): string {
  const def = sportDef(sport);
  if (def.colors?.[cat]) return def.colors[cat];
  const cats = categoriesFor(sport);
  const i = cats.indexOf(cat);
  return CAT_PALETTE[(i < 0 ? 0 : i) % CAT_PALETTE.length];
}

export function exercisesFor(
  sport: SportId,
  category: string,
  bucket: Bucket
): PresetExercise[] {
  const lib = sportDef(sport).cats;
  if (!lib[category]) return [];
  const list: PresetExercise[] = lib[category]
    .filter((e) => !bucket.removed.includes(e.n))
    .concat(
      bucket.custom
        .filter((c) => c.g === category)
        .map((c) => ({
          n: c.n,
          t: c.t,
          start: c.start,
          m: c.m,
          u1: c.u1,
          u2: c.u2,
          custom: true,
        }))
    );
  const ord = bucket.order?.[category] || [];
  if (ord.length) {
    const ix = (n: string) => {
      const i = ord.indexOf(n);
      return i < 0 ? 9999 : i;
    };
    list.sort((a, b) => ix(a.n) - ix(b.n));
  }
  return list;
}

export function groupOfSport(sport: SportId, exName: string, custom: CustomExercise[]): string | null {
  const lib = sportDef(sport).cats;
  for (const g of Object.keys(lib)) {
    if (lib[g].some((e) => e.n === exName)) return g;
    if (exercisesFor(sport, g, { logs: [], custom, removed: [], order: {} }).some((e) => e.n === exName)) return g;
  }
  const c = custom.find((x) => x.n === exName);
  return c?.g ?? null;
}

export function findExSport(sport: SportId, name: string): PresetExercise | undefined {
  const lib = sportDef(sport).cats;
  for (const g of Object.keys(lib)) {
    const found = lib[g].find((e) => e.n === name);
    if (found) return found;
  }
  return undefined;
}
