'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { SupabaseWorkoutRepository } from '@/infrastructure/supabase/WorkoutRepository';
import { isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { useUserPicker } from './useUserPicker';
import type { WeaponState, LogEntry, CustomExercise, Group, Bucket } from '@/domain/types';
import * as workoutUC from '@/application/workoutUsecases';
import * as profileUC from '@/application/profileUsecases';

const repo = new SupabaseWorkoutRepository();

const EMPTY_BUCKET: Bucket = { logs: [], custom: [], removed: [], order: {} };
const DEFAULT_STATE: WeaponState = {
  mode: 'strength',
  bw: 75,
  strength: { ...EMPTY_BUCKET },
  endurance: { ...EMPTY_BUCKET },
  profile: {},
  goals: { calTarget: 3000 },
  theme: 'dark',
  logo: 'athlete',
  dev: { on: false, lvl: 1, color: 0 },
};

export function useWeapon() {
  const { userId } = useUserPicker();
  const qc = useQueryClient();
  const cloudEnabled = isSupabaseConfigured() && !!userId;

  const { data: state, isLoading } = useQuery({
    queryKey: queryKeys.state(userId ?? '__local'),
    queryFn: () => repo.loadState(userId!),
    enabled: cloudEnabled,
  });

  const effectiveState = state ?? DEFAULT_STATE;

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.state(userId ?? '__local') });

  const logMutation = useMutation({
    mutationFn: async (log: LogEntry) => {
      if (!userId || !cloudEnabled) return;
      await workoutUC.logSet(repo, userId, effectiveState, log);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      if (!userId) return;
      await workoutUC.deleteLog(repo, userId, logId);
    },
    onSuccess: invalidate,
  });

  const addCustomMutation = useMutation({
    mutationFn: async (ex: CustomExercise) => {
      if (!userId) return;
      await workoutUC.addCustomExercise(repo, userId, ex);
    },
    onSuccess: invalidate,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (updated: WeaponState) => {
      if (!userId) return;
      await repo.saveSettings(userId, updated);
    },
    onSuccess: invalidate,
  });

  function updateState(updater: (s: WeaponState) => WeaponState) {
    const updated = updater(effectiveState);
    qc.setQueryData(queryKeys.state(userId ?? '__local'), updated);
    if (cloudEnabled) saveSettingsMutation.mutate(updated);
  }

  return {
    state: effectiveState,
    isLoading: cloudEnabled ? isLoading : false,
    logExercise: (log: LogEntry) => logMutation.mutate(log),
    deleteLog: (logId: string) => deleteMutation.mutate(logId),
    addCustomExercise: (ex: CustomExercise) => addCustomMutation.mutate(ex),
    removeExercise: (name: string) => updateState((s) => workoutUC.removeExercise(s, name)),
    setOrder: (group: Group, order: string[]) => updateState((s) => workoutUC.setOrder(s, group, order)),
    setMode: (mode: 'strength' | 'endurance') => updateState((s) => profileUC.setMode(s, mode)),
    setTheme: (theme: 'light' | 'dark') => updateState((s) => profileUC.setTheme(s, theme)),
    toggleLogo: () => updateState((s) => profileUC.toggleLogo(s)),
    setDevMode: (on: boolean, lvl?: number) => updateState((s) => profileUC.setDevMode(s, on, lvl)),
    setAccent: (idx: number) => updateState((s) => profileUC.setAccent(s, idx)),
    saveProfile: (profile: Partial<WeaponState['profile']>) => updateState((s) => ({ ...s, profile: { ...s.profile, ...profile } })),
    setGoal: (calTarget: number) => updateState((s) => ({ ...s, goals: { ...s.goals, calTarget } })),
    setBw: (bw: number) => updateState((s) => ({ ...s, bw })),
  };
}
