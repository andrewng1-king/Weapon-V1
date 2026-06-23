'use client';

import type { ReactNode } from 'react';
import { useUIStore, type TabId } from '@/hooks/uiStore';
import { useWeapon } from '@/hooks';
import { levelInfo } from '@/domain/ranks';

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: 'workout', label: 'Workout',
    icon: <path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13" />,
  },
  {
    id: 'goals', label: 'Goals',
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  },
  {
    id: 'home', label: 'Home',
    icon: <><path d="M3 10.5 12 3.5l9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></>,
  },
  {
    id: 'report', label: 'Report',
    icon: <path d="M4 20V4M4 20h16M8 20v-5M12 20v-9M16 20v-3M20 20V7" />,
  },
  {
    id: 'avatar', label: 'Profile',
    icon: <><path d="M12 2.5l8 4.6v9.2L12 21l-8-4.7V7.1z" /><circle cx="12" cy="10" r="2.4" /><path d="M8 16.5a4 4 0 0 1 8 0" /></>,
  },
];

export function BottomNav() {
  const { tab, setTab } = useUIStore();
  const { state } = useWeapon();

  const bucket = state ? state.sports[state.sport] : undefined;
  const li = state ? levelInfo(bucket?.logs ?? []) : null;
  const showBadge = li && bucket && li.lvl > (bucket.seenLevel ?? 0);

  return (
    <nav className="bottomnav">
      {TABS.map((t) => (
        <button
          key={t.id}
          data-t={t.id}
          className={`${tab === t.id ? 'active' : ''}${t.id === 'avatar' && showBadge ? ' leveled' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {t.icon}
          </svg>
          {t.label}
          {t.id === 'avatar' && showBadge && <span className="lvup-badge">LV UP</span>}
        </button>
      ))}
    </nav>
  );
}
