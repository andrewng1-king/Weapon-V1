'use client';

import { useWeapon } from '@/hooks';
import { weekDates, calForVals } from '@/domain/metrics';
import { todayStr, fmtK } from '@/domain/format';
import { Chart } from './Chart';
import { drawGauge } from '@/ui/lib/charts';

export function GoalsTab() {
  const { state, setGoal } = useWeapon();
  if (!state) return null;

  const bucket = state[state.mode];
  const wd = weekDates();
  const today = todayStr();
  const target = state.goals.calTarget || 3000;

  const weekCals = wd.reduce((sum, d) => {
    return sum + bucket.logs.filter((l) => l.date === d).reduce((s, l) => s + calForVals(l.kg, l.reps, l.sets, state.bw), 0);
  }, 0);

  const pct = Math.min(1, weekCals / target);
  const daysLifted = new Set(wd.filter((d) => bucket.logs.some((l) => l.date === d))).size;

  return (
    <main>
      <div className="sectionTitle">Goals</div>

      <div className="card">
        <div className="goal-week">
          {wd.map((d, i) => {
            const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
            const trained = bucket.logs.some((l) => l.date === d);
            const isToday = d === today;
            return (
              <div key={d} className={`goal-day${trained ? ' trained' : ''}${isToday ? ' today' : ''}`}>
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
            <div className="gauge-val">{Math.round(weekCals)}</div>
            <div className="gauge-lbl">kcal this week</div>
          </div>
        </div>
        <div className="goal-target">
          <span>Weekly target</span>
          <input type="number" value={target} onChange={(e) => setGoal(+e.target.value || 3000)} />
          <span>kcal</span>
        </div>
      </div>

      <div className="goal-grid">
        <div className="goal-stat">
          <div className="gs-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg></div>
          <div className="gs-v">{Math.round(weekCals)}</div>
          <div className="gs-l">kcal burned</div>
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
