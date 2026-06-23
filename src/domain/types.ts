export type SportId = 'gym' | 'run' | 'calisthenics' | 'hyrox';
export type Metric = 'weight' | 'dist' | 'reps' | 'hold';

export interface LogEntry {
  id: string;
  date: string;
  ex: string;
  kg: number;
  reps: number;
  sets: number;
  // polymorphic (non-weight) metrics
  m?: Metric;
  v1?: number;
  v2?: number;
  u1?: string;
  u2?: string;
}

export interface CustomExercise {
  n: string;
  g: string;
  t: string;
  start: number;
  m?: Metric;
  u1?: string;
  u2?: string;
}

export interface PresetExercise {
  n: string;
  t: string;
  start: number;
  custom?: boolean;
  m?: Metric;
  u1?: string;
  u2?: string;
}

export interface Profile {
  name?: string;
  job?: string;
  height?: number;
  bio?: string;
  spotify?: string;
  photo?: string;
  cover?: string;
  coverPos?: string;
}

export interface Goals {
  /** Weekly target per sport. Falls back to the sport's default when missing. */
  targets: Partial<Record<SportId, number>>;
}

export interface DevSettings {
  on: boolean;
  lvl: number;
  color: number;
}

export interface Bucket {
  logs: LogEntry[];
  custom: CustomExercise[];
  removed: string[];
  order: Record<string, string[]>;
  seenLevel?: number;
}

export interface WeaponState {
  sport: SportId;
  bw: number;
  sports: Record<SportId, Bucket>;
  profile: Profile;
  goals: Goals;
  theme: 'light' | 'dark';
  logo: 'weapon' | 'athlete';
  dev: DevSettings;
}

export interface User {
  id: string;
  username: string;
  display_name?: string;
}

/** Gym muscle groups — used for color mapping. */
export type GymGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core';
/** A category label within the current sport (varies per sport). */
export type Group = string;

export interface AvatarStats {
  vol: number;
  maxSet: number;
  groupsHit: number;
  sessions: number;
  streak: number;
  lvl: number;
  logs: number;
}

export interface Achievement {
  nm: string;
  ic: string;
  got: boolean;
  p: number;
}

export interface LevelInfo {
  xp: number;
  lvl: number;
  into: number;
  need: number;
  pct: number;
}

export interface RankInfo {
  name: string;
  next: string | null;
  nextLvl: number;
}
