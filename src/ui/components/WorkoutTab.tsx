'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import {
  categoriesFor,
  exercisesFor,
  catColor,
  exMetric,
  exU1,
  exU2,
  isWeightMetric,
  sportDef,
  groupOfSport,
} from '@/domain/sports';
import { todayStr, fmtDate } from '@/domain/format';
import type { PresetExercise, LogEntry } from '@/domain/types';
import { createLogEntry, isLoggedToday, bestE1RM } from '@/application/workoutUsecases';
import { e1rm } from '@/domain/ranks';
import { kgDisplay, kgCanonical, weightStep, platesFor, volume } from '@/domain/metrics';
import { showToast, showToastAction } from './Toast';
import { CountUp } from './CountUp';

const nf = (n: number) => Math.round(n).toLocaleString('en-US');

function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);

function BarbellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13" />
    </svg>
  );
}

function MTile({ color, sm }: { color?: string; sm?: boolean }) {
  return (
    <div className={`mtile${sm ? ' sm' : ''}`} style={{ ['--gc' as string]: color ?? 'var(--accent)' } as CSSProperties}>
      <BarbellIcon />
    </div>
  );
}

function formatLogMetric(l: LogEntry, unit: 'kg' | 'lb'): string {
  const m = l.metric ?? 'weight';
  if (m === 'weight') {
    const kg = l.kg ?? l.v1 ?? 0;
    const disp = unit === 'lb' ? kgDisplay(kg, 'lb') : kg;
    return `${disp}${unit} × ${l.reps ?? 0} · ${l.sets} sets`;
  }
  const u1 = l.u1 ?? '';
  const u2 = l.u2 ?? '';
  let s = `${l.v1 ?? 0} ${u1}`;
  if (l.v2 != null) s += ` · ${l.v2} ${u2}`;
  return `${s} · ${l.sets} sets`;
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
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [selectedEx, setSelectedEx] = useState<string | null>(null);
  const [prFlash, setPrFlash] = useState<string | null>(null);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const dragGhostRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => {
    const g = dragGhostRef.current;
    if (g?.parentNode) g.parentNode.removeChild(g);
    document.body.classList.remove('dragging-active');
  }, []);

  useEffect(() => {
    if (!cats.includes(category)) setCategory(cats[0] ?? 'Chest');
  }, [sport, cats, category, setCategory]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const card = (e.target as HTMLElement)?.closest?.('.ex') as HTMLElement | null;
      if (card?.dataset.ex) setSelectedEx(card.dataset.ex);
      else setSelectedEx(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const today = todayStr();
  const unit = state.unit;

  let exercises: (PresetExercise & { group?: string })[] = [];
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

  const firstUnlogged = exercises.find((e) => !isLoggedToday(bucket, e.n));
  const todayLogs = bucket.logs.filter((l) => l.date === today);
  const todayVol = todayLogs.reduce((s, l) => s + volume(l), 0);
  const todaySets = todayLogs.reduce((s, l) => s + l.sets, 0);
  const todayExercises = new Set(todayLogs.map((l) => l.ex)).size;
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const weekVol = bucket.logs.filter((l) => l.date >= weekAgo).reduce((s, l) => s + volume(l), 0);

  function defaultVals(ex: PresetExercise) {
    const metric = exMetric(ex, sport);
    const v = vals[ex.n];
    if (metric === 'weight') {
      return { kg: v?.kg ?? ex.start, reps: v?.reps ?? 8, v1: v?.v1, v2: v?.v2 };
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

  function handleLog(ex: PresetExercise) {
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

    haptic(isPr ? [20, 40, 20] : [12, 28, 12]);
    if (!prefersReduced()) {
      setJustLogged(null);
      requestAnimationFrame(() => {
        setJustLogged(ex.n);
        window.setTimeout(() => setJustLogged((c) => (c === ex.n ? null : c)), 700);
      });
      if (isPr) {
        setPrFlash(ex.n);
        window.setTimeout(() => setPrFlash(null), 900);
      }
    }

    logExercise(log);
    clearPendingNote(ex.n);

    if (isPr) showToast(`PR! e1RM ${e1rm(log.kg ?? 0, log.reps ?? 0)} kg`);
    else showToastAction('Logged', 'Undo', () => deleteLog(log.id));

    if (metric !== 'dist' && metric !== 'time') startRest(state.restDefault);
  }

  function undoLast(exName: string) {
    const todayL = bucket.logs.filter((l) => l.ex === exName && l.date === today);
    const last = todayL[todayL.length - 1];
    if (last) deleteLog(last.id);
  }

  function startDrag(e: React.PointerEvent, name: string) {
    if (searchQuery) return; // reorder disabled while searching
    const card = (e.currentTarget as HTMLElement).closest('.ex') as HTMLElement | null;
    if (!card) return;
    e.preventDefault();

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

    const cat = category;

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
      setOrder(cat, names);
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
  const volLabel = sport === 'gym' ? 'kg volume' : sportDef(sport).goal.unit;

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
              <input type="search" placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          )}

          <main>
            <div className="wk-hero">
              <div className="wh-eyebrow">Today · {sportDef(sport).name}</div>
              <div className="wh-big"><CountUp value={todayVol} format={nf} /><small> {volLabel}</small></div>
              <div className="wh-stats">
                <div className="wh-stat"><div className="wv"><CountUp value={todaySets} /></div><div className="wl">Sets</div></div>
                <div className="wh-stat"><div className="wv"><CountUp value={todayExercises} /></div><div className="wl">Exercises</div></div>
                <div className="wh-stat"><div className="wv"><CountUp value={weekVol} format={nf} /></div><div className="wl">7-day</div></div>
              </div>
            </div>

            {exercises.map((ex) => {
              const done = isLoggedToday(bucket, ex.n);
              const todayCount = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
              const isPrimary = ex === firstUnlogged;
              const isSelected = selectedEx === ex.n;
              const isAnimating = justLogged === ex.n;
              const v = defaultVals(ex);
              const metric = exMetric(ex, sport);
              const weight = isWeightMetric(ex, sport);
              const lastLog = bucket.logs.filter((l) => l.ex === ex.n).slice(-1)[0];
              const isDetailOpen = openDetail === ex.n;
              const pend = pending[ex.n] ?? {};
              const best = weight ? bestE1RM(bucket.logs, ex.n) : 0;
              const plates = weight ? platesFor(v.kg ?? 0, state.bar, unit) : [];

              return (
                <div
                  key={ex.n}
                  data-ex={ex.n}
                  className={`ex${isPrimary ? ' primary' : ''}${isSelected ? ' selected' : ''}${isAnimating ? ' logged-anim' : ''}${prFlash === ex.n ? ' pr-flash' : ''}${draggingName === ex.n ? ' dragging' : ''}`}
                >
                  <span className="ex-wipe" aria-hidden="true" />
                  <span className="ex-stamp" aria-hidden="true">Logged</span>
                  <div className="ex-head">
                    {!searchQuery && (
                      <div className="ex-grip" onPointerDown={(e) => startDrag(e, ex.n)}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7" r="1.5" /><circle cx="15" cy="7" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="17" r="1.5" /><circle cx="15" cy="17" r="1.5" /></svg>
                      </div>
                    )}
                    <MTile color={catColor(sport, ex.group ?? category)} />
                    <div className="ex-txt" onClick={() => setOpenDetail(isDetailOpen ? null : ex.n)}>
                      <div className="ex-name">
                        {ex.n}
                        {best > 0 && weight && <span className="pr-star">e1RM {best}</span>}
                      </div>
                      <div className="ex-target">{ex.t}</div>
                      {lastLog && <div className="lastlog">Last: <b>{formatLogMetric(lastLog, unit)}</b></div>}
                    </div>
                    {done ? (
                      <button type="button" className="ex-undo" onClick={() => undoLast(ex.n)}>Undo</button>
                    ) : (
                      <span className="chev" onClick={() => setOpenDetail(isDetailOpen ? null : ex.n)}>›</span>
                    )}
                  </div>

                  <div className="controls">
                    {weight ? (
                      <>
                        <div className="stepper">
                          <button type="button" onClick={() => bump(ex, 'kg', -weightStep(unit))}>−</button>
                          <div className="val">
                            <input type="number" value={kgDisplay(v.kg ?? 0, unit)} onChange={(e) => setVal(ex.n, { ...v, kg: kgCanonical(+e.target.value, unit) })} />
                            <span className="unit">{unit}</span>
                          </div>
                          <button type="button" onClick={() => bump(ex, 'kg', weightStep(unit))}>+</button>
                        </div>
                        <div className="stepper">
                          <button type="button" onClick={() => bump(ex, 'reps', -1)}>−</button>
                          <div className="val">
                            <input type="number" value={v.reps ?? 8} onChange={(e) => setVal(ex.n, { ...v, reps: +e.target.value })} />
                            <span className="unit">reps</span>
                          </div>
                          <button type="button" onClick={() => bump(ex, 'reps', 1)}>+</button>
                        </div>
                        {plates.length > 0 && (
                          <div className="platebar">{plates.map((p, i) => <span key={i}>{unit === 'lb' ? kgDisplay(p, 'lb') : p}</span>)}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="stepper">
                          <button type="button" onClick={() => bump(ex, 'v1', metric === 'reps' ? -1 : -1)}>−</button>
                          <div className="val">
                            <input type="number" value={v.v1 ?? ex.start} onChange={(e) => setVal(ex.n, { ...v, v1: +e.target.value })} />
                            <span className="unit">{exU1(ex, sport)}</span>
                          </div>
                          <button type="button" onClick={() => bump(ex, 'v1', 1)}>+</button>
                        </div>
                        {exU2(ex, sport) && (
                          <div className="stepper">
                            <button type="button" onClick={() => bump(ex, 'v2', -1)}>−</button>
                            <div className="val">
                              <input type="number" value={v.v2 ?? 0} onChange={(e) => setVal(ex.n, { ...v, v2: +e.target.value })} />
                              <span className="unit">{exU2(ex, sport)}</span>
                            </div>
                            <button type="button" onClick={() => bump(ex, 'v2', 1)}>+</button>
                          </div>
                        )}
                      </>
                    )}
                    <button type="button" className={`logbtn${isAnimating ? ' swipe done is-done firing' : ''}`} onClick={() => handleLog(ex)} aria-label="Log">
                      <span className="lb-fill" aria-hidden="true" />
                      <span className="lb-slash" aria-hidden="true" />
                      <span className="lb-ic lb-log">Log</span>
                      <span className="lb-ic lb-chk" aria-hidden="true"><CheckGlyph /></span>
                    </button>
                  </div>

                  {isDetailOpen && (
                    <div className="detail open">
                      <div className="set-seg">
                        {(['warm', 'work', 'drop'] as const).map((t) => (
                          <button key={t} type="button" className={pend.set_type === t ? 'on' : ''} onClick={() => setPending(ex.n, { set_type: t })}>{t}</button>
                        ))}
                      </div>
                      <div className="rpe-row">
                        {[7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
                          <button key={r} type="button" className={pend.rpe === r ? 'on' : ''} onClick={() => setPending(ex.n, { rpe: pend.rpe === r ? undefined : r })}>RPE {r}</button>
                        ))}
                      </div>
                      <input className="detail-note" placeholder="Note for next log…" value={pend.note ?? ''} onChange={(e) => setPending(ex.n, { note: e.target.value })} />
                      <div className="mini-hist">
                        {bucket.logs.filter((l) => l.ex === ex.n).slice(-5).map((l) => (
                          <div key={l.id}>{formatLogMetric(l, unit)} — {l.date}</div>
                        ))}
                      </div>
                      <button type="button" className="removex" onClick={() => removeExercise(ex.n)}>Remove exercise</button>
                    </div>
                  )}
                </div>
              );
            })}

            <button type="button" className="addcard" onClick={() => setModal('addExercise')}>
              <span className="ac-plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></span>
              Add exercise to {category}
            </button>
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
                {dayLogs.map((l) => {
                  const g = groupOfSport(sport, l.ex, bucket.custom);
                  return (
                    <div key={l.id} className="hentry">
                      <MTile sm color={g ? catColor(sport, g) : undefined} />
                      <div className="he-txt">
                        <div className="he-name">{l.ex}</div>
                        <div className="he-sub">{formatLogMetric(l, unit)}</div>
                      </div>
                      <button type="button" className="del" onClick={() => deleteLog(l.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {sessionDates.length === 0 && <div className="empty">No history yet.</div>}
        </main>
      )}
    </>
  );
}
