'use client';

import { useWeapon, useThemeSync, useUIStore } from '@/hooks';
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
import { Recorder } from './Recorder';
import { Toast } from './Toast';

const TAB_ORDER = ['workout', 'goals', 'home', 'report', 'avatar'] as const;

export function App() {
  const { state, isLoading } = useWeapon();
  const tab = useUIStore((s) => s.tab);
  const prevTab = useUIStore((s) => s.prevTab);

  useThemeSync(state);

  if (isLoading) {
    return <div className="empty">Loading...</div>;
  }

  // direction of the last tab change → drives the slide-in transition (legacy parity)
  const dir = prevTab ? TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(prevTab) : 0;
  const navClass = dir > 0 ? ' nav-fwd' : dir < 0 ? ' nav-back' : '';
  const cls = (id: (typeof TAB_ORDER)[number]) => `tab${tab === id ? ` active${navClass}` : ''}`;

  return (
    <>
      <Header />
      <section className={cls('workout')}><WorkoutTab /></section>
      <section className={cls('goals')}><GoalsTab /></section>
      <section className={cls('home')}><HomeTab /></section>
      <section className={cls('report')}><ReportTab /></section>
      <section className={cls('avatar')}><AvatarTab /></section>
      <BottomNav />
      <SpeedDial />
      <Recorder />
      <MenuDrawer />
      <Modals />
      <Toast />
    </>
  );
}
