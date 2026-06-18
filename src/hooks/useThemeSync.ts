'use client';

import { useEffect } from 'react';
import type { WeaponState } from '@/domain/types';

export function useThemeSync(state: WeaponState | null) {
  useEffect(() => {
    if (!state) return;
    const body = document.body;
    body.setAttribute('data-mode', state.mode);
    body.setAttribute('data-theme', state.theme);
  }, [state?.mode, state?.theme]);
}
