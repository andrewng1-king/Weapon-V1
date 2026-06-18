'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/hooks/uiStore';

export function RestBar() {
  const rest = useUIStore((s) => s.rest);
  const adjustRest = useUIStore((s) => s.adjustRest);
  const skipRest = useUIStore((s) => s.skipRest);
  const tickRest = useUIStore((s) => s.tickRest);

  useEffect(() => {
    if (!rest.active) return;
    const id = window.setInterval(() => tickRest(), 1000);
    return () => clearInterval(id);
  }, [rest.active, tickRest]);

  const m = Math.floor(rest.remaining / 60);
  const s = rest.remaining % 60;
  const label = `${m}:${String(s).padStart(2, '0')}`;

  return (
    <div className={`restbar${rest.active ? ' show' : ''}${rest.remaining === 0 && rest.active ? ' done' : ''}`}>
      <span className="rb-time">Rest {label}</span>
      <button type="button" onClick={() => adjustRest(-15)}>−15</button>
      <button type="button" onClick={() => adjustRest(15)}>+15</button>
      <button type="button" onClick={() => skipRest()}>Skip</button>
    </div>
  );
}
