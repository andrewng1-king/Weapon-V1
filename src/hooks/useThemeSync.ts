'use client';

import { useEffect } from 'react';
import type { WeaponState } from '@/domain/types';
import { ACCENT_SET } from '@/domain/accents';

export function useThemeSync(state: WeaponState | null) {
  useEffect(() => {
    if (!state) return;
    const body = document.body;
    body.setAttribute('data-sport', state.sport);
    body.setAttribute('data-theme', state.theme);
    body.classList.toggle('dense', state.layout === 'dense');

    const accent = ACCENT_SET[state.dev.color] ?? ACCENT_SET[0];
    const root = document.documentElement;
    root.style.setProperty('--accent', accent.hex);
    root.style.setProperty('--accent-dim', accent.dim);
    root.style.setProperty('--accent-rgb', accent.rgb);
    root.style.setProperty('--accent-ink', accent.ink);
    root.style.setProperty('--gold', accent.hex);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', state.theme === 'light' ? '#f4f2ee' : '#0a0a0a');
    }
  }, [state?.sport, state?.theme, state?.layout, state?.dev.color]);
}
