'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useWeapon } from '@/hooks';
import { fmtDate, todayStr } from '@/domain/format';
import { weekDates, setsByGroup, primaryVal } from '@/domain/metrics';
import { catColor, groupOf } from '@/domain/catalogue';
import { Chart } from './Chart';
import { drawWeek, drawSplit, lineChart } from '@/ui/lib/charts';
import type { LogEntry } from '@/domain/types';

/** Human-readable metric summary for a single log. */
function fmtLogMeta(l: LogEntry): string {
  if (!l.m || l.m === 'weight') {
    return l.kg ? `${l.kg} kg × ${l.reps}` : `${l.reps} reps`;
  }
  const u1 = l.u1 ?? '';
  if (l.m === 'dist') {
    const main = `${l.v1 ?? 0} ${u1}`.trim();
    return l.v2 != null ? `${main} · ${l.v2} ${l.u2 ?? 'min'}`.trim() : main;
  }
  if (l.m === 'hold') return `${l.v1 ?? 0} ${u1 || 'sec'}`;
  return `${l.v1 ?? 0} ${u1 || 'reps'}`;
}

export function ReportTab() {
  const { state } = useWeapon();
  const [progEx, setProgEx] = useState('');
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const dayPickRef = useRef<HTMLDivElement>(null);

  // close the day menu when clicking outside of it
  useEffect(() => {
    if (!dayMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dayPickRef.current && !dayPickRef.current.contains(e.target as Node)) setDayMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [dayMenuOpen]);

  if (!state) return null;
  const sport = state.sport;
  const bucket = state.sports[sport];
  const today = todayStr();

  const sessionDates = useMemo(
    () => [...new Set(bucket.logs.map((l) => l.date))].sort().reverse(),
    [bucket.logs]
  );

  const wd = weekDates();
  const trained = wd.map((d) => bucket.logs.some((l) => l.date === d));

  const last30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cut = cutoff.toISOString().slice(0, 10);
    return bucket.logs.filter((l) => l.date >= cut);
  }, [bucket.logs]);

  const splitCounts = setsByGroup(last30, sport);

  const loggedExercises = useMemo(() => [...new Set(bucket.logs.map((l) => l.ex))], [bucket.logs]);
  const selectedEx = progEx || loggedExercises[0] || '';
  const progLogs = bucket.logs.filter((l) => l.ex === selectedEx);

  // ── Day progress: review a past training day ──
  const dayDate = selectedDay && sessionDates.includes(selectedDay) ? selectedDay : sessionDates[0] ?? null;
  const dayLogs = dayDate ? bucket.logs.filter((l) => l.date === dayDate) : [];
  const dayVol = dayLogs.reduce((s, l) => s + l.kg * l.reps * l.sets, 0);
  const dayGroups = [...new Set(dayLogs.map((l) => groupOf(sport, l.ex)).filter(Boolean))].join(' · ');

  return (
    <main>
      <div className="sectionTitle">This week <small>{trained.filter(Boolean).length} / 7 days</small></div>

      <div className="card">
        <h2>Workout days</h2>
        <div className="hint">Days you trained this week</div>
        <Chart height={90} draw={(ctx, w, h) => drawWeek(ctx, w, h, wd, trained, today)} deps={[trained]} />
      </div>

      <div className="card">
        <h2>Muscle focus</h2>
        <div className="hint">Share of sets per muscle group — last 30 days</div>
        <Chart height={190} draw={(ctx, w, h) => drawSplit(ctx, w, h, splitCounts, (g) => catColor(sport, g))} deps={[splitCounts]} />
        <div className="legend">
          {Object.entries(splitCounts).sort((a, b) => b[1] - a[1]).map(([g, c]) => (
            <span key={g}><i style={{ background: catColor(sport, g) }} />{g} — {c} sets</span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Day progress</h2>
        <div className="hint">Review a past training day</div>
        <div className="daypick" ref={dayPickRef}>
          <button className={`day-btn${dayMenuOpen ? ' open' : ''}`} onClick={() => setDayMenuOpen((o) => !o)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
            <span>{dayDate ? fmtDate(dayDate) : 'No days'}</span>
            <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <div className={`day-menu${dayMenuOpen ? ' open' : ''}`}>
            {sessionDates.length ? (
              sessionDates.map((d) => (
                <button key={d} className={d === dayDate ? 'on' : ''} onClick={() => { setSelectedDay(d); setDayMenuOpen(false); }}>{fmtDate(d)}</button>
              ))
            ) : (
              <button disabled>No days logged</button>
            )}
          </div>
        </div>
        {dayDate ? (
          <div>
            <div className="day-sum">{dayGroups || '—'}{dayVol ? ` · ${Math.round(dayVol).toLocaleString('en-US')} kg` : ''} · {dayLogs.length} logged</div>
            {dayLogs.map((l) => (
              <div key={l.id} className="rec-row">
                <span className="rx-ex">{l.ex}</span>
                <span className="rx-meta">{fmtLogMeta(l)}{l.sets > 1 ? ` · ${l.sets} sets` : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '18px 0' }}>No training days yet</div>
        )}
      </div>

      <div className="card">
        <h2>Weight progress</h2>
        <div className="hint">Working weight over time</div>
        <select className="exsel" value={selectedEx} onChange={(e) => setProgEx(e.target.value)}>
          {loggedExercises.length ? loggedExercises.map((n) => <option key={n}>{n}</option>) : <option>Nothing logged yet</option>}
        </select>
        <Chart height={200} draw={(ctx, w, h) => lineChart(ctx, w, h, progLogs.map((l) => ({ d: l.date, v: primaryVal(l) })))} deps={[selectedEx, progLogs.length]} />
        {progLogs.length > 0 && (() => {
          const first = primaryVal(progLogs[0]), last = primaryVal(progLogs[progLogs.length - 1]);
          const best = Math.max(...progLogs.map((l) => primaryVal(l)));
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
    </main>
  );
}
