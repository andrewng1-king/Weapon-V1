'use client';

import { Providers } from '@/providers';
import { App } from './App';

/** Single client boundary for the app shell (React Query + UI). */
export function AppShell() {
  return (
    <Providers>
      <App />
    </Providers>
  );
}
