import type { WeaponState, User, LogEntry, CustomExercise, SportId } from '@/domain/types';

export interface UserRepository {
  listUsers(): Promise<User[]>;
  addUser(username: string): Promise<User>;
}

export interface WorkoutRepository {
  loadState(userId: string): Promise<WeaponState>;
  saveSettings(userId: string, state: WeaponState): Promise<void>;
  addLog(userId: string, log: LogEntry, sport: SportId): Promise<void>;
  deleteLog(userId: string, logId: string): Promise<void>;
  addCustomExercise(userId: string, sport: SportId, ex: CustomExercise): Promise<void>;
  uploadMedia?(userId: string, kind: 'photo' | 'cover', file: File): Promise<string>;
}
