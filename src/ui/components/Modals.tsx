'use client';

import { useState, useEffect } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { GROUPS, MAXLVL, STR_RANKS } from '@/domain';
import type { Group, PresetExercise } from '@/domain/types';
import { exercisesFor, groupOf } from '@/domain/catalogue';
import { calForVals } from '@/domain/metrics';
import { todayStr, fmtDate, fmtK } from '@/domain/format';
import { createLogEntry } from '@/application/workoutUsecases';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

/** Mini exercise logger surfaced from the live-recording overlay (legacy recExModal). */
function RecExerciseModal() {
  const { state, logExercise } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);
  const vals = useUIStore((s) => s.vals);
  const setVal = useUIStore((s) => s.setVal);
  const addRecordingLog = useUIStore((s) => s.addRecordingLog);
  const curGroup = useUIStore((s) => s.group);
  const [recGroup, setRecGroup] = useState<Group>(curGroup);

  if (!state) return null;
  const bucket = state[state.mode];
  const today = todayStr();
  const exs = exercisesFor(recGroup, bucket);

  function recLog(ex: PresetExercise) {
    const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
    logExercise(createLogEntry(v.kg, v.reps, ex.n));
    addRecordingLog(ex.n);
    haptic([12, 28, 12]);
  }

  return (
    <div className="modal-bg recsub open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>Log exercise</h3>
        <div className="rex-groups">
          {GROUPS.map((g) => (
            <button key={g} className={`rex-gbtn${g === recGroup ? ' on' : ''}`} onClick={() => setRecGroup(g)}>{g}</button>
          ))}
        </div>
        {exs.map((ex) => {
          const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
          const todayN = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
          return (
            <div key={ex.n} className="rex-row">
              <div className="rex-name">{ex.n}{todayN ? <span className="rex-done"> ✓</span> : ''}</div>
              <div className="rex-ctl">
                <div className="stepper">
                  <button onClick={() => setVal(ex.n, Math.max(0, v.kg - 2.5), v.reps)}>−</button>
                  <div className="val"><input type="number" value={v.kg} onChange={(e) => setVal(ex.n, +e.target.value, v.reps)} /><span className="unit">kg</span></div>
                  <button onClick={() => setVal(ex.n, v.kg + 2.5, v.reps)}>+</button>
                </div>
                <div className="stepper">
                  <button onClick={() => setVal(ex.n, v.kg, Math.max(1, v.reps - 1))}>−</button>
                  <div className="val"><input type="number" value={v.reps} onChange={(e) => setVal(ex.n, v.kg, +e.target.value)} /><span className="unit">reps</span></div>
                  <button onClick={() => setVal(ex.n, v.kg, v.reps + 1)}>+</button>
                </div>
                <button className="rex-log" onClick={() => recLog(ex)}>Log</button>
              </div>
            </div>
          );
        })}
        <div className="mrow"><button className="m-save" onClick={() => setModal(null)}>Done</button></div>
      </div>
    </div>
  );
}

/** History calendar opened from the menu drawer (legacy calModal). */
function CalendarModal() {
  const { state } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);
  const today = todayStr();
  const now = new Date(today + 'T00:00:00');
  const [cal, setCal] = useState({ y: now.getFullYear(), m: now.getMonth(), sel: today as string | null });

  if (!state) return null;
  const logs = state[state.mode].logs;
  const bw = state.bw;
  const loggedDates = new Set(logs.map((l) => l.date));
  const startDow = (new Date(cal.y, cal.m, 1).getDay() + 6) % 7;
  const days = new Date(cal.y, cal.m + 1, 0).getDate();
  const dows = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function nav(step: number) {
    let m = cal.m + step;
    let y = cal.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCal({ ...cal, y, m });
  }

  const cells: { ds: string; day: number }[] = [];
  for (let day = 1; day <= days; day++) {
    const ds = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ ds, day });
  }

  const detList = cal.sel ? logs.filter((l) => l.date === cal.sel) : [];
  const detVol = detList.reduce((a, l) => a + l.kg * l.reps * l.sets, 0);
  const detCal = detList.reduce((a, l) => a + calForVals(l.kg, l.reps, l.sets, bw), 0);
  const detGroups = [...new Set(detList.map((l) => groupOf(l.ex)).filter(Boolean))].join(' · ');

  return (
    <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>History</h3>
        <div className="cal-head">
          <button type="button" onClick={() => nav(-1)} aria-label="Previous month">‹</button>
          <span className="cal-title">{MONTHS[cal.m]} {cal.y}</span>
          <button type="button" onClick={() => nav(1)} aria-label="Next month">›</button>
        </div>
        <div className="cal-grid">
          {dows.map((d, i) => <div key={`dow-${i}`} className="cal-dow">{d}</div>)}
          {Array.from({ length: startDow }).map((_, i) => <div key={`pad-${i}`} className="cal-cell empty" />)}
          {cells.map(({ ds, day }) => {
            const cls = ['cal-cell'];
            if (loggedDates.has(ds)) cls.push('trained');
            if (ds === today) cls.push('today');
            if (ds === cal.sel) cls.push('sel');
            return <div key={ds} className={cls.join(' ')} onClick={() => setCal({ ...cal, sel: ds })}>{day}</div>;
          })}
        </div>
        <div className="cal-detail">
          {!cal.sel ? (
            <div className="empty" style={{ padding: '10px 0' }}>Tap a day to see its log</div>
          ) : detList.length === 0 ? (
            <>
              <div className="day-sum">{fmtDate(cal.sel)}</div>
              <div className="empty" style={{ padding: '12px 0' }}>No training logged this day</div>
            </>
          ) : (
            <>
              <div className="day-sum">{fmtDate(cal.sel)} — {detGroups || '—'} · {fmtK(detVol)} kg · {Math.round(detCal)} kcal · {detList.length} lifts</div>
              {detList.map((l) => (
                <div key={l.id} className="rec-row"><span className="rx-ex">{l.ex}</span><span className="rx-meta">{l.reps} reps @ {l.kg} kg</span></div>
              ))}
            </>
          )}
        </div>
        <div className="mrow"><button className="m-save" onClick={() => setModal(null)}>Close</button></div>
      </div>
    </div>
  );
}

export function Modals() {
  const { state, addCustomExercise, saveProfile, setBw } = useWeapon();
  const { modal, setModal } = useUIStore();
  const group = useUIStore((s) => s.group);

  const [exName, setExName] = useState('');
  const [exTarget, setExTarget] = useState('');

  const [pName, setPName] = useState('');
  const [pJob, setPJob] = useState('');
  const [pBio, setPBio] = useState('');
  const [pBw, setPBw] = useState('');
  const [pSpotify, setPSpotify] = useState('');

  if (!state) return null;

  function handleAddExercise() {
    if (!exName.trim()) return;
    addCustomExercise({ n: exName.trim(), g: group, t: exTarget.trim(), start: 0 });
    setExName(''); setExTarget(''); setModal(null);
  }

  function handleSaveProfile() {
    saveProfile({ name: pName || undefined, job: pJob || undefined, bio: pBio || undefined, spotify: pSpotify || undefined });
    if (pBw) setBw(+pBw);
    setModal(null);
  }

  useEffect(() => {
    if (modal === 'settings') {
      setPName(state?.profile.name ?? '');
      setPJob(state?.profile.job ?? '');
      setPBio(state?.profile.bio ?? '');
      setPBw(String(state?.bw ?? 75));
      setPSpotify(state?.profile.spotify ?? '');
    }
  }, [modal]);

  return (
    <>
      {/* Add Exercise Modal */}
      {modal === 'addExercise' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>Add exercise to {group}</h3>
            <label>Name</label>
            <input value={exName} onChange={(e) => setExName(e.target.value)} placeholder="e.g. Incline Fly" />
            <label>Target muscles</label>
            <input value={exTarget} onChange={(e) => setExTarget(e.target.value)} placeholder="e.g. Upper chest" />
            <div className="mrow">
              <button className="m-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="m-save" onClick={handleAddExercise}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {modal === 'settings' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>Profile settings</h3>
            <div className="set-section">
              <label>Name</label>
              <input value={pName} onChange={(e) => setPName(e.target.value)} />
              <label>Title / Job</label>
              <input value={pJob} onChange={(e) => setPJob(e.target.value)} />
              <label>Bodyweight (kg)</label>
              <input type="number" value={pBw} onChange={(e) => setPBw(e.target.value)} />
              <label>Bio</label>
              <input value={pBio} onChange={(e) => setPBio(e.target.value)} />
              <label>Spotify Track ID</label>
              <input value={pSpotify} onChange={(e) => setPSpotify(e.target.value)} placeholder="e.g. 3n3Ppam7vgaVa1iaRUc9Lp" />
            </div>
            <div className="mrow">
              <button className="m-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="m-save" onClick={handleSaveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Ranks Modal */}
      {modal === 'ranks' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>All ranks</h3>
            <div className="ranks-list">
              {STR_RANKS.map((name, i) => {
                const lvl = i + 1;
                const isCur = lvl === (state.dev.on ? state.dev.lvl : undefined);
                return (
                  <div key={name} className={`rank-line${isCur ? ' cur' : ''}`}>
                    <span className="rl-lv">{lvl}</span>
                    <span className="rl-name">{name}</span>
                    {isCur && <span className="rl-tag">YOU</span>}
                  </div>
                );
              })}
            </div>
            <div className="mrow"><button className="m-cancel" onClick={() => setModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Planner Placeholder */}
      {modal === 'planner' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="planner-soon">
              <div className="planner-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg></div>
              <div className="planner-title">Workout planner</div>
              <div className="planner-sub">Plan your training week. Coming soon.</div>
            </div>
            <div className="mrow"><button className="m-cancel" onClick={() => setModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Mini exercise logger (from live recording) */}
      {modal === 'recExercise' && <RecExerciseModal />}

      {/* History calendar */}
      {modal === 'calendar' && <CalendarModal />}
    </>
  );
}
