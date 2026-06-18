'use client';

import { useEffect, useRef } from 'react';

/** Re-triggers CSS keyframe animations when a tab becomes active again. */
export function useTabAnimation(active: boolean, animKey: number) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.removeProperty('animation');
  }, [active, animKey]);

  return ref;
}
