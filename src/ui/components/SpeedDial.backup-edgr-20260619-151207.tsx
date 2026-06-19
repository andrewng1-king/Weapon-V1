'use client';

import { useState } from 'react';
import { useUIStore } from '@/hooks/uiStore';

export function SpeedDial() {
  const { recording } = useUIStore();
  const startRecording = useUIStore((s) => s.startRecording);
  const stopRecording = useUIStore((s) => s.stopRecording);
  const [open, setOpen] = useState(false);

  return (
    <div className={`speeddial${open ? ' open' : ''}`}>
      <div className="sd-options">
        <button className="sd-opt" onClick={() => { startRecording(); setOpen(false); }}>
          <span className="sd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6" /></svg></span>
          Record
        </button>
        <button className="sd-opt" onClick={() => setOpen(false)}>
          <span className="sd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></span>
          Friends
        </button>
      </div>
      <button className={`sd-fab${recording.active ? ' recording' : ''}`} onClick={() => recording.active ? stopRecording() : setOpen(!open)}>
        <span className="sd-sign">{recording.active ? '■' : '+'}</span>
      </button>
    </div>
  );
}
