'use client';

import { useState } from 'react';
import { useUIStore } from '@/hooks/uiStore';

export function SpeedDial() {
  const { recording } = useUIStore();
  const startRecording = useUIStore((s) => s.startRecording);
  const stopRecording = useUIStore((s) => s.stopRecording);
  const setRankOpen = useUIStore((s) => s.setRankOpen);
  const setModal = useUIStore((s) => s.setModal);
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <div className={`sd-scrim${open ? ' on' : ''}`} onClick={close} />
      <div className={`speeddial${open ? ' open' : ''}`}>
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
          onClick={() => (recording.active ? stopRecording() : setOpen(!open))}
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
