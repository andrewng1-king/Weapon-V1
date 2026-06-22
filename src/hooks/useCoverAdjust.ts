'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Long-press + drag to reposition an `idc-cover` background image.
 *
 * Ported from legacy `attachCoverAdjust`:
 *  - Pointer-down starts a 420ms hold timer.
 *  - When the timer fires, we enter "adjusting" mode (visual class + capture)
 *    and translate subsequent pointer-move deltas into background-position %.
 *  - Pointer-up commits the new position (only if we were adjusting) and
 *    clears the hold timer otherwise.
 *
 * The hook returns:
 *  - `coverRef`: attach to the `<div class="idc-cover">` element.
 *  - `position`: current background-position string (live during drag).
 *  - `adjusting`: true while the user is actively repositioning.
 *
 * The `onCommit` callback fires once per gesture, after the user releases
 * while in adjusting mode. Pass `null`/`undefined` for `coverUrl` to fully
 * disable the gesture (matches legacy behaviour for empty covers).
 */
export function useCoverAdjust(
  coverUrl: string | null | undefined,
  savedPos: string | undefined,
  onCommit: (pos: string) => void,
) {
  const coverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<string>(savedPos ?? '50% 40%');
  const [adjusting, setAdjusting] = useState(false);

  // Latest `onCommit` ref — listeners read it lazily so callers don't need
  // a stable callback identity.
  const commitRef = useRef(onCommit);
  useEffect(() => { commitRef.current = onCommit; }, [onCommit]);

  // Keep local state in sync if the saved position changes (e.g. after
  // loading a different profile). We deliberately ignore updates while the
  // user is actively dragging to avoid clobbering the live preview.
  useEffect(() => {
    if (adjusting) return;
    setPosition(savedPos ?? '50% 40%');
  }, [savedPos, adjusting]);

  useEffect(() => {
    const cov = coverRef.current;
    if (!cov || !coverUrl) return;

    let holdT: number | null = null;
    let active = false;
    let startX = 0;
    let startY = 0;
    let startPos = parsePos(position);
    let live = position;

    function parsePos(s: string): { x: number; y: number } {
      const m = String(s).split(' ');
      return { x: parseFloat(m[0]) || 50, y: parseFloat(m[1]) || 40 };
    }

    function onDown(e: PointerEvent) {
      holdT = window.setTimeout(() => {
        active = true;
        setAdjusting(true);
        startPos = parsePos(live);
        startX = e.clientX;
        startY = e.clientY;
        try { cov!.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
      }, 420);
    }
    function onMove(e: PointerEvent) {
      if (!active) return;
      e.preventDefault();
      const nx = clamp01(startPos.x - (e.clientX - startX) / 3);
      const ny = clamp01(startPos.y - (e.clientY - startY) / 3);
      live = `${nx.toFixed(0)}% ${ny.toFixed(0)}%`;
      setPosition(live);
    }
    function endAdj() {
      if (holdT != null) { clearTimeout(holdT); holdT = null; }
      if (active) {
        active = false;
        setAdjusting(false);
        commitRef.current(live);
      }
    }
    function onLeave() {
      if (holdT != null && !active) { clearTimeout(holdT); holdT = null; }
    }

    cov.addEventListener('pointerdown', onDown);
    cov.addEventListener('pointermove', onMove);
    cov.addEventListener('pointerup', endAdj);
    cov.addEventListener('pointercancel', endAdj);
    cov.addEventListener('pointerleave', onLeave);
    return () => {
      cov.removeEventListener('pointerdown', onDown);
      cov.removeEventListener('pointermove', onMove);
      cov.removeEventListener('pointerup', endAdj);
      cov.removeEventListener('pointercancel', endAdj);
      cov.removeEventListener('pointerleave', onLeave);
      if (holdT != null) clearTimeout(holdT);
    };
    // Listeners only need to be (re)bound when the cover element itself
    // gains/loses an image. `position` is read via the `live` closure var
    // and `onCommit` via `commitRef`, so churn from those does not require
    // re-binding mid-gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverUrl]);

  return { coverRef, position, adjusting };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, n));
}
