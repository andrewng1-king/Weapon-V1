import { create } from 'zustand';
import type { Group } from '@/domain/types';

export type TabId = 'workout' | 'goals' | 'home' | 'report' | 'avatar';
export type Modal = 'addExercise' | 'settings' | 'ranks' | 'calendar' | 'planner' | 'recExercise' | null;

interface RecordingState {
  active: boolean;
  startTime: number;
  elapsed: number;
  logs: string[];
  minimized: boolean;
}

interface UIState {
  tab: TabId;
  prevTab: TabId | null;
  group: Group;
  searchOpen: boolean;
  searchQuery: string;
  menuOpen: boolean;
  modal: Modal;
  recording: RecordingState;
  vals: Record<string, { kg: number; reps: number }>;

  setTab: (t: TabId) => void;
  setGroup: (g: Group) => void;
  toggleSearch: () => void;
  setSearchQuery: (q: string) => void;
  setMenuOpen: (open: boolean) => void;
  setModal: (m: Modal) => void;
  setVal: (ex: string, kg: number, reps: number) => void;
  startRecording: () => void;
  stopRecording: () => void;
  toggleMinimized: () => void;
  tickRecording: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  tab: 'home',
  prevTab: null,
  group: 'Chest',
  searchOpen: false,
  searchQuery: '',
  menuOpen: false,
  modal: null,
  recording: { active: false, startTime: 0, elapsed: 0, logs: [], minimized: false },
  vals: {},

  setTab: (t) => set((s) => ({ tab: t, prevTab: s.tab })),
  setGroup: (g) => set({ group: g }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen, searchQuery: s.searchOpen ? '' : s.searchQuery })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMenuOpen: (open) => set({ menuOpen: open }),
  setModal: (m) => set({ modal: m }),
  setVal: (ex, kg, reps) => set((s) => ({ vals: { ...s.vals, [ex]: { kg, reps } } })),
  startRecording: () => set({ recording: { active: true, startTime: Date.now(), elapsed: 0, logs: [], minimized: false } }),
  stopRecording: () => set((s) => ({ recording: { ...s.recording, active: false } })),
  toggleMinimized: () => set((s) => ({ recording: { ...s.recording, minimized: !s.recording.minimized } })),
  tickRecording: () => set((s) => ({
    recording: { ...s.recording, elapsed: s.recording.active ? Math.floor((Date.now() - s.recording.startTime) / 1000) : s.recording.elapsed }
  })),
}));
