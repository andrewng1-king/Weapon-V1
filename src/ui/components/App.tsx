'use client';

import { useEffect } from 'react';
import { useWeapon, useThemeSync, useUIStore } from '@/hooks';
import { useUserPicker } from '@/hooks/useUserPicker';
import { useTabAnimation } from '@/hooks/useTabAnimation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WorkoutTab } from './WorkoutTab';
import { GoalsTab } from './GoalsTab';
import { HomeTab } from './HomeTab';
import { ReportTab } from './ReportTab';
import { AvatarTab } from './AvatarTab';
import { MenuDrawer } from './MenuDrawer';
import { Modals } from './Modals';
import { SpeedDial } from './SpeedDial';
import { Compete } from './Compete';
import { Recorder } from './Recorder';
import { Toast, showToast } from './Toast';

const TAB_ORDER = ['workout', 'goals', 'home', 'report', 'avatar'] as const;
type TabId = (typeof TAB_ORDER)[number];

function TabPanel({
  id,
  className,
  children,
}: {
  id: TabId;
  className: string;
  children: React.ReactNode;
}) {
  const tab = useUIStore((s) => s.tab);
  const tabAnimKey = useUIStore((s) => s.tabAnimKey);
  const active = tab === id;
  const ref = useTabAnimation(active, tabAnimKey);
  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  );
}

function PtrIndicator({ phase, dy }: { phase: 'idle' | 'pull' | 'spin'; dy: number }) {
  const visible = phase !== 'idle';
  const translate = phase === 'spin' ? 24 : Math.min(24, dy / 4);
  return (
    <div
      className={`ptr${visible ? ' show' : ''}${phase === 'spin' ? ' spin' : ''}`}
      style={{ transform: `translate(-50%, ${translate}px)` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    </div>
  );
}

export function App() {
  const weapon = useWeapon();
  const { state, isLoading, isError, error } = weapon;
  const tab = useUIStore((s) => s.tab);
  const prevTab = useUIStore((s) => s.prevTab);
  const tabAnimKey = useUIStore((s) => s.tabAnimKey);
  const qc = useQueryClient();
  const { userId } = useUserPicker();

  // Tab change → scroll-to-top (legacy `switchTab` does `window.scrollTo(0,0)`).
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [tab, tabAnimKey]);

  const ptr = usePullToRefresh(async () => {
    if (!userId) return;
    showToast('Refreshing…');
    await qc.invalidateQueries({ queryKey: queryKeys.state(userId) });
    showToast('Updated');
  });

  useThemeSync(state);

  if (isLoading) return <div className="empty">Loading...</div>;
  if (isError) {
    return (
      <div className="app-error">
        <p>Cannot load data from server.</p>
        <p style={{ fontSize: '.8rem', marginTop: 8, color: 'var(--muted)' }}>{String(error)}</p>
      </div>
    );
  }

  const dir = prevTab ? TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(prevTab) : 0;
  const navClass = dir > 0 ? ' nav-fwd' : dir < 0 ? ' nav-back' : '';
  const cls = (id: TabId) => `tab${tab === id ? ` active${navClass}` : ''}`;

  return (
    <>
      <PtrIndicator phase={ptr.phase} dy={ptr.dy} />
      <Header />
      <TabPanel id="workout" className={cls('workout')}><WorkoutTab /></TabPanel>
      <TabPanel id="goals" className={cls('goals')}><GoalsTab /></TabPanel>
      <TabPanel id="home" className={cls('home')}><HomeTab /></TabPanel>
      <TabPanel id="report" className={cls('report')}><ReportTab /></TabPanel>
      <TabPanel id="avatar" className={cls('avatar')}><AvatarTab /></TabPanel>
      <BottomNav />
      <SpeedDial />
      <Compete />
      <Recorder />
      <MenuDrawer />
      <Modals />
      <Toast />
    </>
  );
}
