'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWeapon } from '@/hooks';
import { fmtDate, fmtK, todayStr } from '@/domain/format';
import { weekDates, setsByGroup, volume } from '@/domain/metrics';
import { groupOfSport } from '@/domain/sports';
import { GROUP_COLORS } from '@/domain/sports';
import type { LogEntry } from '@/domain/types';
import { Chart } from './Chart';
import { CountUp } from './CountUp';
import { drawWeek, drawSplit, lineChart } from '@/ui/lib/charts';

function logSummary(l: LogEntry): string {
  const metric = l.metric ?? 'weight';
  if (metric === 'weight') return `${l.kg ?? 0}kg × ${l.reps ?? 0}`;
  const u1 = l.u1 ?? '';
  const u2 = l.u2 ?? '';
  if (metric === 'dist' || metric === 'time') return `${l.v1 ?? 0}${u1}`;
  if (l.v2 != null) return `${l.v1 ?? 0}${u1} · ${l.v2}${u2}`;
  return `${l.v1 ?? 0}${u1}`;
}

export function ReportTab() {
  const { state, deleteLog } = useWeapon();
  const sport = state.sport;
  const bucket = state.sports[sport];
  const today = todayStr();

  const [view, setView] = useState<'history' | 'report'>('history');
  const [progEx, setProgEx] = useState('');
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const dayPickRef = useRef<HTMLDivElement>(null);

  // Close the day-picker menu on outside click (legacy parity).
  useEffect(() => {
    if (!dayMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (dayPickRef.current && !dayPickRef.current.contains(e.target as Node)) {
        setDayMenuOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [dayMenuOpen]);

  const sessionDates = useMemo(
    () => [...new Set(bucket.logs.map((l) => l.date))].sort().reverse(),
    [bucket.logs],
  );

  const wd = weekDates();
  const trained = wd.map((d) => bucket.logs.some((l) => l.date === d));

  const last30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cut = cutoff.toISOString().slice(0, 10);
    return bucket.logs.filter((l) => l.date >= cut);
  }, [bucket.logs]);

  const splitCounts = useMemo(
    () => setsByGroup(last30, sport, bucket.custom),
    [last30, sport, bucket.custom],
  );

  // Day-progress: snap selection to the most recent logged day when stale.
  const effectiveDay = dayDate && sessionDates.includes(dayDate)
    ? dayDate
    : (sessionDates[0] ?? null);

  const dayLogs = effectiveDay
    ? bucket.logs.filter((l) => l.date === effectiveDay)
    : [];
  const dayVol = dayLogs.reduce((a, l) => a + volume(l), 0);
  const dayGroups = [
    ...new Set(
      dayLogs
        .map((l) => groupOfSport(sport, l.ex, bucket.custom))
        .filter(Boolean) as string[],
    ),
  ].join(' · ');

  const loggedExercises = useMemo(
    () => [...new Set(bucket.logs.map((l) => l.ex))],
    [bucket.logs],
  );
  const selectedEx = progEx || loggedExercises[0] || '';
  const progLogs = bucket.logs.filter((l) => l.ex === selectedEx);
  const progMetric = progLogs[0]?.metric ?? 'weight';
  const progValues = progLogs.map((l) => ({
    d: l.date,
    v: progMetric === 'weight' ? (l.kg ?? 0) : (l.v1 ?? 0),
  }));

  const stats = progValues.length
    ? (() => {
      const first = progValues[0].v;
      const last = progValues[progValues.length - 1].v;
      const best = Math.max(...progValues.map((p) => p.v));
      const ch = first ? Math.round(((last - first) / first) * 100) : 0;
      return { first, last, best, ch };
    })()
    : null;

  return (
    <main>
      <div className="rep-switch">
        <button type="button" className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>History</button>
        <button type="button" className={view === 'report' ? 'on' : ''} onClick={() => setView('report')}>Report</button>
      </div>

      {view === 'history' ? (
        sessionDates.length === 0 ? (
          <div className="empty">No workouts logged yet</div>
        ) : (
          <div>
            <div className="sectionTitle">History</div>
            {sessionDates.map((date) => {
              // Newest-first within a day (logs are appended chronologically).
              const dayList = bucket.logs.filter((l) => l.date === date).slice().reverse();
              const vol = dayList.reduce((s, l) => s + volume(l), 0);
              const groups = [
                ...new Set(
                  dayList
                    .map((l) => groupOfSport(sport, l.ex, bucket.custom))
                    .filter(Boolean) as string[],
                ),
              ].join(' · ');
              return (
                <div key={date}>
                  <div className="session-date">
                    {fmtDate(date)}
                    <small>{groups || '—'}{vol ? ` · ${fmtK(vol)} kg` : ''}</small>
                  </div>
                  {dayList.map((l) => (
                    <div key={l.id} className="hentry">
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.ex}</div>
                        <div className="small">
                          {(l.metric ?? 'weight') === 'weight' ? (
                            <>{l.reps ?? 0} reps @ <b>{l.kg ?? 0} kg</b></>
                          ) : (
                            <>{logSummary(l)} · {l.sets}s</>
                          )}
                        </div>
                      </div>
                      <button type="button" className="del" onClick={() => deleteLog(l.id)}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div>
          <div className="sectionTitle">This week <small>{trained.filter(Boolean).length} / 7 days</small></div>

          <div className="card">
            <h2>Workout days</h2>
            <div className="hint">Days you trained this week</div>
            <Chart
              height={90}
              draw={(ctx, w, h) => drawWeek(ctx, w, h, wd, trained, today)}
              deps={[trained.join(',')]}
            />
          </div>

          <div className="card">
            <h2>Muscle focus</h2>
            <div className="hint">Share of sets per muscle group — last 30 days</div>
            <Chart
              height={190}
              draw={(ctx, w, h) => drawSplit(ctx, w, h, splitCounts)}
              deps={[splitCounts]}
            />
            <div className="legend">
              {Object.entries(splitCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([g, c]) => (
                  <span key={g}>
                    <i style={{ background: GROUP_COLORS[g] || '#888' }} />
                    {g} — {c} sets
                  </span>
                ))}
            </div>
          </div>

          <div className="card">
            <h2>Day progress</h2>
            <div className="hint">Review a past training day</div>
            <div className="daypick" ref={dayPickRef}>
              <button
                type="button"
                className={`day-btn${dayMenuOpen ? ' open' : ''}`}
                onClick={() => setDayMenuOpen((o) => !o)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                  <path d="M3.5 9.5h17M8 3v4M16 3v4" />
                </svg>
                <span>{effectiveDay ? fmtDate(effectiveDay) : 'No days'}</span>
                <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div className={`day-menu${dayMenuOpen ? ' open' : ''}`}>
                {sessionDates.length === 0 ? (
                  <button type="button" disabled>No days logged</button>
                ) : (
                  sessionDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={d === effectiveDay ? 'on' : ''}
                      onClick={() => { setDayDate(d); setDayMenuOpen(false); }}
                    >
                      {fmtDate(d)}
                    </button>
                  ))
                )}
              </div>
            </div>
            {effectiveDay ? (
              <div>
                <div className="day-sum">
                  {(dayGroups || '—')} · {fmtK(dayVol)} kg · {dayLogs.length} lifts
                </div>
                {dayLogs.map((l) => (
                  <div key={l.id} className="rec-row">
                    <span className="rx-ex">{l.ex}</span>
                    <span className="rx-meta">
                      {(l.metric ?? 'weight') === 'weight'
                        ? `${l.reps ?? 0} reps @ ${l.kg ?? 0} kg`
                        : logSummary(l)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: '18px 0' }}>No training days yet</div>
            )}
          </div>

          <div className="card">
            <h2>Weight progress</h2>
            <div className="hint">{progMetric === 'weight' ? 'Working weight over time' : 'Metric over time'}</div>
            {loggedExercises.length > 0 && (
              <select className="exsel" value={selectedEx} onChange={(e) => setProgEx(e.target.value)}>
                {loggedExercises.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
            <Chart
              height={200}
              draw={(ctx, w, h) => lineChart(ctx, w, h, progValues)}
              deps={[selectedEx, progValues.length]}
            />
            {stats && (
              <div className="statrow">
                <div className="stat">
                  <div className="v"><CountUp key={`first-${selectedEx}`} value={stats.first} /></div>
                  <div className="l">First</div>
                </div>
                <div className="stat">
                  <div className="v"><CountUp key={`last-${selectedEx}`} value={stats.last} /></div>
                  <div className="l">Now</div>
                </div>
                <div className="stat">
                  <div className="v" style={{ color: 'var(--accent)' }}>
                    <CountUp key={`best-${selectedEx}`} value={stats.best} />
                  </div>
                  <div className="l">Best</div>
                </div>
                <div className="stat">
                  <div className="v" style={{ color: stats.ch >= 0 ? 'var(--good)' : 'var(--warn)' }}>
                    <CountUp
                      key={`ch-${selectedEx}`}
                      value={stats.ch}
                      format={(n) => `${stats.ch >= 0 ? '+' : ''}${Math.round(n)}%`}
                    />
                  </div>
                  <div className="l">Growth</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
