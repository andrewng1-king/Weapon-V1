'use client';

import { useState, useEffect } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { levelInfo, rankFor, MAXLVL } from '@/domain/ranks';
import { avStats } from '@/domain/metrics';
import { fmtK, fmtVol, todayStr } from '@/domain/format';

export function HomeTab() {
  const { state } = useWeapon();
  const setTab = useUIStore((s) => s.setTab);

  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
    const hr = new Date().getHours();
    setGreeting(hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  if (!state) return null;

  const bucket = state[state.mode];
  const li = levelInfo(bucket.logs);
  const rk = rankFor(li.lvl);
  const stats = avStats(bucket.logs, li.lvl);
  const today = todayStr();
  const loggedToday = bucket.logs.filter((l) => l.date === today).length;
  const profileName = state.profile?.name || 'Athlete';

  return (
    <main>
      <div className="home-hero">
        <div className="hh-date">{dateStr}</div>
        <div className="hh-greet">{greeting ? `${greeting}, ${profileName}` : ''}</div>
        <div className="hh-rank">
          <span className="hh-lv">Lv {li.lvl}</span>
          {rk.name}
        </div>
        <div className="hh-xpbar"><i style={{ width: `${Math.round((li.pct || 0) * 100)}%` }} /></div>
        <div className="hh-xptext">{li.lvl < MAXLVL ? `${li.into} / ${li.need} XP to next level` : 'Max level reached'}</div>
      </div>

      <div className="home-stats">
        <div className="hs-card"><b>{stats.streak}</b><span>Day streak</span></div>
        <div className="hs-card"><b>{fmtK(stats.sessions)}</b><span>Sessions</span></div>
        <div className="hs-card"><b>{fmtVol(stats.vol)}</b><span>Volume kg</span></div>
      </div>

      <div className="card home-today">
        <div className="ht-row">
          <div><div className="ht-lab">Logged today</div><div className="ht-sub">Sets recorded so far</div></div>
          <div className="ht-num">{loggedToday}</div>
        </div>
        <button className="ht-cta" onClick={() => setTab('workout')}>Start training</button>
      </div>
    </main>
  );
}
