'use client';

import type { ReactNode } from 'react';
import { useUIStore, type TabId } from '@/hooks/uiStore';
import { useWeapon } from '@/hooks';
import { levelInfo, allSportLogs } from '@/domain/ranks';

interface NavItem {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const STATIC_TABS: NavItem[] = [
  { id: 'goals', label: 'Goals', icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></> },
  { id: 'home', label: 'Home', icon: <><path d="M3 10.5 12 3.5l9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></> },
  { id: 'report', label: 'Report', icon: <path d="M4 20V4M4 20h16M8 20v-5M12 20v-9M16 20v-3M20 20V7" /> },
  { id: 'avatar', label: 'Profile', icon: <><path d="M12 2.5l8 4.6v9.2L12 21l-8-4.7V7.1z" /><circle cx="12" cy="10" r="2.4" /><path d="M8 16.5a4 4 0 0 1 8 0" /></> },
];

const WORKOUT_ICON_LIFT = <path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13" />;
const WORKOUT_ICON_RUN = (
  <>
    <circle cx="13" cy="4.5" r="2" />
    <path d="M6 21l3.5-6 3-2.5 1.5 4 3 3M9.5 12.5 8 8l5-1.5 3 3 3 .5" />
  </>
);

export function BottomNav() {
  const { tab, setTab } = useUIStore();
  const { state } = useWeapon();
  if (!state) return null;
  const bucket = state.sports[state.sport];
  const li = levelInfo(allSportLogs(state));
  const showBadge = li.lvl > (bucket.seenLevel ?? 0);

  // Workout slot mirrors legacy `applyMode`: label + icon flip with mode.
  const isEndure = state.sport !== 'gym';
  const workoutItem: NavItem = {
    id: 'workout',
    label: isEndure ? 'Run' : 'Workout',
    icon: isEndure ? WORKOUT_ICON_RUN : WORKOUT_ICON_LIFT,
  };
  const tabs: NavItem[] = [workoutItem, ...STATIC_TABS];

  return (
    <nav className="bottomnav">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          data-t={t.id}
          className={`${tab === t.id ? 'active' : ''}${t.id === 'avatar' && showBadge ? ' leveled' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <svg
            className="ico vortex"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {t.icon}
          </svg>
          <span className="nav-label">{t.label}</span>
          {t.id === 'avatar' && showBadge && <span className="lvup-badge">LV UP</span>}
        </button>
      ))}
    </nav>
  );
}
