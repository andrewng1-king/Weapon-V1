import type { WorkoutRepository } from './ports';
import type { WeaponState, Profile, Goals, SportId } from '@/domain/types';

export async function saveProfile(
  repo: WorkoutRepository,
  userId: string,
  state: WeaponState,
  profile: Partial<Profile>
): Promise<WeaponState> {
  const updated: WeaponState = { ...state, profile: { ...state.profile, ...profile } };
  await repo.saveSettings(userId, updated);
  return updated;
}

export async function setGoal(
  repo: WorkoutRepository,
  userId: string,
  state: WeaponState,
  goals: Partial<Goals>
): Promise<WeaponState> {
  const updated: WeaponState = { ...state, goals: { ...state.goals, ...goals } };
  await repo.saveSettings(userId, updated);
  return updated;
}

export function setSport(state: WeaponState, sport: SportId): WeaponState {
  return { ...state, sport };
}

export function setTheme(state: WeaponState, theme: 'light' | 'dark'): WeaponState {
  return { ...state, theme };
}

export function toggleLogo(state: WeaponState): WeaponState {
  return { ...state, logo: state.logo === 'weapon' ? 'athlete' : 'weapon' };
}

export function setDevMode(state: WeaponState, on: boolean, lvl?: number): WeaponState {
  return { ...state, dev: { ...state.dev, on, lvl: lvl ?? state.dev.lvl } };
}

export function setAccent(state: WeaponState, colorIndex: number): WeaponState {
  return { ...state, dev: { ...state.dev, color: colorIndex } };
}
