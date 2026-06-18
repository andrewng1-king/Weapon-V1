'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/hooks/uiStore';
import { useWeapon } from '@/hooks';
import { fmtClock } from '@/domain/format';
import { calForVals } from '@/domain/metrics';

export function Recorder() {
  const { recording, tickRecording, stopRecording, toggleMinimized } = useUIStore();
  const { state } = useWeapon();

  useEffect(() => {
    if (!recording.active) return;
    const id = setInterval(tickRecording, 1000);
    return () => clearInterval(id);
  }, [recording.active, tickRecording]);

  if (!recording.active && recording.elapsed === 0) return null;

  const bw = state?.bw ?? 75;
  const kcal = Math.round(recording.elapsed / 60 * 5);

  if (recording.minimized && recording.active) {
    return (
      <div className="recbar show" onClick={toggleMinimized}>
        <span><span className="rb-dot" />Recording</span>
        <b>{fmtClock(recording.elapsed)}</b>
        <span>{kcal} kcal</span>
      </div>
    );
  }

  if (!recording.active && recording.elapsed > 0) {
    return null;
  }

  return (
    <div className="recfull open">
      <div className="rf-top">
        <div className="rf-live"><span className="rf-dot" />Live</div>
        <button className="rf-min" onClick={toggleMinimized}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          Minimize
        </button>
      </div>

      <div className="rf-time">{fmtClock(recording.elapsed)}</div>

      <div className="rf-metrics">
        <div className="rf-metric"><b>{kcal}</b><span>kcal</span></div>
        <div className="rf-metric"><b>{recording.logs.length}</b><span>sets</span></div>
      </div>

      <div className="rf-tools">
        <button className="rf-tool" onClick={() => useUIStore.getState().setModal('recExercise')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          LOG
        </button>
      </div>

      <button className="rf-stop" onClick={stopRecording} aria-label="Stop recording" />
    </div>
  );
}
