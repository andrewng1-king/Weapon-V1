import type { User } from '@/domain/types';
import type { UserRepository } from '@/application/ports';
import { getSupabase } from './client';

export class SupabaseUserRepository implements UserRepository {
  async listUsers(): Promise<User[]> {
    const { data, error } = await getSupabase()
      .from('app_users')
      .select('id, username, display_name')
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, username: r.username, display_name: r.display_name }));
  }

  async addUser(username: string): Promise<User> {
    const { data, error } = await getSupabase()
      .from('app_users')
      .insert({ username, display_name: username })
      .select('id, username, display_name')
      .single();
    if (error) throw error;
    return { id: data.id, username: data.username, display_name: data.display_name };
  }
}
