import type { UserRepository } from '@/application/ports';
import type { User } from '@/domain/types';

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export class HttpUserRepository implements UserRepository {
  async listUsers(): Promise<User[]> {
    const res = await fetch('/api/users', { cache: 'no-store' });
    return parseJson(res);
  }

  async addUser(username: string): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return parseJson(res);
  }
}
