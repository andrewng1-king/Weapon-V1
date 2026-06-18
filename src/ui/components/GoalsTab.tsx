'use client';

import { useWeapon } from '@/hooks';
import { weekDates, weeklyGoalValue } from '@/domain/metrics';
import { sportDef } from '@/domain/sports';
import { todayStr, fmtK } from '@/domain/format';
import { Chart } from './Chart';
import { drawGauge } from '@/ui/lib/charts';

export function GoalsTab() {
  const { state, setSportGoal } = useWeapon();
  const sport = state.sport;
  const bucket = state.sports[sport];
  const wd = weekDates();
  const today = todayStr();
  const def = sportDef(sport);
  const target = state.goals[sport]?.target ?? def.goal.def;
  const { value: weekVal, pct } = weeklyGoalValue(sport, bucket.logs, state.bw, target);
  const daysLifted = new Set(wd.filter((d) => bucket.logs.some((l) => l.date === d))).size;

  return (
    <main>
      <div className="sectionTitle">Goals · {def.name}</div>
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
            <div className="gauge-val">{Math.round(weekVal)}</div>
            <div className="gauge-lbl">{def.goal.unit} this week</div>
          </div>
        </div>
        <div className="goal-target">
          <span>{def.goal.label}</span>
          <input type="number" value={target} onChange={(e) => setSportGoal(sport, +e.target.value || def.goal.def)} />
          <span>{def.goal.unit}</span>
        </div>
      </div>
      <div className="goal-grid">
        <div className="goal-stat">
          <div className="gs-v">{Math.round(weekVal)}</div>
          <div className="gs-l">{def.goal.unit}</div>
        </div>
        <div className="goal-stat">
          <div className="gs-v">{daysLifted}</div>
          <div className="gs-l">days trained</div>
        </div>
        <div className="goal-stat">
          <div className="gs-v">{state.bw}</div>
          <div className="gs-l">bodyweight kg</div>
        </div>
        <div className="goal-stat">
          <div className="gs-v">—</div>
          <div className="gs-l">steps</div>
        </div>
      </div>
    </main>
  );
}
