'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { exercisesFor, GROUPS, GROUP_COLORS, groupOf } from '@/domain/catalogue';
import { todayStr, fmtDate, uid } from '@/domain/format';
import type { Group, PresetExercise } from '@/domain/types';
import { createLogEntry, isLoggedToday } from '@/application/workoutUsecases';

const nf = (n: number) => Math.round(n).toLocaleString('en-US');

/** Honour the OS "reduce motion" setting before playing log celebrations. */
function prefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
}
/** Short haptic burst (legacy parity); no-op where unsupported. */
function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);

/** Barbell glyph used across the reskinned cards (matches the Hybrid design). */
function BarbellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13" />
    </svg>
  );
}

/** Colour-tinted modality tile; colour comes from the group via the --gc var. */
function MTile({ color, sm }: { color?: string; sm?: boolean }) {
  return (
    <div className={`mtile${sm ? ' sm' : ''}`} style={{ ['--gc' as string]: color ?? 'var(--accent)' } as CSSProperties}>
      <BarbellIcon />
    </div>
  );
}

export function WorkoutTab() {
  const { state, logExercise, deleteLog, removeExercise } = useWeapon();
  const { group, setGroup, searchOpen, searchQuery, toggleSearch, setSearchQuery, vals, setVal } = useUIStore();
  const setModal = useUIStore((s) => s.setModal);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [wkPage, setWkPage] = useState<'workout' | 'history'>('workout');
  // transient name of the card mid log-celebration (drives swipe + wipe + stamp)
  const [justLogged, setJustLogged] = useState<string | null>(null);
  // click-selected card highlight — persists until another card or empty space is clicked
  const [selectedEx, setSelectedEx] = useState<string | null>(null);

  // legacy "click anywhere selects this card, click empty space clears it" behaviour
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const card = (e.target as HTMLElement)?.closest?.('.ex') as HTMLElement | null;
      if (card && card.dataset.ex) {
        setSelectedEx(card.dataset.ex);
      } else {
        setSelectedEx(null);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  if (!state) return null;
  const bucket = state[state.mode];
  const today = todayStr();

  let exercises: (PresetExercise & { group?: Group })[] = [];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    GROUPS.forEach((g) => {
      exercisesFor(g, bucket).forEach((e) => {
        if (e.n.toLowerCase().includes(q) || e.t.toLowerCase().includes(q)) {
          exercises.push({ ...e, group: g });
        }
      });
    });
  } else {
    exercises = exercisesFor(group, bucket);
  }

  const firstUnlogged = exercises.find((e) => !isLoggedToday(bucket, e.n));

  // ===== Today hero summary (mirrors the live-session hero block) =====
  const todayLogs = bucket.logs.filter((l) => l.date === today);
  const todayVol = todayLogs.reduce((s, l) => s + l.kg * l.reps * l.sets, 0);
  const todaySets = todayLogs.reduce((s, l) => s + l.sets, 0);
  const todayExercises = new Set(todayLogs.map((l) => l.ex)).size;
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const weekVol = bucket.logs
    .filter((l) => l.date >= weekAgo)
    .reduce((s, l) => s + l.kg * l.reps * l.sets, 0);

  function handleLog(ex: PresetExercise) {
    const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
    const done = isLoggedToday(bucket, ex.n);
    if (done) {
      haptic(18);
      const todayLog = bucket.logs.find((l) => l.ex === ex.n && l.date === today);
      if (todayLog) deleteLog(todayLog.id);
    } else {
      haptic([12, 28, 12]);
      if (!prefersReduced()) {
        setJustLogged(ex.n);
        window.setTimeout(() => setJustLogged((cur) => (cur === ex.n ? null : cur)), 700);
      }
      const log = createLogEntry(v.kg, v.reps, ex.n);
      logExercise(log);
    }
  }

  const sessionDates = [...new Set(bucket.logs.map((l) => l.date))].sort().reverse();

  return (
    <>
      <div className="wk-seg">
        <button className={wkPage === 'workout' ? 'on' : ''} onClick={() => setWkPage('workout')}>Workout</button>
        <button className={wkPage === 'history' ? 'on' : ''} onClick={() => setWkPage('history')}>History</button>
      </div>

      {wkPage === 'workout' ? (
        <>
          <div className="wk-head">
            <div className="wk-top">
              <button className={`group-dd${groupMenuOpen ? ' open' : ''}`} onClick={() => setGroupMenuOpen(!groupMenuOpen)}>
                <span>{group}</span>
                <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {groupMenuOpen && (
                <div className="group-menu open">
                  {GROUPS.map((g) => (
                    <button key={g} className={g === group ? 'on' : ''} onClick={() => { setGroup(g); setGroupMenuOpen(false); }}>{g}</button>
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
            <div className="wk-hero">
              <div className="wh-eyebrow">Today · {group}</div>
              <div className="wh-big">{nf(todayVol)}<small> kg volume</small></div>
              <div className="wh-stats">
                <div className="wh-stat"><div className="wv">{todaySets}</div><div className="wl">Sets</div></div>
                <div className="wh-stat"><div className="wv">{todayExercises}</div><div className="wl">Exercises</div></div>
                <div className="wh-stat"><div className="wv">{nf(weekVol)}</div><div className="wl">7-day kg</div></div>
              </div>
            </div>
            <div>
              {exercises.map((ex) => {
                const done = isLoggedToday(bucket, ex.n);
                const todayCount = bucket.logs.filter((l) => l.ex === ex.n && l.date === today).length;
                const isPrimary = ex === firstUnlogged;
                const isSelected = selectedEx === ex.n;
                const isAnimating = justLogged === ex.n;
                const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
                const lastLog = bucket.logs.filter((l) => l.ex === ex.n).slice(-1)[0];
                const isDetailOpen = openDetail === ex.n;

                return (
                  <div
                    key={ex.n}
                    data-ex={ex.n}
                    className={`ex${isPrimary ? ' primary' : ''}${isSelected ? ' selected' : ''}${isAnimating ? ' logged-anim' : ''}`}
                  >
                    <span className="ex-wipe" aria-hidden="true" />
                    <span className="ex-stamp" aria-hidden="true">Logged</span>
                    <div className="ex-head" onClick={() => setOpenDetail(isDetailOpen ? null : ex.n)}>
                      <MTile color={GROUP_COLORS[ex.group ?? group]} />
                      <div className="ex-txt">
                        <div className="ex-name">{ex.n}{searchQuery && ex.group && <span className="search-grouptag">{ex.group}</span>}</div>
                        <div className="ex-target">{ex.t}</div>
                        {lastLog && <div className="lastlog">Last: <b>{lastLog.kg}kg × {lastLog.reps}</b></div>}
                      </div>
                      {done ? <span className="pill-done">Logged{todayCount > 1 ? ` ×${todayCount}` : ''}</span> : <span className="chev">›</span>}
                    </div>

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
                        className={`logbtn${done && !isAnimating ? ' is-done' : ''}${isAnimating ? ' swipe done' : ''}`}
                        onClick={() => handleLog(ex)}
                        aria-label="Log set"
                      >
                        {done && !isAnimating ? (
                          <CheckGlyph />
                        ) : (
                          <>
                            <span className="lb-fill" aria-hidden="true" />
                            <span className="lb-ic lb-log">Log</span>
                            <span className="lb-ic lb-chk" aria-hidden="true"><CheckGlyph /></span>
                          </>
                        )}
                      </button>
                    </div>

                    {isDetailOpen && (
                      <div className="detail open">
                        <div className="mini-hist">
                          {bucket.logs.filter((l) => l.ex === ex.n).slice(-5).map((l) => (
                            <div key={l.id}><b>{l.kg}kg × {l.reps}</b> — {l.date}</div>
                          ))}
                        </div>
                        <button className="removex" onClick={() => removeExercise(ex.n)}>Remove exercise</button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button className="addcard" onClick={() => setModal('addExercise')}>
                <span className="ac-plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></span>
                Add exercise to {group}
              </button>
            </div>
          </main>
        </>
      ) : (
        <main>
          {sessionDates.map((date) => {
            const dayLogs = bucket.logs.filter((l) => l.date === date);
            const vol = dayLogs.reduce((s, l) => s + l.kg * l.reps * l.sets, 0);
            return (
              <div key={date}>
                <div className="session-date">{fmtDate(date)}<small>{nf(vol)} kg vol</small></div>
                {dayLogs.map((l) => {
                  const g = groupOf(l.ex);
                  return (
                    <div key={l.id} className="hentry">
                      <MTile sm color={g ? GROUP_COLORS[g] : undefined} />
                      <div className="he-txt">
                        <div className="he-name">{l.ex}</div>
                        <div className="he-sub">{l.kg}kg × {l.reps} · {l.sets} {l.sets === 1 ? 'set' : 'sets'}</div>
                      </div>
                      <span className="he-metric"><b>{nf(l.kg * l.reps * l.sets)}</b> kg</span>
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
