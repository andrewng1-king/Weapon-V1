export interface LogEntry {
  id: string;
  date: string;
  ex: string;
  kg: number;
  reps: number;
  sets: number;
}

export interface CustomExercise {
  n: string;
  g: string;
  t: string;
  start: number;
}

export interface PresetExercise {
  n: string;
  t: string;
  start: number;
  custom?: boolean;
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
  calTarget: number;
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
  mode: 'strength' | 'endurance';
  bw: number;
  strength: Bucket;
  endurance: Bucket;
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

export type Group = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core';

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
