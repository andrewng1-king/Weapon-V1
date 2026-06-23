'use client';

import { useWeapon, useUIStore } from '@/hooks';
import { weekDates, calForLog } from '@/domain/metrics';
import { sportDef } from '@/domain/catalogue';
import { todayStr } from '@/domain/format';
import { Chart } from './Chart';
import { drawGauge } from '@/ui/lib/charts';

export function GoalsTab() {
  const { state, setGoal } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);
  if (!state) return null;

  const sport = state.sport;
  const bucket = state.sports[sport];
  const def = sportDef(sport);
  const goal = def.goal;
  const wd = weekDates();
  const today = todayStr();
  const target = state.goals.targets[sport] ?? goal.def;

  const daysLifted = new Set(wd.filter((d) => bucket.logs.some((l) => l.date === d))).size;

  // weekly value depends on the sport's goal kind
  const weekValue = (() => {
    if (goal.kind === 'sessions') return daysLifted;
    if (goal.kind === 'dist') {
      return wd.reduce(
        (sum, d) =>
          sum +
          bucket.logs
            .filter((l) => l.date === d && (l.m === 'dist' || !l.m))
            .reduce((s, l) => {
              const v = l.v1 ?? 0;
              return s + (l.u1 === 'm' ? v / 1000 : v);
            }, 0),
        0
      );
    }
    // cal
    return wd.reduce(
      (sum, d) => sum + bucket.logs.filter((l) => l.date === d).reduce((s, l) => s + calForLog(l, state.bw), 0),
      0
    );
  })();

  const weekRounded = goal.kind === 'dist' ? Math.round(weekValue * 10) / 10 : Math.round(weekValue);
  const pct = Math.min(1, target > 0 ? weekValue / target : 0);

  return (
    <main>
      <div className="sectionTitle">Goals</div>

      <div className="card" style={{ cursor: 'pointer' }} onClick={() => setModal('calendar')}>
        <h2>This week</h2>
        <div className="hint">Days you trained · tap to open history</div>
        <div className="goal-week">
          {wd.map((d, i) => {
            const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
            const trained = bucket.logs.some((l) => l.date === d);
            const isToday = d === today;
            return (
              <div
                key={d}
                className={`goal-day${trained ? ' trained' : ''}${isToday ? ' today' : ''}`}
                onClick={(e) => { e.stopPropagation(); setModal('calendar'); }}
              >
                <div className="gd-dow">{dow}</div>
                <div className="gd-num">{+d.slice(-2)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="gauge-wrap">
          <Chart height={170} draw={(ctx, w, h) => drawGauge(ctx, w, h, pct)} deps={[pct]} />
          <div className="gauge-center">
            <div className="gauge-val">{weekRounded}</div>
            <div className="gauge-lbl">{goal.unit} this week</div>
          </div>
        </div>
        <div className="goal-target">
          <span>{goal.label}</span>
          <input type="number" value={target} onChange={(e) => setGoal(sport, +e.target.value || goal.def)} />
          <span>{goal.unit}</span>
        </div>
      </div>

      <div className="goal-grid">
        <div className="goal-stat">
          <div className="gs-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg></div>
          <div className="gs-v">{weekRounded}</div>
          <div className="gs-l">{goal.unit} this week</div>
        </div>
        <div className="goal-stat">
          <div className="gs-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4" /></svg></div>
          <div className="gs-v">{daysLifted}</div>
          <div className="gs-l">days lifted</div>
        </div>
        <div className="goal-stat">
          <div className="gs-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 2.5" /></svg></div>
          <div className="gs-v">{state.bw}</div>
          <div className="gs-l">bodyweight</div>
        </div>
        <div className="goal-stat">
          <div className="gs-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19h16M4 15l4-6 4 4 4-8 4 6" /></svg></div>
          <div className="gs-v">—</div>
          <div className="gs-l">steps</div>
        </div>
      </div>
    </main>
  );
}
