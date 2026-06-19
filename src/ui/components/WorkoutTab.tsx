'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
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
const round1 = (n: number) => Math.round(n * 10) / 10;

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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);

const GripIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
  </svg>
);

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h11a6 6 0 0 1 0 12H8" />
    <path d="M3 8l4-4M3 8l4 4" />
  </svg>
);

function logsFor(bucket: { logs: LogEntry[] }, exName: string) {
  return bucket.logs.filter((l) => l.ex === exName);
}

function lastLog(bucket: { logs: LogEntry[] }, exName: string) {
  const logs = logsFor(bucket, exName);
  return logs.length ? logs[logs.length - 1] : null;
}

function prevLog(bucket: { logs: LogEntry[] }, exName: string) {
  const logs = logsFor(bucket, exName);
  return logs.length > 1 ? logs[logs.length - 2] : null;
}

function isPrimaryMetric(l: LogEntry) {
  return !l.metric || l.metric === 'weight';
}

function fmtLogVal(l: LogEntry, unit: 'kg' | 'lb'): string {
  if (!l || isPrimaryMetric(l)) {
    const disp = unit === 'lb' ? kgDisplay(l.kg ?? 0, 'lb') : (l.kg ?? 0);
    return `${disp} ${unit} × ${l.reps ?? 0}`;
  }
  const a = `${round1(l.v1 ?? 0)} ${l.u1 ?? ''}`.trim();
  const b = l.v2 != null && l.v2 !== 0 && l.u2 ? ` · ${round1(l.v2)} ${l.u2}` : '';
  return a + b;
}

function TrendLine({ exName, bucket, unit }: { exName: string; bucket: { logs: LogEntry[] }; unit: 'kg' | 'lb' }) {
  const last = lastLog(bucket, exName);
  const prev = prevLog(bucket, exName);
  if (!last) return <span className="flat">Not logged yet</span>;

  if (isPrimaryMetric(last)) {
    let arrow: ReactNode = null;
    if (prev && isPrimaryMetric(prev)) {
      const d = (unit === 'lb' ? kgDisplay(last.kg ?? 0, 'lb') : (last.kg ?? 0)) - (unit === 'lb' ? kgDisplay(prev.kg ?? 0, 'lb') : (prev.kg ?? 0));
      if (d > 0) arrow = <span className="up">▲ +{round1(d)}</span>;
      else if (d < 0) arrow = <span className="down">▼ {round1(d)}</span>;
      else arrow = <span className="flat">—</span>;
    }
    const best = bestE1RM(bucket.logs, exName);
    const isPR = e1rm(last.kg ?? 0, last.reps ?? 0) >= best - 1e-6 && logsFor(bucket, exName).length > 1;
    const disp = unit === 'lb' ? kgDisplay(last.kg ?? 0, 'lb') : (last.kg ?? 0);
    return (
      <>
        Last <b>{disp} {unit} × {last.reps}</b>
        {arrow}
        {isPR && <span className="pr-star" title="Best estimated 1RM">★ PR</span>}
        {best > 0 && <span className="trend-ref">best e1RM {unit === 'lb' ? kgDisplay(best, 'lb') : best} {unit}</span>}
      </>
    );
  }

  let arrow: ReactNode = null;
  if (prev && prev.v1 != null) {
    const d = round1((last.v1 ?? 0) - (prev.v1 ?? 0));
    if (d > 0) arrow = <span className="up">▲ +{d}</span>;
    else if (d < 0) arrow = <span className="down">▼ {d}</span>;
    else arrow = <span className="flat">—</span>;
  }
  const cnt = logsFor(bucket, exName).length;
  return (
    <>
      Last <b>{fmtLogVal(last, unit)}</b>
      {arrow}
      {cnt > 1 && <span className="trend-ref">{cnt} logged</span>}
    </>
  );
}

function PlateBar({ kg, bar, unit }: { kg: number; bar: number; unit: 'kg' | 'lb' }) {
  const plates = platesFor(kg, bar, unit);
  const barDisp = bar > 0 ? kgDisplay(bar, unit) : kgDisplay(unit === 'lb' ? 45 : 20, unit);
  if (plates.length === 0) {
    return (
      <div className="platebar">
        <i>bar only · {barDisp} {unit}</i>
      </div>
    );
  }
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
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,.ex-grip,.group-menu,.stepper,.logbtn,.qf-chip,.ex-undo')) return;
      const card = t.closest?.('.ex') as HTMLElement | null;
      if (card?.dataset.ex) setSelectedEx(card.dataset.ex);
      else setSelectedEx(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
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

  const firstUnlogged = exercises.find((e) => !bucket.logs.some((l) => l.ex === e.n && l.date === today));
  const loggedTodayCount = exercises.filter((e) => bucket.logs.some((l) => l.ex === e.n && l.date === today)).length;

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
            {searchQuery ? (
              <div className="eb" style={{ margin: '6px 2px 10px' }}>
                {exercises.length} result{exercises.length === 1 ? '' : 's'} for “{searchQuery}”
              </div>
            ) : (
              <div className="eb" style={{ margin: '6px 2px 10px' }}>
                Today · {loggedTodayCount} of {exercises.length} logged
              </div>
            )}

            {searchQuery && exercises.length === 0 && (
              <div className="empty">No exercises match. Try another term.</div>
            )}

            {exercises.map((ex) => {
              const todayCount = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
              const isPrimary = ex === firstUnlogged;
              const isSelected = selectedEx === ex.n;
              const v = defaultVals(ex);
              const metric = exMetric(ex, sport);
              const weight = isWeightMetric(ex, sport);
              const last = lastLog(bucket, ex.n);
              const isDetailOpen = openDetail === ex.n;
              const pend = pending[ex.n] ?? {};

              return (
                <div
                  key={ex.n}
                  data-ex={ex.n}
                  className={`ex${isPrimary ? ' primary' : ''}${isSelected ? ' selected' : ''}${prFlash === ex.n ? ' pr-flash' : ''}${draggingName === ex.n ? ' dragging' : ''}`}
                >
                  <span className="ex-wipe" aria-hidden="true" />
                  <div className="ex-head" onClick={() => toggleDetail(ex.n)}>
                    {!searchQuery && (
                      <span className="ex-grip" title="Drag to reorder" onPointerDown={(e) => startDrag(e, ex.n)} onClick={(e) => e.stopPropagation()}>
                        <GripIcon />
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ex-name">
                        {ex.n}
                        {ex.group && searchQuery && <span className="search-grouptag">{ex.group}</span>}
                      </div>
                      <div className="ex-target">{ex.t}</div>
                      <div className="lastlog">
                        <TrendLine exName={ex.n} bucket={bucket} unit={unit} />
                      </div>
                    </div>
                    {todayCount > 0 ? (
                      <button type="button" className="ex-undo" onClick={(e) => undoLast(ex.n, e)} aria-label="Undo last set">
                        <UndoIcon />
                        <span>Undo{todayCount > 1 ? ` ·${todayCount}` : ''}</span>
                      </button>
                    ) : (
                      <span className="chev">{isDetailOpen ? '▴' : '▾'}</span>
                    )}
                  </div>

                  {last && (
                    <button type="button" className="qf-chip" onClick={(e) => quickFill(ex, e)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      Repeat last {fmtLogVal(last, unit)}
                    </button>
                  )}

                  <div className="controls">
                    {weight ? (
                      <>
                        <div className="stepper">
                          <button type="button" onClick={() => bump(ex, 'kg', -weightStep(unit))}>−</button>
                          <div className="val">
                            <input type="number" step={unit === 'lb' ? 1 : 0.5} value={kgDisplay(v.kg ?? 0, unit)} onChange={(e) => setVal(ex.n, { ...v, kg: kgCanonical(+e.target.value, unit) })} />
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
                      </>
                    ) : (
                      <>
                        <div className="stepper">
                          <button type="button" onClick={() => bump(ex, 'v1', -1)}>−</button>
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
                    <button type="button" className="logbtn" onClick={(e) => handleLog(ex, e)} aria-label="Log set">
                      <span className="lb-fill" aria-hidden="true" />
                      <span className="lb-ic lb-log">Log</span>
                      <span className="lb-ic lb-chk" aria-hidden="true"><CheckGlyph /></span>
                    </button>
                  </div>

                  {weight && <PlateBar kg={v.kg ?? 0} bar={state.bar} unit={unit} />}

                  {isDetailOpen && (
                    <div className="detail open">
                      <div className="set-ed">
                        <div className="se-lab">This set</div>
                        <div className="seg">
                          {SET_TYPES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={(pend.set_type ?? 'work') === t.id ? 'on' : ''}
                              onClick={() => setPending(ex.n, { set_type: t.id })}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                        <div className="se-lab2">RPE — how hard?</div>
                        <div className="rpe-row">
                          {[7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
                            <button
                              key={r}
                              type="button"
                              className={pend.rpe === r ? 'on' : ''}
                              onClick={() => setPending(ex.n, { rpe: pend.rpe === r ? undefined : r })}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          className="se-note"
                          placeholder="Note — felt strong, paused reps…"
                          value={pend.note ?? ''}
                          onChange={(e) => setPending(ex.n, { note: e.target.value })}
                        />
                      </div>
                      <div className="mini-hist">
                        {bucket.logs.filter((l) => l.ex === ex.n).slice(-5).reverse().map((l) => (
                          <div key={l.id}>{fmtDate(l.date)} — <b>{fmtLogVal(l, unit)}</b></div>
                        ))}
                      </div>
                      <button type="button" className="removex" onClick={() => removeExercise(ex.n)}>Remove this exercise from the list</button>
                    </div>
                  )}
                </div>
              );
            })}

            {!searchQuery && (
              <button type="button" className="addcard" onClick={() => setModal('addExercise')}>
                <span className="ac-plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
                <span>Add exercise to {category}</span>
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
