'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import {
  exercisesFor,
  catsFor,
  catColor,
  groupOf,
  sportDef,
  exMetric,
  exU1,
  exU2,
  step1For,
  step2For,
  SPORT_IDS,
  SPORTS,
  SP_ICON,
} from '@/domain/catalogue';
import { todayStr, fmtDate } from '@/domain/format';
import type { Group, PresetExercise, Metric, SportId } from '@/domain/types';
import { createLogEntry, createMetricLogEntry, isLoggedToday } from '@/application/workoutUsecases';

const nf = (n: number) => Math.round(n).toLocaleString('en-US');
const RING_CIRC = 125.66; // 2π × 20

const BARBELL_NAMES = new Set([
  'Bench Press','Incline Press','Decline Press','Barbell Row','Pendlay Row',
  'Overhead Press','Squat','Front Squat','Deadlift','Romanian Deadlift',
  'T-Bar Row','Skull Crusher','Close-grip Bench Press','Upright Row','Barbell Curl','Shrug',
]);
function barWeight(name: string): number {
  return BARBELL_NAMES.has(name) ? 20 : 0;
}
function fmtN(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function fmtPlate(name: string, kg: number, reps: number): string {
  const bar = barWeight(name);
  if (kg === 0) return `Bodyweight · ${reps} reps`;
  if (bar > 0) {
    const perSide = Math.max(0, (kg - bar) / 2);
    return `${fmtN(kg)} kg · ${bar} bar + ${fmtN(perSide)}/side · ${reps} reps`;
  }
  return `${fmtN(kg)} kg · ${reps} reps`;
}
function fmtLast(kg: number, reps: number): string {
  return `${kg === 0 ? 'BW' : fmtN(kg)} × ${reps}`;
}

/** Metric-aware summary chip for the focused card (non-weight metrics). */
function fmtMetricChip(em: Metric, v1: number, v2: number, u1: string, u2: string | null): string {
  if (em === 'dist') {
    const main = `${fmtN(v1)} ${u1}`.trim();
    return u2 ? `${main} · ${fmtN(v2)} ${u2}` : main;
  }
  if (em === 'hold') return `${fmtN(v1)} ${u1 || 'sec'}`;
  return `${fmtN(v1)} ${u1 || 'reps'}`;
}
/** Compact "last" line for non-weight metrics. */
function fmtMetricLast(em: Metric, v1: number, v2: number, u1: string, u2: string | null): string {
  if (em === 'dist') return u2 ? `${fmtN(v1)}${u1} · ${fmtN(v2)}${u2}` : `${fmtN(v1)}${u1}`;
  return `${fmtN(v1)} ${u1 || (em === 'hold' ? 'sec' : 'reps')}`;
}

function prefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
}
function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

function SportGlyph({ sport }: { sport: SportId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: SP_ICON[sport] }}
    />
  );
}

function MTile({ color, sm, sport }: { color?: string; sm?: boolean; sport: SportId }) {
  return (
    <div className={`mtile${sm ? ' sm' : ''}`} style={{ ['--gc' as string]: color ?? 'var(--accent)' } as CSSProperties}>
      <SportGlyph sport={sport} />
    </div>
  );
}

/** Default working values for an exercise (kg slot = v1, reps slot = v2). */
function defaultV(sport: SportId, ex: PresetExercise): { kg: number; reps: number } {
  const em = exMetric(sport, ex);
  if (em === 'weight') return { kg: ex.start, reps: 10 };
  if (em === 'dist') return { kg: ex.start, reps: exU2(sport, ex) ? 30 : 0 };
  return { kg: ex.start, reps: 0 };
}

export function WorkoutTab() {
  const { state, logExercise, deleteLog, removeExercise, setSport } = useWeapon();
  const { group, setGroup, searchOpen, searchQuery, toggleSearch, setSearchQuery, vals, setVal } = useUIStore();
  const setModal = useUIStore((s) => s.setModal);

  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [wkPage, setWkPage] = useState<'workout' | 'history'>('workout');
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [displayVol, setDisplayVol] = useState(0);
  const [floaters, setFloaters] = useState<{ id: string; text: string }[]>([]);
  const volTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (volTimerRef.current) clearInterval(volTimerRef.current); };
  }, []);

  const sport = state?.sport ?? 'gym';
  const cats = catsFor(sport);

  // keep the selected category valid for the current sport
  useEffect(() => {
    if (!cats.includes(group)) setGroup(cats[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  if (!state) return null;
  const bucket = state.sports[sport];
  const today = todayStr();
  const def = sportDef(sport);
  const sportMetric = def.metric;

  const curGroup = cats.includes(group) ? group : cats[0];

  // exercise list
  let exercises: (PresetExercise & { group?: Group })[] = [];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    cats.forEach((g) => {
      exercisesFor(sport, g, bucket).forEach((e) => {
        if (e.n.toLowerCase().includes(q) || e.t.toLowerCase().includes(q)) {
          exercises.push({ ...e, group: g });
        }
      });
    });
  } else {
    exercises = exercisesFor(sport, curGroup, bucket);
  }

  const activeExercises = exercises.filter((e) => !isLoggedToday(bucket, e.n));
  const loggedExercises = exercises.filter((e) => isLoggedToday(bucket, e.n));
  const total = exercises.length;
  const loggedCount = loggedExercises.length;
  const pct = total > 0 ? (loggedCount / total) * 100 : 0;
  const remaining = total - loggedCount;
  const ringOffset = RING_CIRC * (1 - loggedCount / Math.max(1, total));

  // metric-aware "today total" + label
  function metricTotal(logs: typeof bucket.logs): number {
    if (sportMetric === 'weight') return logs.reduce((s, l) => s + l.kg * l.reps * l.sets, 0);
    if (sportMetric === 'dist') {
      return logs.reduce((s, l) => {
        const v = l.v1 ?? 0;
        return s + (l.u1 === 'm' ? v / 1000 : v);
      }, 0);
    }
    return logs.reduce((s, l) => s + (l.v1 ?? 0) * (l.sets || 1), 0);
  }
  const totalUnit =
    sportMetric === 'weight' ? 'kg today' : sportMetric === 'dist' ? 'km today' : sportMetric === 'hold' ? 'sec today' : 'reps today';

  const todayLogs = bucket.logs.filter((l) => l.date === today);
  const todayTotal = metricTotal(todayLogs);

  useEffect(() => {
    if (!volTimerRef.current) setDisplayVol(todayTotal);
  }, [todayTotal]);

  const focusedId = (() => {
    if (expandedId && activeExercises.some((e) => e.n === expandedId)) return expandedId;
    return activeExercises[0]?.n ?? null;
  })();

  useEffect(() => {
    setExpandedId(null);
  }, [group, searchQuery, sport]);

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const weekTotal = metricTotal(bucket.logs.filter((l) => l.date >= weekAgo));

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
    const v = vals[ex.n] ?? defaultV(sport, ex);
    const em = exMetric(sport, ex);
    const done = isLoggedToday(bucket, ex.n);

    if (done) {
      haptic(18);
      const todayLog = bucket.logs.find((l) => l.ex === ex.n && l.date === today);
      if (todayLog) deleteLog(todayLog.id);
      tweenVol(metricTotal(todayLogs.filter((l) => l.id !== todayLog?.id)));
      return;
    }

    haptic([12, 28, 12]);
    if (em === 'weight') {
      logExercise(createLogEntry(v.kg, v.reps, ex.n));
    } else {
      const u2 = exU2(sport, ex);
      logExercise(createMetricLogEntry(ex.n, em, v.kg, u2 ? v.reps : undefined, exU1(sport, ex), u2));
    }

    if (!prefersReduced()) {
      setJustLogged(ex.n);
      window.setTimeout(() => setJustLogged((cur) => (cur === ex.n ? null : cur)), 700);
      const xp = 18 + Math.round((v.kg * Math.max(1, v.reps || 1)) / 35);
      const fid = 'f' + Date.now();
      setFloaters((fs) => [...fs, { id: fid, text: `+${xp} XP` }]);
      setTimeout(() => setFloaters((fs) => fs.filter((f) => f.id !== fid)), 900);
    }

    const next = activeExercises.find((e) => e.n !== ex.n);
    if (next) setExpandedId(next.n);

    // optimistic bump for the displayed total
    const bump =
      em === 'weight'
        ? v.kg * v.reps
        : em === 'dist'
          ? exU1(sport, ex) === 'm'
            ? v.kg / 1000
            : v.kg
          : v.kg;
    tweenVol(todayTotal + bump);
  }

  const sessionDates = [...new Set(bucket.logs.map((l) => l.date))].sort().reverse();

  return (
    <>
      {/* ── SPORT SELECTOR ── */}
      <div className="sportbar" role="tablist" aria-label="Sport">
        {SPORT_IDS.map((id) => {
          const on = id === sport;
          return (
            <button
              key={id}
              className={`sport-chip${on ? ' on' : ''}`}
              role="tab"
              aria-selected={on}
              onClick={() => { if (!on) { setSport(id); haptic(8); } }}
            >
              <SportGlyph sport={id} />
              <span>{SPORTS[id].name}</span>
            </button>
          );
        })}
      </div>

      <div className="wk-seg">
        <button className={wkPage === 'workout' ? 'on' : ''} onClick={() => setWkPage('workout')}>Workout</button>
        <button className={wkPage === 'history' ? 'on' : ''} onClick={() => setWkPage('history')}>History</button>
      </div>

      {wkPage === 'workout' ? (
        <>
          <div className="wk-head">
            <div className="wk-top">
              <button className={`group-dd${groupMenuOpen ? ' open' : ''}`} onClick={() => setGroupMenuOpen(!groupMenuOpen)}>
                <span>{curGroup}</span>
                <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {groupMenuOpen && (
                <div className="group-menu open">
                  {cats.map((g) => (
                    <button key={g} className={g === curGroup ? 'on' : ''} onClick={() => { setGroup(g); setGroupMenuOpen(false); }}>{g}</button>
                  ))}
                </div>
              )}
            </div>
            <button className={`wk-search-btn${searchOpen ? ' on' : ''}`} onClick={toggleSearch} aria-label="Search exercises">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.2-4.2" /></svg>
            </button>
          </div>

          {searchOpen && (
            <div className="wk-searchbar open">
              <input type="search" placeholder="Search all exercises…" autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                  <span className="wsh-unit"> {totalUnit}</span>
                  {floaters.map((f) => (
                    <span key={f.id} className="xp-floater">{f.text}</span>
                  ))}
                </div>
                <div className="wsh-track"><i style={{ width: `${pct}%` }} /></div>
                <div className="wsh-remain">
                  {remaining > 0 ? `${remaining} left · 7-day ${nf(weekTotal)}` : '🎯 Session complete'}
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
                const em = exMetric(sport, ex);
                const u1 = exU1(sport, ex);
                const u2 = exU2(sport, ex);
                const s1 = step1For(sport, ex);
                const s2 = step2For(sport, ex);
                const v = vals[ex.n] ?? defaultV(sport, ex);
                const lastLog = bucket.logs.filter((l) => l.ex === ex.n).slice(-1)[0];
                const isDetailOpen = openDetail === ex.n;
                const exColor = ex.group ? catColor(sport, ex.group) : catColor(sport, curGroup);

                if (!isFocused) {
                  const lastTxt = lastLog
                    ? em === 'weight'
                      ? fmtLast(lastLog.kg, lastLog.reps)
                      : fmtMetricLast(em, lastLog.v1 ?? 0, lastLog.v2 ?? 0, lastLog.u1 ?? u1, lastLog.u2 ?? u2)
                    : null;
                  return (
                    <div
                      key={ex.n}
                      className={`ex-compact${isAnimating ? ' logged-anim-compact' : ''}`}
                      onClick={() => setExpandedId(ex.n)}
                    >
                      <div className="ex-icon-dim" style={{ ['--gc' as string]: exColor } as CSSProperties}>
                        <SportGlyph sport={sport} />
                      </div>
                      <div className="ex-txt">
                        <div className="ex-name">
                          {ex.n}
                          {searchQuery && ex.group && <span className="search-grouptag">{ex.group}</span>}
                        </div>
                        {lastTxt && <div className="ex-target">last · {lastTxt}</div>}
                      </div>
                    </div>
                  );
                }

                // focused (expanded) card
                const deltaKg = lastLog ? Math.round((v.kg - lastLog.kg) * 2) / 2 : 0;
                const showDelta = em === 'weight' && !!lastLog;
                const deltaClass = deltaKg > 0 ? 'up' : deltaKg < 0 ? 'down' : 'flat';
                const deltaStr = deltaKg > 0
                  ? `▲ +${deltaKg} kg vs last`
                  : deltaKg < 0
                    ? `▼ ${Math.abs(deltaKg)} kg vs last`
                    : '→ matches last';

                const chip = em === 'weight'
                  ? fmtPlate(ex.n, v.kg, v.reps)
                  : fmtMetricChip(em, v.kg, v.reps, u1, u2);
                const lastChip = lastLog
                  ? em === 'weight'
                    ? fmtLast(lastLog.kg, lastLog.reps)
                    : fmtMetricLast(em, lastLog.v1 ?? 0, lastLog.v2 ?? 0, lastLog.u1 ?? u1, lastLog.u2 ?? u2)
                  : null;

                return (
                  <div
                    key={ex.n}
                    data-ex={ex.n}
                    className={`ex ex-focused${isAnimating ? ' logged-anim' : ''}`}
                  >
                    <span className="ex-wipe" aria-hidden="true" />
                    <span className="ex-stamp" aria-hidden="true">Logged</span>

                    <div className="ex-head" onClick={() => setOpenDetail(isDetailOpen ? null : ex.n)}>
                      <div className="ex-icon-volt" style={{ ['--gc' as string]: exColor } as CSSProperties}>
                        <SportGlyph sport={sport} />
                      </div>
                      <div className="ex-txt">
                        <div className="ex-name">
                          {ex.n}
                          {searchQuery && ex.group && <span className="search-grouptag">{ex.group}</span>}
                        </div>
                        <div className="ex-target">{ex.t}</div>
                      </div>
                    </div>

                    {showDelta && (
                      <div className={`ex-delta-chip ${deltaClass}`}>{deltaStr}</div>
                    )}

                    <div className="controls">
                      {/* primary value (v1) */}
                      <div className="stepper">
                        <button onClick={() => setVal(ex.n, Math.max(0, Math.round((v.kg - s1) * 100) / 100), v.reps)}>−</button>
                        <div className="val">
                          <input
                            type="number"
                            step={s1}
                            inputMode={em === 'weight' || (em === 'dist' && u1 !== 'm') ? 'decimal' : 'numeric'}
                            value={v.kg}
                            onChange={(e) => setVal(ex.n, Math.max(0, +e.target.value || 0), v.reps)}
                          />
                          <span className="unit">{em === 'weight' ? 'kg' : u1}</span>
                        </div>
                        <button onClick={() => setVal(ex.n, Math.round((v.kg + s1) * 100) / 100, v.reps)}>+</button>
                      </div>

                      {/* secondary value (v2): reps for weight, or u2 for dist */}
                      {(em === 'weight' || (em === 'dist' && u2)) && (
                        <div className="stepper">
                          <button onClick={() => setVal(ex.n, v.kg, Math.max(em === 'weight' ? 1 : 0, v.reps - s2))}>−</button>
                          <div className="val">
                            <input
                              type="number"
                              step={s2}
                              inputMode="numeric"
                              value={v.reps}
                              onChange={(e) => setVal(ex.n, v.kg, Math.max(em === 'weight' ? 1 : 0, Math.round(+e.target.value) || 0))}
                            />
                            <span className="unit">{em === 'weight' ? 'reps' : u2}</span>
                          </div>
                          <button onClick={() => setVal(ex.n, v.kg, v.reps + s2)}>+</button>
                        </div>
                      )}

                      <button
                        className={`logbtn${isAnimating ? ' swipe done' : ''}`}
                        onClick={() => handleLog(ex)}
                        aria-label="Log set"
                      >
                        <span className="lb-fill" aria-hidden="true" />
                        <span className="lb-ic lb-log">Log</span>
                        <span className="lb-ic lb-chk" aria-hidden="true"><CheckGlyph /></span>
                      </button>
                    </div>

                    <div className="ex-plate-row">
                      <span className="ex-plate-chip">{chip}</span>
                      {lastChip && (
                        <span className="ex-plate-last">last · {lastChip}</span>
                      )}
                    </div>

                    {isDetailOpen && (
                      <div className="detail open">
                        <div className="mini-hist">
                          {bucket.logs.filter((l) => l.ex === ex.n).slice(-5).map((l) => (
                            <div key={l.id}>
                              <b>{em === 'weight' ? `${l.kg}kg × ${l.reps}` : fmtMetricLast(em, l.v1 ?? 0, l.v2 ?? 0, l.u1 ?? u1, l.u2 ?? u2)}</b> — {l.date}
                            </div>
                          ))}
                        </div>
                        <button className="removex" onClick={() => removeExercise(ex.n)}>Remove exercise</button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── DONE GROUP ── */}
              {loggedExercises.length > 0 && (
                <div className="done-group">
                  <div className="done-group-hdr">Done · {loggedExercises.length}</div>
                  {loggedExercises.map((ex) => {
                    const em = exMetric(sport, ex);
                    const todayLog = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).slice(-1)[0];
                    const todayCount = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
                    const meta = todayLog
                      ? em === 'weight'
                        ? `${todayLog.kg} kg × ${todayLog.reps}${todayCount > 1 ? ` ×${todayCount}` : ''}`
                        : `${fmtMetricLast(em, todayLog.v1 ?? 0, todayLog.v2 ?? 0, todayLog.u1 ?? exU1(sport, ex), todayLog.u2 ?? exU2(sport, ex))}${todayCount > 1 ? ` ×${todayCount}` : ''}`
                      : '';
                    return (
                      <div key={ex.n} className="done-row">
                        <div className="done-check"><CheckGlyph /></div>
                        <div className="ex-txt">
                          <div className="ex-name">{ex.n}</div>
                        </div>
                        <div className="done-meta">{meta}</div>
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
                Add exercise to {curGroup}
              </button>
            </div>
          </main>
        </>
      ) : (
        <main>
          {sessionDates.map((date) => {
            const dayLogs = bucket.logs.filter((l) => l.date === date);
            const dayTotal = metricTotal(dayLogs);
            return (
              <div key={date}>
                <div className="session-date">{fmtDate(date)}<small>{nf(dayTotal)} {totalUnit.replace(' today', '')}</small></div>
                {dayLogs.map((l) => {
                  const g = groupOf(sport, l.ex);
                  const em = l.m ?? sportMetric;
                  const meta = em === 'weight'
                    ? `${l.kg}kg × ${l.reps} · ${l.sets} ${l.sets === 1 ? 'set' : 'sets'}`
                    : `${fmtMetricLast(em, l.v1 ?? 0, l.v2 ?? 0, l.u1 ?? '', l.u2 ?? null)} · ${l.sets} ${l.sets === 1 ? 'set' : 'sets'}`;
                  const metricVal = em === 'weight' ? l.kg * l.reps * l.sets : (l.v1 ?? 0) * (l.sets || 1);
                  return (
                    <div key={l.id} className="hentry">
                      <MTile sm sport={sport} color={g ? catColor(sport, g) : undefined} />
                      <div className="he-txt">
                        <div className="he-name">{l.ex}</div>
                        <div className="he-sub">{meta}</div>
                      </div>
                      <span className="he-metric"><b>{nf(metricVal)}</b> {em === 'weight' ? 'kg' : (l.u1 ?? '')}</span>
                      <button className="del" onClick={() => deleteLog(l.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {sessionDates.length === 0 && <div className="empty">No history yet. Log your first set!</div>}
        </main>
      )}
    </>
  );
}
