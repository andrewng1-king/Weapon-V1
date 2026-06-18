'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type PtrPhase = 'idle' | 'pull' | 'spin';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [phase, setPhase] = useState<PtrPhase>('idle');
  const pullRef = useRef({ startY: 0, pulling: false });

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 8) return;
    pullRef.current = { startY: e.touches[0].clientY, pulling: true };
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pullRef.current.pulling) return;
    const dy = e.touches[0].clientY - pullRef.current.startY;
    if (dy > 24) setPhase('pull');
    if (dy > 80) setPhase('spin');
  }, []);

  const onTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!pullRef.current.pulling) return;
    const dy = e.changedTouches[0].clientY - pullRef.current.startY;
    pullRef.current.pulling = false;
    if (dy > 80) {
      setPhase('spin');
      try {
        await onRefresh();
      } finally {
        setPhase('idle');
      }
    } else {
      setPhase('idle');
    }
  }, [onRefresh]);

  useEffect(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return phase;
}
