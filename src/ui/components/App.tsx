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

export function App() {
  const { state, isLoading } = useWeapon();
  const tab = useUIStore((s) => s.tab);

  useThemeSync(state);

  if (isLoading) {
    return <div className="empty">Loading...</div>;
  }

  return (
    <>
      <Header />
      <section className={`tab${tab === 'workout' ? ' active' : ''}`}><WorkoutTab /></section>
      <section className={`tab${tab === 'goals' ? ' active' : ''}`}><GoalsTab /></section>
      <section className={`tab${tab === 'home' ? ' active' : ''}`}><HomeTab /></section>
      <section className={`tab${tab === 'report' ? ' active' : ''}`}><ReportTab /></section>
      <section className={`tab${tab === 'avatar' ? ' active' : ''}`}><AvatarTab /></section>
      <BottomNav />
      <SpeedDial />
      <Recorder />
      <MenuDrawer />
      <Modals />
      <Toast />
    </>
  );
}
