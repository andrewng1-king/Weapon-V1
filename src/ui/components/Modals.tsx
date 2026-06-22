'use client';

import { useState, useEffect, useRef } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { STR_RANKS, allSportLogs, levelInfo, xpToReach } from '@/domain/ranks';
import type { PresetExercise } from '@/domain/types';
import { categoriesFor, exercisesFor, groupOfSport } from '@/domain/sports';
import { calForVals, volume } from '@/domain/metrics';
import { todayStr, fmtDate, fmtK, fmtClock } from '@/domain/format';
import { createLogEntry } from '@/application/workoutUsecases';
import { showToast } from './Toast';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

/**
 * Accept either a raw Spotify track ID (`3n3Ppam7vgaVa1iaRUc9Lp`) or a full
 * track URL — strip everything but the trailing ID. Returns `null` for empty
 * input.
 */
function parseSpotifyId(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const m = v.match(/track[/:]([A-Za-z0-9]+)/);
  if (m) return m[1];
  return v.split(/[?#]/)[0];
}

/** Mini exercise logger surfaced from the live-recording overlay (legacy recExModal). */
function RecExerciseModal() {
  const { state, logExercise } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);
  const vals = useUIStore((s) => s.vals);
  const setVal = useUIStore((s) => s.setVal);
  const addRecordingLog = useUIStore((s) => s.addRecordingLog);
  const curCategory = useUIStore((s) => s.category);
  const [recGroup, setRecGroup] = useState(curCategory);

  if (!state) return null;
  const sport = state.sport;
  const bucket = state.sports[sport];
  const cats = categoriesFor(sport);
  const today = todayStr();
  const exs = exercisesFor(sport, recGroup, bucket);

  function recLog(ex: PresetExercise) {
    const v = vals[ex.n] ?? { kg: ex.start, reps: 8 };
    logExercise(createLogEntry(ex, v, sport, state.setsPerEntry));
    addRecordingLog(ex.n);
    haptic([12, 28, 12]);
  }

  return (
    <div className="modal-bg recsub open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>Log exercise</h3>
        <div className="rex-groups">
          {cats.map((g) => (
            <button key={g} type="button" className={`rex-gbtn${g === recGroup ? ' on' : ''}`} onClick={() => setRecGroup(g)}>{g}</button>
          ))}
        </div>
        {exs.map((ex) => {
          const v = vals[ex.n] ?? { kg: ex.start, reps: 8 };
          const kg = v.kg ?? ex.start;
          const reps = v.reps ?? 8;
          const todayN = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
          return (
            <div key={ex.n} className="rex-row">
              <div className="rex-name">{ex.n}{todayN ? <span className="rex-done"> ✓</span> : ''}</div>
              <div className="rex-ctl">
                <div className="stepper">
                  <button type="button" onClick={() => setVal(ex.n, Math.max(0, kg - 2.5), reps)}>−</button>
                  <div className="val"><input type="number" value={kg} onChange={(e) => setVal(ex.n, +e.target.value, reps)} /><span className="unit">kg</span></div>
                  <button type="button" onClick={() => setVal(ex.n, kg + 2.5, reps)}>+</button>
                </div>
                <div className="stepper">
                  <button type="button" onClick={() => setVal(ex.n, kg, Math.max(1, reps - 1))}>−</button>
                  <div className="val"><input type="number" value={reps} onChange={(e) => setVal(ex.n, kg, +e.target.value)} /><span className="unit">reps</span></div>
                  <button type="button" onClick={() => setVal(ex.n, kg, reps + 1)}>+</button>
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
  const logs = allSportLogs(state);
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
  const detVol = detList.reduce((a, l) => a + volume(l), 0);
  const detCal = detList.reduce((a, l) => a + calForVals(l.kg ?? 0, l.reps ?? 0, l.sets, bw), 0);
  const detGroups = [...new Set(detList.map((l) => groupOfSport(state.sport, l.ex, state.sports[state.sport].custom)).filter(Boolean))].join(' · ');

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

/** Post-recording summary (legacy recSummary). */
function RecSummaryModal() {
  const { state } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);
  const recording = useUIStore((s) => s.recording);

  if (!state) return null;
  const mins = Math.floor(recording.elapsed / 60);
  const kcal = Math.round(recording.elapsed / 60 * 5);

  async function shareSession() {
    const lines = [
      `Session · ${fmtClock(recording.elapsed)}`,
      `${recording.logs.length} sets logged · ~${kcal} kcal`,
    ];
    if (recording.logs.length) lines.push(recording.logs.join(' · '));
    const text = lines.join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Session', text });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
        return;
      }
      showToast('Share not supported');
    } catch {
      // user-cancelled or platform error — silent
    }
  }

  return (
    <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="modal">
        <h3>Session complete</h3>
        <div className="rec-summary-grid">
          <div><b>{fmtClock(recording.elapsed)}</b><span>Duration</span></div>
          <div><b>{recording.logs.length}</b><span>Sets logged</span></div>
          <div><b>{kcal}</b><span>kcal est.</span></div>
          <div><b>{mins}</b><span>Minutes</span></div>
        </div>
        {recording.logs.length > 0 && (
          <div className="hint" style={{ marginTop: 12 }}>
            {recording.logs.join(' · ')}
          </div>
        )}
        <div className="mrow">
          <button type="button" className="m-cancel" onClick={shareSession}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -3, marginRight: 6 }}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
            Share
          </button>
          <button type="button" className="m-save" onClick={() => setModal(null)}>Done</button>
        </div>
      </div>
    </div>
  );
}

export function Modals() {
  const { state, addCustomExercise, saveProfile, setBw, uploadMedia, setDevMode } = useWeapon();
  const { modal, setModal } = useUIStore();
  const category = useUIStore((s) => s.category);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [exName, setExName] = useState('');
  const [exTarget, setExTarget] = useState('');

  const [pName, setPName] = useState('');
  const [pJob, setPJob] = useState('');
  const [pBio, setPBio] = useState('');
  const [pBw, setPBw] = useState('');
  const [pHeight, setPHeight] = useState('');
  const [pSpotify, setPSpotify] = useState('');

  if (!state) return null;

  function handleAddExercise() {
    if (!exName.trim()) return;
    addCustomExercise({ n: exName.trim(), g: category, t: exTarget.trim(), start: 0 });
    setExName(''); setExTarget(''); setModal(null);
    showToast('Exercise added');
  }

  async function handleMedia(kind: 'photo' | 'cover', file: File) {
    try {
      const url = await uploadMedia(kind, file);
      saveProfile({ [kind]: url });
      showToast('Image updated');
    } catch {
      showToast('Upload failed');
    }
  }

  function handleSaveProfile() {
    const heightNum = pHeight.trim() ? +pHeight : undefined;
    const spotifyId = parseSpotifyId(pSpotify);
    saveProfile({
      name: pName || undefined,
      job: pJob || undefined,
      bio: pBio || undefined,
      height: heightNum && !Number.isNaN(heightNum) ? heightNum : undefined,
      spotify: spotifyId || undefined,
    });
    if (pBw) setBw(+pBw);
    setModal(null);
  }

  useEffect(() => {
    if (modal === 'settings') {
      setPName(state?.profile.name ?? '');
      setPJob(state?.profile.job ?? '');
      setPBio(state?.profile.bio ?? '');
      setPBw(String(state?.bw ?? 75));
      setPHeight(state?.profile.height != null ? String(state.profile.height) : '');
      setPSpotify(state?.profile.spotify ?? '');
    }
  }, [modal]);

  return (
    <>
      {/* Add Exercise Modal */}
      {modal === 'addExercise' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>Add exercise to {category}</h3>
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
              <label>Photo</label>
              <input ref={photoRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMedia('photo', f); }} />
              <label>Cover</label>
              <input ref={coverRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMedia('cover', f); }} />
              <label>Name</label>
              <input value={pName} onChange={(e) => setPName(e.target.value)} />
              <label>Title / Job</label>
              <input value={pJob} onChange={(e) => setPJob(e.target.value)} />
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>Bodyweight (kg)</label>
                  <input type="number" inputMode="decimal" value={pBw} onChange={(e) => setPBw(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Height (cm)</label>
                  <input type="number" inputMode="numeric" value={pHeight} onChange={(e) => setPHeight(e.target.value)} placeholder="e.g. 175" />
                </div>
              </div>
              <label>Bio</label>
              <input value={pBio} onChange={(e) => setPBio(e.target.value)} />
              <label>Spotify track URL or ID</label>
              <input
                value={pSpotify}
                onChange={(e) => setPSpotify(e.target.value)}
                placeholder="https://open.spotify.com/track/… or 3n3Ppam7vgaVa1iaRUc9Lp"
              />
            </div>
            <div className="mrow">
              <button className="m-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="m-save" onClick={handleSaveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Ranks Modal */}
      {modal === 'ranks' && (() => {
        const realLvl = levelInfo(allSportLogs(state)).lvl;
        const curLvl = state.dev.on ? state.dev.lvl : realLvl;

        function onRankClick(lvl: number) {
          // Click a rank → enter dev preview at that level (legacy: rank
          // ladder rows are tappable as a quick dev shortcut).
          setDevMode(true, lvl);
          showToast(`Previewing Lv ${lvl} · ${STR_RANKS[lvl - 1]}`);
        }

        return (
          <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
            <div className="modal">
              <h3>All ranks</h3>
              <div className="ranks-list">
                {STR_RANKS.map((name, i) => {
                  const lvl = i + 1;
                  const isCur = lvl === curLvl;
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`rank-line${isCur ? ' cur' : ''}`}
                      onClick={() => onRankClick(lvl)}
                    >
                      <span className="rl-lv">{lvl}</span>
                      <span className="rl-name">{name}</span>
                      {isCur
                        ? <span className="rl-tag">YOU</span>
                        : <span className="rl-tag" style={{ color: 'var(--faint)' }}>{fmtK(xpToReach(lvl))} XP</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mrow"><button className="m-cancel" onClick={() => setModal(null)}>Close</button></div>
            </div>
          </div>
        );
      })()}

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

      {modal === 'recSummary' && <RecSummaryModal />}

      {/* History calendar */}
      {modal === 'calendar' && <CalendarModal />}
    </>
  );
}
