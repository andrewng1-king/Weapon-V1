'use client';

import { Providers } from './providers';
import { App } from '@/ui/components/App';

export default function Page() {
  return (
    <Providers>
      <App />
    </Providers>
  );
}
