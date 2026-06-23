'use client';

import { useState, useRef, useEffect, type CSSProperties, type PointerEvent } from 'react';
import { useUIStore } from '@/hooks/uiStore';

const FAB_SIZE = 48;
const STORAGE_KEY = 'weapon:fab';

type FabPos = { side: 'left' | 'right'; y: number };

function loadPos(): FabPos {
  if (typeof window === 'undefined') return { side: 'right', y: 0.5 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if ((p.side === 'left' || p.side === 'right') && typeof p.y === 'number') {
        return { side: p.side, y: Math.max(0, Math.min(1, p.y)) };
      }
    }
  } catch {}
  return { side: 'right', y: 0.5 };
}

function savePos(p: FabPos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export function SpeedDial() {
  const recording = useUIStore((s) => s.recording);
  const startRecording = useUIStore((s) => s.startRecording);
  const stopRecording = useUIStore((s) => s.stopRecording);
  const setRankOpen = useUIStore((s) => s.setRankOpen);
  const setModal = useUIStore((s) => s.setModal);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<FabPos>({ side: 'right', y: 0.5 });
  const [mounted, setMounted] = useState(false);

  const sdRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, sx: 0, sy: 0, x: 0, y: 0 });

  // load saved position after mount (avoid SSR/hydration mismatch) + recompute on resize
  useEffect(() => {
    setPos(loadPos());
    setMounted(true);
    const onResize = () => setPos((p) => ({ ...p }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const close = () => setOpen(false);

  const bounds = () => ({ minY: 64, maxY: Math.max(120, window.innerHeight - 150) });

  const style: CSSProperties | undefined = (() => {
    if (!mounted || typeof window === 'undefined') return undefined;
    const { minY, maxY } = bounds();
    const yTop = Math.round(minY + pos.y * (maxY - minY));
    const appW = Math.min(window.innerWidth, 480);
    const sideMargin = Math.max(0, (window.innerWidth - appW) / 2);
    const bottom = Math.round(window.innerHeight - (yTop + FAB_SIZE));
    return pos.side === 'right'
      ? { top: 'auto', bottom, right: sideMargin, left: 'auto' }
      : { top: 'auto', bottom, left: sideMargin, right: 'auto' };
  })();

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    drag.current = { down: true, moved: false, sx: e.clientX, sy: e.clientY, x: 0, y: 0 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      sdRef.current?.classList.add('dragging');
      setOpen(false);
    }
    if (d.moved) {
      if (e.cancelable) e.preventDefault();
      const { minY, maxY } = bounds();
      const x = Math.max(8, Math.min(window.innerWidth - FAB_SIZE - 8, e.clientX - FAB_SIZE / 2));
      const y = Math.max(minY, Math.min(maxY, e.clientY - FAB_SIZE / 2));
      d.x = x; d.y = y;
      const el = sdRef.current;
      if (el) {
        el.style.bottom = 'auto';
        el.style.top = `${y}px`;
        el.style.left = `${x}px`;
        el.style.right = 'auto';
      }
    }
  }

  function endDrag() {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (d.moved) {
      sdRef.current?.classList.remove('dragging');
      const cx = d.x + FAB_SIZE / 2;
      const side: 'left' | 'right' = cx > window.innerWidth / 2 ? 'right' : 'left';
      const { minY, maxY } = bounds();
      const y = Math.max(0, Math.min(1, (d.y - minY) / (maxY - minY)));
      const next: FabPos = { side, y };
      savePos(next);
      // clear transient inline styles so the computed style takes over on re-render
      const el = sdRef.current;
      if (el) { el.style.top = ''; el.style.bottom = ''; el.style.left = ''; el.style.right = ''; }
      setPos(next);
    } else if (recording.active) {
      stopRecording();
    } else {
      setOpen((o) => !o);
    }
  }

  const edgeClass = mounted ? (pos.side === 'right' ? ' edge-right' : ' edge-left') : '';

  return (
    <>
      <div className={`sd-scrim${open ? ' on' : ''}`} onClick={close} />
      <div ref={sdRef} className={`speeddial${edgeClass}${open ? ' open' : ''}`} style={style}>
        <div className="sd-options">
          <button className="sd-opt" onClick={() => { setRankOpen(true); close(); }}>
            <span className="sd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></span>
            Rank <span className="nu">NEW</span>
          </button>
          <button className="sd-opt" onClick={() => { startRecording(); close(); }}>
            <span className="sd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" /></svg></span>
            Record
          </button>
          <button className="sd-opt" onClick={() => { setModal('ranks'); close(); }}>
            <span className="sd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10v3a5 5 0 0 1-10 0z" /><path d="M5 4H3v1.5A3.5 3.5 0 0 0 6.5 9M19 4h2v1.5A3.5 3.5 0 0 1 17.5 9M12 12v3.5M9 20h6M9.5 20l.6-4.5h3.8l.6 4.5" /></svg></span>
            Challenges
          </button>
          <button className="sd-opt" onClick={close}>
            <span className="sd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16.5 5.2a3 3 0 0 1 0 5.6M17.5 14a5.5 5.5 0 0 1 3 4.5" /></svg></span>
            Friends
          </button>
        </div>
        <button
          className={`sd-fab${open ? ' open' : ''}${recording.active ? ' recording' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={() => { const d = drag.current; if (d.down) { d.down = false; if (d.moved) { sdRef.current?.classList.remove('dragging'); setPos((p) => ({ ...p })); } } }}
          aria-label="Quick actions"
        >
          {recording.active ? (
            <span className="sd-sign">■</span>
          ) : (
            <>
              <svg className="sd-bolt" viewBox="0 0 28 44" aria-hidden="true"><path d="M17.5 0 1.5 26.5H11L8.5 44 26.5 16H16.5L21.5 0Z" /></svg>
              <span className="sd-label">Actions</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
