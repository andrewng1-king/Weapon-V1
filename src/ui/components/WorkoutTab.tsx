'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import {
  categoriesFor,
  exercisesFor,
  exMetric,
  exU1,
  exU2,
  isWeightMetric,
} from '@/domain/sports';
import { todayStr, fmtDate } from '@/domain/format';
import type { PresetExercise, LogEntry } from '@/domain/types';
import { createLogEntry, bestE1RM } from '@/application/workoutUsecases';
import { e1rm } from '@/domain/ranks';
import { kgDisplay, kgCanonical, weightStep, platesFor, volume } from '@/domain/metrics';
import { showToast, showToastAction } from './Toast';

const nf = (n: number) => Math.round(n).toLocaleString('en-US');
const RING_CIRC = 125.66; // 2π × 20

function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

const SET_TYPES: { id: LogEntry['set_type']; label: string }[] = [
  { id: 'warm', label: 'Warm-up' },
  { id: 'work', label: 'Working' },
  { id: 'drop', label: 'Drop set' },
];

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

function BarbellIcon() {
  return (
    <>
      Last <b>{fmtLogVal(last, unit)}</b>
      {arrow}
      {cnt > 1 && <span className="trend-ref">{cnt} logged</span>}
    </>
  );
}

function MTile({ color, sm }: { color?: string; sm?: boolean }) {
  return (
    <div className="platebar">
      <span className="pb-lab">Per side</span>
      {plates.map((p, i) => (
        <span key={i} className="pb-chip">{unit === 'lb' ? kgDisplay(p, 'lb') : p}</span>
      ))}
      <span className="pb-bar">+ {barDisp} bar</span>
    </div>
  );
}

export function WorkoutTab() {
  const { state, logExercise, deleteLog, removeExercise, setOrder } = useWeapon();
  const sport = state.sport;
  const bucket = state.sports[sport];
  const cats = categoriesFor(sport);
  const category = useUIStore((s) => s.category);
  const setCategory = useUIStore((s) => s.setCategory);
  const { searchOpen, searchQuery, toggleSearch, setSearchQuery, vals, setVal, pending, setPending, clearPendingNote, startRest, wkPage, setWkPage } = useUIStore();
  const setModal = useUIStore((s) => s.setModal);

  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [wkPage, setWkPage] = useState<'workout' | 'history'>('workout');
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [displayVol, setDisplayVol] = useState(0);
  const [floaters, setFloaters] = useState<{ id: string; text: string }[]>([]);
  const volTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // cleanup timer on unmount
  useEffect(() => {
    return () => { if (volTimerRef.current) clearInterval(volTimerRef.current); };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const wt = (e.target as HTMLElement).closest('.wk-top');
      if (wt) return;
      setGroupMenuOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // exercise list (unchanged logic)
  let exercises: (PresetExercise & { group?: Group })[] = [];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    cats.forEach((g) => {
      exercisesFor(sport, g, bucket).forEach((e) => {
        if (e.n.toLowerCase().includes(q) || e.t.toLowerCase().includes(q)) exercises.push({ ...e, group: g });
      });
    });
  } else {
    exercises = exercisesFor(sport, category, bucket);
  }

  // split into active / logged
  const activeExercises = exercises.filter((e) => !isLoggedToday(bucket, e.n));
  const loggedExercises = exercises.filter((e) => isLoggedToday(bucket, e.n));
  const total = exercises.length;
  const loggedCount = loggedExercises.length;
  const pct = total > 0 ? (loggedCount / total) * 100 : 0;
  const remaining = total - loggedCount;
  const ringOffset = RING_CIRC * (1 - loggedCount / Math.max(1, total));

  // today's volume from real data
  const todayLogs = bucket.logs.filter((l) => l.date === today);
  const todayVol = todayLogs.reduce((s, l) => s + l.kg * l.reps * l.sets, 0);

  // sync displayVol to real data when bucket updates (no active tween)
  useEffect(() => {
    if (!volTimerRef.current) setDisplayVol(todayVol);
  }, [todayVol]);

  // which card is focused (expanded)
  const focusedId = (() => {
    if (expandedId && activeExercises.some((e) => e.n === expandedId)) return expandedId;
    return activeExercises[0]?.n ?? null;
  })();

  // reset focus when group/search changes
  useEffect(() => {
    setExpandedId(null);
  }, [group, searchQuery]);

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const weekVol = bucket.logs.filter((l) => l.date >= weekAgo).reduce((s, l) => s + l.kg * l.reps * l.sets, 0);

  function tweenVol(target: number) {
    if (prefersReduced()) { setDisplayVol(target); return; }
    if (volTimerRef.current) clearInterval(volTimerRef.current);
    const from = displayVol;
    const start = Date.now();
    const dur = 650;
    volTimerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayVol(Math.round(from + (target - from) * ease));
      if (p >= 1) { clearInterval(volTimerRef.current!); volTimerRef.current = null; }
    }, 16);
  }

  function handleLog(ex: PresetExercise) {
    const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
    const done = isLoggedToday(bucket, ex.n);

    if (done) {
      haptic(18);
      const todayLog = bucket.logs.find((l) => l.ex === ex.n && l.date === today);
      if (todayLog) deleteLog(todayLog.id);
      tweenVol(Math.max(0, todayVol - v.kg * v.reps));
    } else {
      haptic([12, 28, 12]);
      const log = createLogEntry(v.kg, v.reps, ex.n);
      logExercise(log);

      if (!prefersReduced()) {
        // volt wipe + stamp
        setJustLogged(ex.n);
        window.setTimeout(() => setJustLogged((cur) => (cur === ex.n ? null : cur)), 700);
        // +XP floater
        const xp = 18 + Math.round((v.kg * v.reps) / 35);
        const fid = 'f' + Date.now();
        setFloaters((fs) => [...fs, { id: fid, text: `+${xp} XP` }]);
        setTimeout(() => setFloaters((fs) => fs.filter((f) => f.id !== fid)), 900);
      }

      // advance focus to next unlogged
      const next = activeExercises.find((e) => e.n !== ex.n);
      if (next) setExpandedId(next.n);

      // animate volume
      tweenVol(todayVol + v.kg * v.reps);
    }
    return { v1: v?.v1 ?? ex.start, v2: v?.v2 ?? 0, kg: v?.kg, reps: v?.reps };
  }

  function bump(ex: PresetExercise, field: 'v1' | 'v2' | 'kg' | 'reps', delta: number) {
    const cur = defaultVals(ex);
    if (field === 'kg') setVal(ex.n, { ...cur, kg: Math.max(0, (cur.kg ?? 0) + delta) });
    else if (field === 'reps') setVal(ex.n, { ...cur, reps: Math.max(1, (cur.reps ?? 1) + delta) });
    else if (field === 'v1') setVal(ex.n, { ...cur, v1: Math.max(0, (cur.v1 ?? 0) + delta) });
    else setVal(ex.n, { ...cur, v2: Math.max(0, (cur.v2 ?? 0) + delta) });
  }

  function quickFill(ex: PresetExercise, e: React.MouseEvent) {
    e.stopPropagation();
    const ll = lastLog(bucket, ex.n);
    if (!ll) return;
    const cur = defaultVals(ex);
    if (isWeightMetric(ex, sport)) {
      setVal(ex.n, { ...cur, kg: ll.kg ?? ll.v1 ?? ex.start, reps: ll.reps ?? 8 });
    } else {
      setVal(ex.n, { ...cur, v1: ll.v1 ?? ex.start, v2: ll.v2 ?? 0 });
    }
    haptic(8);
  }

  function playLogAnim(card: HTMLElement | null) {
    if (!card) return;
    card.classList.remove('logged-anim');
    void card.offsetWidth;
    card.classList.add('logged-anim');
  }

  function handleLog(ex: PresetExercise, e: React.MouseEvent<HTMLButtonElement>) {
    const reduce = prefersReduced();
    if (!reduce && e.currentTarget) {
      const btn = e.currentTarget;
      btn.classList.remove('swipe', 'done');
      void btn.offsetWidth;
      btn.classList.add('swipe', 'done');
      playLogAnim(btn.closest('.ex') as HTMLElement | null);
    }

    const v = defaultVals(ex);
    const pend = pending[ex.n] ?? {};
    const log = createLogEntry(ex, v, sport, state.setsPerEntry, {
      set_type: pend.set_type ?? 'work',
      rpe: pend.rpe,
      note: pend.note,
    });

    const metric = exMetric(ex, sport);
    let isPr = false;
    if (metric === 'weight' && log.set_type !== 'warm') {
      const prev = bestE1RM(bucket.logs, ex.n);
      const cur = e1rm(log.kg ?? 0, log.reps ?? 0);
      if (cur > prev && cur > 0) isPr = true;
    }

    haptic(isPr ? [14, 30, 14, 30, 55] : [12, 28, 12]);
    if (isPr && !reduce) {
      setPrFlash(ex.n);
      window.setTimeout(() => setPrFlash(null), 900);
    }

    logExercise(log);
    clearPendingNote(ex.n);

    const wlabel = fmtLogVal(log, unit);
    if (isPr) showToast(`★ New PR · ${ex.n} · ${wlabel}`);
    else showToastAction(`Logged ${ex.n} · ${wlabel}`, 'Undo', () => deleteLog(log.id));

    if (metric !== 'dist' && metric !== 'time') startRest(state.restDefault);
  }

  function undoLast(exName: string, e: React.MouseEvent) {
    e.stopPropagation();
    const todayLogs = bucket.logs.filter((l) => l.ex === exName && l.date === today);
    let removeId: string | undefined;
    if (todayLogs.length) removeId = todayLogs[todayLogs.length - 1].id;
    else {
      const all = logsFor(bucket, exName);
      if (all.length) removeId = all[all.length - 1].id;
    }
    if (!removeId) return;
    deleteLog(removeId);
    haptic(16);
    showToast(`${exName} · last set undone`);
  }

  function toggleDetail(exName: string) {
    setOpenDetail((cur) => (cur === exName ? null : exName));
  }

  function startDrag(e: React.PointerEvent, name: string) {
    if (searchQuery) return;
    const card = (e.currentTarget as HTMLElement).closest('.ex') as HTMLElement | null;
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = card.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('drag-ghost');
    ghost.removeAttribute('data-ex');
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;
    document.body.classList.add('dragging-active');
    setDraggingName(name);

    const onMove = (ev: PointerEvent) => {
      const g = dragGhostRef.current;
      if (g) {
        g.style.left = `${ev.clientX - offsetX}px`;
        g.style.top = `${ev.clientY - offsetY}px`;
      }
      const over = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('.ex[data-ex]') as HTMLElement | null;
      const targetName = over?.dataset.ex;
      if (!over || !targetName || targetName === name) return;
      const main = over.closest('main');
      if (!main) return;
      const names = Array.from(main.querySelectorAll<HTMLElement>('.ex[data-ex]'))
        .map((c) => c.dataset.ex)
        .filter((n): n is string => !!n);
      const from = names.indexOf(name);
      const to = names.indexOf(targetName);
      if (from < 0 || to < 0 || from === to) return;
      names.splice(from, 1);
      names.splice(to, 0, name);
      setOrder(category, names);
    };

    const onEnd = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      const g = dragGhostRef.current;
      if (g?.parentNode) g.parentNode.removeChild(g);
      dragGhostRef.current = null;
      document.body.classList.remove('dragging-active');
      setDraggingName(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  const sessionDates = [...new Set(bucket.logs.map((l) => l.date))].sort().reverse();

  return (
    <>
      <div className="wk-seg">
        <button type="button" className={wkPage === 'workout' ? 'on' : ''} onClick={() => setWkPage('workout')}>Workout</button>
        <button type="button" className={wkPage === 'history' ? 'on' : ''} onClick={() => setWkPage('history')}>History</button>
      </div>

      {wkPage === 'workout' ? (
        <>
          <div className="wk-head">
            <div className="wk-top">
              <button type="button" className={`group-dd${groupMenuOpen ? ' open' : ''}`} onClick={() => setGroupMenuOpen(!groupMenuOpen)}>
                <span>{category}</span>
                <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {groupMenuOpen && (
                <div className="group-menu open">
                  {cats.map((g) => (
                    <button key={g} type="button" className={g === category ? 'on' : ''} onClick={() => { setCategory(g); setGroupMenuOpen(false); }}>{g}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className={`wk-search-btn${searchOpen ? ' on' : ''}`} onClick={toggleSearch} aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.2-4.2" /></svg>
            </button>
          </div>

          {searchOpen && (
            <div className="wk-searchbar open">
              <input type="search" placeholder="Search all exercises…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          )}

          <main>
            {/* ── SESSION HERO ── */}
            <div className="wk-session-hero">
              <div className="wsh-ring-wrap">
                <svg viewBox="0 0 56 56" width="60" height="60">
                  <circle cx="28" cy="28" r="20" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="6" />
                  <circle
                    cx="28" cy="28" r="20"
                    fill="none" stroke="var(--accent)" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <div className="wsh-ring-label">{loggedCount}/{total}</div>
              </div>
              <div className="wsh-info">
                <div className="wsh-vol-row">
                  <span className="wsh-num">{nf(displayVol)}</span>
                  <span className="wsh-unit"> kg today</span>
                  {floaters.map((f) => (
                    <span key={f.id} className="xp-floater">{f.text}</span>
                  ))}
                </div>
                <div className="wsh-track"><i style={{ width: `${pct}%` }} /></div>
                <div className="wsh-remain">
                  {remaining > 0 ? `${remaining} lift${remaining !== 1 ? 's' : ''} left · 7-day ${nf(weekVol)} kg` : '🎯 Session complete'}
                </div>
              </div>
            </div>

            <div className="eb" style={{ margin: '6px 2px 10px' }}>
              Today · {loggedCount} of {total} logged
            </div>

            <div>
              {/* ── ACTIVE EXERCISES ── */}
              {activeExercises.map((ex) => {
                const isFocused = !searchQuery && ex.n === focusedId;
                const isAnimating = justLogged === ex.n;
                const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
                const lastLog = bucket.logs.filter((l) => l.ex === ex.n).slice(-1)[0];
                const isDetailOpen = openDetail === ex.n;

                if (!isFocused) {
                  // compact row
                  return (
                    <div
                      key={ex.n}
                      className={`ex-compact${isAnimating ? ' logged-anim-compact' : ''}`}
                      onClick={() => setExpandedId(ex.n)}
                    >
                      <MTile color={GROUP_COLORS[ex.group ?? group]} sm />
                      <div className="ex-txt">
                        <div className="ex-name">
                          {ex.n}
                          {searchQuery && ex.group && <span className="search-grouptag">{ex.group}</span>}
                        </div>
                        {lastLog && <div className="ex-target">last · {lastLog.kg} kg × {lastLog.reps}</div>}
                      </div>
                      <button
                        className="logbtn-sm"
                        onClick={(e) => { e.stopPropagation(); handleLog(ex); }}
                        aria-label={`Log ${ex.n}`}
                      >
                        Log
                      </button>
                    </div>
                  );
                }

                // focused (expanded) card
                const deltaKg = lastLog ? Math.round((v.kg - lastLog.kg) * 2) / 2 : 0;
                const hasDelta = !!lastLog;
                const deltaClass = deltaKg > 0 ? 'up' : deltaKg < 0 ? 'down' : 'flat';
                const deltaStr = deltaKg > 0
                  ? `▲ +${deltaKg} kg vs last`
                  : deltaKg < 0
                    ? `▼ ${Math.abs(deltaKg)} kg vs last`
                    : '→ same as last';

                return (
                  <div
                    key={ex.n}
                    data-ex={ex.n}
                    className={`ex ex-focused${isAnimating ? ' logged-anim' : ''}`}
                  >
                    <span className="ex-wipe" aria-hidden="true" />
                    <span className="ex-stamp" aria-hidden="true">Logged</span>

                    <div className="ex-head" onClick={() => setOpenDetail(isDetailOpen ? null : ex.n)}>
                      <MTile color={GROUP_COLORS[ex.group ?? group]} />
                      <div className="ex-txt">
                        <div className="ex-name">
                          {ex.n}
                          {searchQuery && ex.group && <span className="search-grouptag">{ex.group}</span>}
                        </div>
                        <div className="ex-target">{ex.t}</div>
                      </div>
                      <span className="chev">›</span>
                    </div>

                    {hasDelta && (
                      <div className={`ex-delta-chip ${deltaClass}`}>{deltaStr}</div>
                    )}

                    <div className="controls">
                      <div className="stepper">
                        <button onClick={() => setVal(ex.n, Math.max(0, v.kg - 2.5), v.reps)}>−</button>
                        <div className="val">
                          <input type="number" value={v.kg} onChange={(e) => setVal(ex.n, +e.target.value, v.reps)} />
                          <span className="unit">kg</span>
                        </div>
                        <button onClick={() => setVal(ex.n, v.kg + 2.5, v.reps)}>+</button>
                      </div>
                      <div className="stepper">
                        <button onClick={() => setVal(ex.n, v.kg, Math.max(1, v.reps - 1))}>−</button>
                        <div className="val">
                          <input type="number" value={v.reps} onChange={(e) => setVal(ex.n, v.kg, +e.target.value)} />
                          <span className="unit">reps</span>
                        </div>
                        <button onClick={() => setVal(ex.n, v.kg, v.reps + 1)}>+</button>
                      </div>
                      <button
                        className={`logbtn${isAnimating ? ' swipe done' : ''}`}
                        onClick={() => handleLog(ex)}
                        aria-label="Log set"
                      >
                        <span className="lb-fill" aria-hidden="true" />
                        <span className="lb-ic lb-log">Log</span>
                        <span className="lb-ic lb-chk" aria-hidden="true"><CheckGlyph /></span>
                      </button>
                    ) : (
                      <span className="chev">{isDetailOpen ? '▴' : '▾'}</span>
                    )}
                  </div>

              {/* ── DONE GROUP ── */}
              {loggedExercises.length > 0 && (
                <div className="done-group">
                  <div className="done-group-hdr">Done · {loggedExercises.length}</div>
                  {loggedExercises.map((ex) => {
                    const todayLog = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).slice(-1)[0];
                    const todayCount = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
                    return (
                      <div key={ex.n} className="done-row">
                        <div className="done-check"><CheckGlyph /></div>
                        <div className="ex-txt">
                          <div className="ex-name">{ex.n}</div>
                        </div>
                        <div className="done-meta">
                          {todayLog ? `${todayLog.kg} kg × ${todayLog.reps}${todayCount > 1 ? ` ×${todayCount}` : ''}` : ''}
                        </div>
                        <button className="del" onClick={() => {
                          const log = bucket.logs.find((l) => l.ex === ex.n && l.date === today);
                          if (log) deleteLog(log.id);
                        }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="addcard" onClick={() => setModal('addExercise')}>
                <span className="ac-plus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                </span>
                Add exercise to {group}
              </button>
            )}
          </main>
        </>
      ) : (
        <main>
          {sessionDates.map((date) => {
            const dayLogs = bucket.logs.filter((l) => l.date === date);
            const vol = dayLogs.reduce((s, l) => s + volume(l), 0);
            return (
              <div key={date}>
                <div className="session-date">{fmtDate(date)}<small>{nf(vol)}</small></div>
                {dayLogs.map((l) => (
                  <div key={l.id} className="hentry">
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.ex}</div>
                      <div className="small">{fmtLogVal(l, unit)}</div>
                    </div>
                    <button type="button" className="del" onClick={() => deleteLog(l.id)}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
          {sessionDates.length === 0 && <div className="empty">No history yet.</div>}
        </main>
      )}
    </>
  );
}
