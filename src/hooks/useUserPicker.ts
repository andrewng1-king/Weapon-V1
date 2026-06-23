'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { queryKeys } from './queryKeys';
import { SupabaseUserRepository } from '@/infrastructure/supabase/UserRepository';
import { isSupabaseConfigured } from '@/infrastructure/supabase/client';
import type { User } from '@/domain/types';

const repo = new SupabaseUserRepository();
const STORAGE_KEY = 'weapon_user_id';

export function useUserPicker() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUserId(stored);
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => repo.listUsers(),
    enabled: configured,
  });

  const addMutation = useMutation({
    mutationFn: (username: string) => {
      if (!configured) return Promise.resolve({ id: '', username, display_name: username } as User);
      return repo.addUser(username);
    },
    onSuccess: (user: User) => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      selectUser(user.id);
    },
  });

  function selectUser(id: string) {
    setUserId(id);
    localStorage.setItem(STORAGE_KEY, id);
    qc.invalidateQueries({ queryKey: queryKeys.state(id) });
  }

  return {
    userId,
    users,
    selectUser,
    addUser: (name: string) => addMutation.mutate(name),
    isAdding: addMutation.isPending,
  };
}
