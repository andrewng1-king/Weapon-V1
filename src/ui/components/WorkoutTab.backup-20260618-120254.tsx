'use client';

import { useState } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { exercisesFor, GROUPS, GROUP_COLORS } from '@/domain/catalogue';
import { todayStr, fmtDate, uid } from '@/domain/format';
import type { Group, PresetExercise } from '@/domain/types';
import { createLogEntry, isLoggedToday } from '@/application/workoutUsecases';

export function WorkoutTab() {
  const { state, logExercise, deleteLog, removeExercise } = useWeapon();
  const { group, setGroup, searchOpen, searchQuery, toggleSearch, setSearchQuery, vals, setVal } = useUIStore();
  const setModal = useUIStore((s) => s.setModal);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [wkPage, setWkPage] = useState<'workout' | 'history'>('workout');

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

  function handleLog(ex: PresetExercise) {
    const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
    const done = isLoggedToday(bucket, ex.n);
    if (done) {
      const todayLog = bucket.logs.find((l) => l.ex === ex.n && l.date === today);
      if (todayLog) deleteLog(todayLog.id);
    } else {
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
            <div>
              {exercises.map((ex) => {
                const done = isLoggedToday(bucket, ex.n);
                const isPrimary = ex === firstUnlogged;
                const v = vals[ex.n] ?? { kg: ex.start, reps: 10 };
                const lastLog = bucket.logs.filter((l) => l.ex === ex.n).slice(-1)[0];
                const isDetailOpen = openDetail === ex.n;

                return (
                  <div key={ex.n} className={`ex${isPrimary ? ' primary' : ''}${done ? ' selected' : ''}`}>
                    <div className="ex-wipe" />
                    <div className="ex-head" onClick={() => setOpenDetail(isDetailOpen ? null : ex.n)}>
                      <div>
                        <div className="ex-name">{ex.n}{searchQuery && ex.group && <span className="search-grouptag">{ex.group}</span>}</div>
                        <div className="ex-target">{ex.t}</div>
                        {lastLog && <div className="lastlog">Last: <b>{lastLog.kg}kg × {lastLog.reps}</b></div>}
                      </div>
                      {done && <span className="pill-done">Done</span>}
                      <span className="chev">›</span>
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
                      <button className={`logbtn${done ? ' is-done' : ''}`} onClick={() => handleLog(ex)}>
                        {done ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l4 4L19 6" /></svg>
                        ) : 'Log'}
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
                <div className="session-date">{fmtDate(date)}<small>{Math.round(vol)} kg vol</small></div>
                {dayLogs.map((l) => (
                  <div key={l.id} className="hentry">
                    <div>
                      <div><b>{l.kg}kg × {l.reps}</b> · {l.sets}s</div>
                      <div className="small">{l.ex}</div>
                    </div>
                    <button className="del" onClick={() => deleteLog(l.id)}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
          {sessionDates.length === 0 && <div className="empty">No history yet. Log your first set!</div>}
        </main>
      )}
    </>
  );
}
