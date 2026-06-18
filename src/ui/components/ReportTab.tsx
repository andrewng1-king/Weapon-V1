'use client';

import { useState, useMemo } from 'react';
import { useWeapon } from '@/hooks';
import { fmtDate, todayStr } from '@/domain/format';
import { weekDates, setsByGroup } from '@/domain/metrics';
import { GROUP_COLORS, GROUPS, groupOf } from '@/domain/catalogue';
import { Chart } from './Chart';
import { drawWeek, drawSplit, lineChart } from '@/ui/lib/charts';

export function ReportTab() {
  const { state, deleteLog } = useWeapon();
  const [view, setView] = useState<'history' | 'report'>('history');
  const [progEx, setProgEx] = useState('');

  if (!state) return null;
  const bucket = state[state.mode];
  const today = todayStr();

  const sessionDates = useMemo(() => {
    const dates = [...new Set(bucket.logs.map((l) => l.date))].sort().reverse();
    return dates;
  }, [bucket.logs]);

  const wd = weekDates();
  const trained = wd.map((d) => bucket.logs.some((l) => l.date === d));

  const last30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cut = cutoff.toISOString().slice(0, 10);
    return bucket.logs.filter((l) => l.date >= cut);
  }, [bucket.logs]);

  const splitCounts = setsByGroup(last30);

  const loggedExercises = useMemo(() => [...new Set(bucket.logs.map((l) => l.ex))], [bucket.logs]);
  const selectedEx = progEx || loggedExercises[0] || '';
  const progLogs = bucket.logs.filter((l) => l.ex === selectedEx);

  return (
    <main>
      <div className="rep-switch">
        <button className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>History</button>
        <button className={view === 'report' ? 'on' : ''} onClick={() => setView('report')}>Report</button>
      </div>

      {view === 'history' ? (
        <div>
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
        </div>
      ) : (
        <div>
          <div className="sectionTitle">This week <small>{trained.filter(Boolean).length} / 7 days</small></div>
          <div className="card">
            <h2>Workout days</h2>
            <div className="hint">Days you trained this week</div>
            <Chart height={90} draw={(ctx, w, h) => drawWeek(ctx, w, h, wd, trained, today)} deps={[trained]} />
          </div>

          <div className="card">
            <h2>Muscle focus</h2>
            <div className="hint">Share of sets per muscle group — last 30 days</div>
            <Chart height={190} draw={(ctx, w, h) => drawSplit(ctx, w, h, splitCounts)} deps={[splitCounts]} />
            <div className="legend">
              {Object.entries(splitCounts).sort((a, b) => b[1] - a[1]).map(([g, c]) => (
                <span key={g}><i style={{ background: GROUP_COLORS[g as keyof typeof GROUP_COLORS] || '#888' }} />{g} — {c} sets</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Weight progress</h2>
            <div className="hint">Working weight over time</div>
            <select className="exsel" value={selectedEx} onChange={(e) => setProgEx(e.target.value)}>
              {loggedExercises.map((n) => <option key={n}>{n}</option>)}
            </select>
            <Chart height={200} draw={(ctx, w, h) => lineChart(ctx, w, h, progLogs.map((l) => ({ d: l.date, v: l.kg })))} deps={[selectedEx, progLogs.length]} />
            {progLogs.length > 0 && (() => {
              const first = progLogs[0].kg, last = progLogs[progLogs.length - 1].kg;
              const best = Math.max(...progLogs.map((l) => l.kg));
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
        </div>
      )}
    </main>
  );
}
