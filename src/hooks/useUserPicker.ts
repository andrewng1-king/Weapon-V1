'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { queryKeys } from './queryKeys';
import { useUIStore } from './uiStore';
import { HttpUserRepository } from '@/infrastructure/api/HttpUserRepository';
import { DEFAULT_USER_ID, type User } from '@/domain/types';

const repo = new HttpUserRepository();

interface UserPickerStore {
  userId: string;
  setUserId: (id: string) => void;
}

/** Shared across all components — session-only user switch (no localStorage). */
const useUserPickerStore = create<UserPickerStore>((set) => ({
  userId: DEFAULT_USER_ID,
  setUserId: (id) => set({ userId: id }),
}));

export function useUserPicker() {
  const qc = useQueryClient();
  const userId = useUserPickerStore((s) => s.userId);
  const setUserId = useUserPickerStore((s) => s.setUserId);

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => repo.listUsers(),
  });

  const addMutation = useMutation({
    mutationFn: (username: string) => repo.addUser(username),
    onSuccess: (user: User) => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
      selectUser(user.id);
    },
  });

  function selectUser(id: string) {
    if (id === useUserPickerStore.getState().userId) return;
    setUserId(id);
    useUIStore.getState().clearVals();
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
