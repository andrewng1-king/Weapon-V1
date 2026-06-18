import type { WorkoutRepository } from '@/application/ports';
import type { WeaponState, LogEntry, CustomExercise, SportId } from '@/domain/types';

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export class HttpWorkoutRepository implements WorkoutRepository {
  async loadState(userId: string): Promise<WeaponState> {
    const res = await fetch(`/api/users/${userId}/state`, { cache: 'no-store' });
    return parseJson(res);
  }

  async saveSettings(userId: string, state: WeaponState): Promise<void> {
    const res = await fetch(`/api/users/${userId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    await parseJson(res);
  }

  async addLog(userId: string, log: LogEntry, sport: SportId): Promise<void> {
    const res = await fetch(`/api/users/${userId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, log }),
    });
    await parseJson(res);
  }

  async deleteLog(userId: string, logId: string): Promise<void> {
    const res = await fetch(`/api/logs/${logId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    await parseJson(res);
  }

  async addCustomExercise(userId: string, sport: SportId, ex: CustomExercise): Promise<void> {
    const res = await fetch(`/api/users/${userId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, exercise: ex }),
    });
    await parseJson(res);
  }

  async uploadMedia(userId: string, kind: 'photo' | 'cover', file: File): Promise<string> {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    const res = await fetch(`/api/users/${userId}/media`, { method: 'POST', body: form });
    const data = await parseJson<{ url: string }>(res);
    return data.url;
  }
}
