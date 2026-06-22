'use client';

import { useEffect, useRef, useState } from 'react';
import { useWeapon } from '@/hooks';
import { useUIStore } from '@/hooks/uiStore';

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  startTopFrac: number;
  moved: boolean;
}

const DRAG_THRESHOLD_PX = 6;

/**
 * Speed Dial — port of legacy `.speeddial` block.
 *
 * Behaviour ported from `_legacy/index.html`:
 *  - Vertical FAB pinned to either left or right edge (`edge-left` / `edge-right`).
 *  - Long-press-free direct drag: pointer-down + move > 6px → drag mode.
 *  - On release, snap to nearest edge and persist `state.fab` so position
 *    survives reload.
 *  - Tap (no drag) toggles the action menu.
 *  - Quick actions: Record / Challenges / Friends → hub tabs.
 *    Recording in progress → FAB becomes a stop button (no menu).
 */
export function SpeedDial() {
  const { state, setFab } = useWeapon();
  const recording = useUIStore((s) => s.recording);
  const startRecording = useUIStore((s) => s.startRecording);
  const stopRecording = useUIStore((s) => s.stopRecording);
  const openCompete = useUIStore((s) => s.openCompete);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<DragState>({
    active: false,
    startX: 0,
    startY: 0,
    startTopFrac: 0.5,
    moved: false,
  });
  const fab = state?.fab ?? { side: 'right' as const, y: 0.74 };
  const [livePos, setLivePos] = useState<{ side: 'left' | 'right'; y: number }>(fab);

  // Sync local position when persisted `fab` changes (e.g. reload).
  useEffect(() => {
    if (!drag.current.active) setLivePos(fab);
  }, [fab.side, fab.y]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() { setOpen(false); }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (recording.active) return; // recording = no drag, just stop on tap
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTopFrac: livePos.y,
      moved: false,
    };
    try { fabRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      drag.current.moved = true;
      setDragging(true);
      if (open) setOpen(false);
    }
    if (!drag.current.moved) return;
    const h = window.innerHeight;
    const nextY = Math.max(0.05, Math.min(0.92, drag.current.startTopFrac + dy / h));
    const nextSide: 'left' | 'right' = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
    setLivePos({ side: nextSide, y: nextY });
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.moved) {
      setDragging(false);
      setFab(livePos);
    } else {
      // Tap — toggle menu (or stop recording, handled in onClick fallback).
      if (!recording.active) setOpen((v) => !v);
    }
  }

  function onActionRecord() { startRecording(); close(); }
  function onActionChallenges() { openCompete('challenges'); close(); }
  function onActionFriends() { openCompete('crews'); close(); }

  // Position style — `top` derived from y-fraction (avoids both `bottom` +
  // `top` fighting); `bottom` left to CSS default for safe-area handling.
  const top = `${(livePos.y * 100).toFixed(2)}%`;
  const sideClass = livePos.side === 'left' ? 'edge-left' : 'edge-right';

  return (
    <>
      <div className={`sd-scrim${open ? ' show' : ''}`} onClick={close} />
      <div
        ref={containerRef}
        className={`speeddial ${sideClass}${open ? ' open' : ''}${dragging ? ' dragging' : ''}`}
        style={{ top, bottom: 'auto' }}
      >
        <div className="sd-options">
          <button type="button" className="sd-opt" onClick={onActionRecord}>
            <span className="sd-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
              </svg>
            </span>
            Record
          </button>
          <button type="button" className="sd-opt" onClick={onActionChallenges}>
            <span className="sd-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4h10v3a5 5 0 0 1-10 0z" />
                <path d="M5 4H3v1.5A3.5 3.5 0 0 0 6.5 9M19 4h2v1.5A3.5 3.5 0 0 1 17.5 9M12 12v3.5M9 20h6M9.5 20l.6-4.5h3.8l.6 4.5" />
              </svg>
            </span>
            Challenges
          </button>
          <button type="button" className="sd-opt" onClick={onActionFriends}>
            <span className="sd-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
                <path d="M16.5 5.2a3 3 0 0 1 0 5.6M17.5 14a5.5 5.5 0 0 1 3 4.5" />
              </svg>
            </span>
            Friends
          </button>
        </div>
        <button
          ref={fabRef}
          type="button"
          className={`sd-fab${open ? ' open' : ''}${recording.active ? ' recording' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={() => { if (recording.active) stopRecording(); }}
          aria-label={recording.active ? 'Stop recording' : 'Quick actions'}
        >
          {recording.active ? (
            <span className="sd-sign">■</span>
          ) : (
            <>
              <svg className="sd-bolt" viewBox="0 0 28 44" aria-hidden="true">
                <path d="M17.5 0 1.5 26.5H11L8.5 44 26.5 16H16.5L21.5 0Z" />
              </svg>
              <span className="sd-label">Actions</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
