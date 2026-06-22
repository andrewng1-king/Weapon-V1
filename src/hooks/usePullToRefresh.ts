'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from './uiStore';

type PtrPhase = 'idle' | 'pull' | 'spin';

const TRIGGER_PX = 80;
const SHOW_PX = 24;

/**
 * Pull-to-refresh — port of legacy gesture.
 *
 * Constraints (matched from legacy):
 *  - Only active on the Profile tab (`avatar`).
 *  - Disabled when an overlay is open (menu drawer / modal / compete).
 *  - Triggers when pulled past 80px; haptic on each phase change.
 *  - Returns the live pull-distance so the caller can transform the
 *    indicator (avoids relying on CSS-only translation).
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [phase, setPhase] = useState<PtrPhase>('idle');
  const [dy, setDy] = useState(0);
  const tab = useUIStore((s) => s.tab);
  const menuOpen = useUIStore((s) => s.menuOpen);
  const modal = useUIStore((s) => s.modal);
  const competeOpen = useUIStore((s) => s.compete.open);
  const blocked = tab !== 'avatar' || menuOpen || modal != null || competeOpen;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const pullRef = useRef({ startY: 0, pulling: false, lastPhase: 'idle' as PtrPhase });

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  }

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (blockedRef.current) return;
    if (window.scrollY > 8) return;
    pullRef.current = { startY: e.touches[0].clientY, pulling: true, lastPhase: 'idle' };
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pullRef.current.pulling) return;
    const delta = e.touches[0].clientY - pullRef.current.startY;
    if (delta <= 0) {
      // Cancel if user scrolls back upward.
      if (pullRef.current.lastPhase !== 'idle') setPhase('idle');
      pullRef.current.lastPhase = 'idle';
      setDy(0);
      return;
    }
    setDy(delta);
    let next: PtrPhase = 'idle';
    if (delta > TRIGGER_PX) next = 'spin';
    else if (delta > SHOW_PX) next = 'pull';
    if (next !== pullRef.current.lastPhase) {
      if (next === 'spin' || next === 'pull') vibrate(8);
      setPhase(next);
      pullRef.current.lastPhase = next;
    }
  }, []);

  const onTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!pullRef.current.pulling) return;
    const delta = e.changedTouches[0].clientY - pullRef.current.startY;
    pullRef.current.pulling = false;
    setDy(0);
    if (delta > TRIGGER_PX) {
      setPhase('spin');
      vibrate(20);
      try {
        await onRefresh();
      } finally {
        setPhase('idle');
        pullRef.current.lastPhase = 'idle';
      }
    } else {
      setPhase('idle');
      pullRef.current.lastPhase = 'idle';
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

  // Reset live state whenever the gesture is blocked (e.g. a modal opens
  // mid-pull) so the indicator doesn't get stuck.
  useEffect(() => {
    if (!blocked) return;
    pullRef.current.pulling = false;
    pullRef.current.lastPhase = 'idle';
    setPhase('idle');
    setDy(0);
  }, [blocked]);

  return { phase, dy };
}
