'use client';

import { useState, useMemo } from 'react';
import { useWeapon } from '@/hooks';
import { fmtDate, todayStr } from '@/domain/format';
import { weekDates, setsByGroup, volume } from '@/domain/metrics';
import { GROUP_COLORS } from '@/domain/sports';
import type { LogEntry } from '@/domain/types';
import { Chart } from './Chart';
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
  const [view, setView] = useState<'history' | 'report'>('history');
  const [progEx, setProgEx] = useState('');
  const [weekDayIdx, setWeekDayIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });

  if (!state) return null;
  const sport = state.sport;
  const bucket = state.sports[sport];
  const today = todayStr();

  const sessionDates = useMemo(() => {
    return [...new Set(bucket.logs.map((l) => l.date))].sort().reverse();
  }, [bucket.logs]);

  const wd = weekDates();
  const trained = wd.map((d) => bucket.logs.some((l) => l.date === d));
  const selectedDate = wd[weekDayIdx];
  const dayDetail = bucket.logs.filter((l) => l.date === selectedDate);

  const last30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cut = cutoff.toISOString().slice(0, 10);
    return bucket.logs.filter((l) => l.date >= cut);
  }, [bucket.logs]);

  const splitCounts = setsByGroup(last30, sport, bucket.custom);

  const loggedExercises = useMemo(() => [...new Set(bucket.logs.map((l) => l.ex))], [bucket.logs]);
  const selectedEx = progEx || loggedExercises[0] || '';
  const progLogs = bucket.logs.filter((l) => l.ex === selectedEx);

  const progMetric = progLogs[0]?.metric ?? 'weight';
  const progValues = progLogs.map((l) => ({
    d: l.date,
    v: progMetric === 'weight' ? (l.kg ?? 0) : (l.v1 ?? 0),
  }));

  return (
    <main>
      <div className="rep-switch">
        <button type="button" className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>History</button>
        <button type="button" className={view === 'report' ? 'on' : ''} onClick={() => setView('report')}>Report</button>
      </div>

      {view === 'history' ? (
        <div>
          {sessionDates.map((date) => {
            const dayLogs = bucket.logs.filter((l) => l.date === date);
            const vol = dayLogs.reduce((s, l) => s + volume(l), 0);
            return (
              <div key={date}>
                <div className="session-date">{fmtDate(date)}<small>{Math.round(vol)} vol</small></div>
                {dayLogs.map((l) => (
                  <div key={l.id} className="hentry">
                    <div>
                      <div><b>{logSummary(l)}</b> · {l.sets}s{l.set_type ? ` · ${l.set_type}` : ''}</div>
                      <div className="small">{l.ex}</div>
                    </div>
                    <button type="button" className="del" onClick={() => deleteLog(l.id)}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
          {sessionDates.length === 0 && <div className="empty">No history yet. Log your first set!</div>}
        </div>
      ) : (
        <div>
          <div className="sectionTitle">This week <small>{trained.filter(Boolean).length} / 7 days</small></div>
          <div className="card">
            <h2>Workout days</h2>
            <div className="hint">Tap a day for detail</div>
            <Chart height={90} draw={(ctx, w, h) => drawWeek(ctx, w, h, wd, trained, today, weekDayIdx)} deps={[trained, weekDayIdx]} />
            <div className="rep-daypick">
              {wd.map((d, i) => {
                const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
                return (
                  <button
                    key={d}
                    type="button"
                    className={`rep-daybtn${i === weekDayIdx ? ' on' : ''}${trained[i] ? ' trained' : ''}`}
                    onClick={() => setWeekDayIdx(i)}
                  >
                    {dow}
                  </button>
                );
              })}
            </div>
            {dayDetail.length > 0 && (
              <div className="rep-daydetail">
                <div className="hint">{fmtDate(selectedDate)} — {dayDetail.length} entries</div>
                {dayDetail.map((l) => (
                  <div key={l.id} className="hentry compact">
                    <div><b>{logSummary(l)}</b> · {l.ex}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Focus split</h2>
            <div className="hint">Share of sets — last 30 days · {sport}</div>
            <Chart height={190} draw={(ctx, w, h) => drawSplit(ctx, w, h, splitCounts)} deps={[splitCounts]} />
            <div className="legend">
              {Object.entries(splitCounts).sort((a, b) => b[1] - a[1]).map(([g, c]) => (
                <span key={g}><i style={{ background: GROUP_COLORS[g] || '#888' }} />{g} — {c} sets</span>
              ))}
            </div>
          </div>

          {loggedExercises.length > 0 && (
            <div className="card">
              <h2>Progress</h2>
              <div className="hint">{progMetric === 'weight' ? 'Working weight over time' : 'Metric over time'}</div>
              <select className="exsel" value={selectedEx} onChange={(e) => setProgEx(e.target.value)}>
                {loggedExercises.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <Chart height={200} draw={(ctx, w, h) => lineChart(ctx, w, h, progValues)} deps={[selectedEx, progValues.length]} />
              {progValues.length > 0 && (() => {
                const first = progValues[0].v;
                const last = progValues[progValues.length - 1].v;
                const best = Math.max(...progValues.map((p) => p.v));
                const ch = first ? Math.round((last - first) / first * 100) : 0;
                return (
                  <div className="statrow">
                    <div className="stat"><div className="v">{first}</div><div className="l">First</div></div>
                    <div className="stat"><div className="v">{last}</div><div className="l">Now</div></div>
                    <div className="stat"><div className="v" style={{ color: 'var(--accent)' }}>{best}</div><div className="l">Best</div></div>
                    <div className="stat"><div className="v" style={{ color: ch >= 0 ? 'var(--good)' : 'var(--warn)' }}>{ch >= 0 ? '+' : ''}{ch}%</div><div className="l">Growth</div></div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
