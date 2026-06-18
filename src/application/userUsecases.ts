import type { UserRepository, WorkoutRepository } from './ports';
import type { WeaponState, User } from '@/domain/types';

export async function loadState(
  repo: WorkoutRepository,
  userId: string
): Promise<WeaponState> {
  return repo.loadState(userId);
}

export async function listUsers(repo: UserRepository): Promise<User[]> {
  return repo.listUsers();
}

export async function addUser(repo: UserRepository, username: string): Promise<User> {
  return repo.addUser(username);
}
