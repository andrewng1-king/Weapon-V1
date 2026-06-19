'use client';

import { useState } from 'react';
import { useWeapon, useUIStore } from '@/hooks';

type Row = { rk: number; av: string; avBg: string; avFg: string; name: string; meta: string; score: number; delta: 'up' | 'down' | 'same'; d: string };

const PODIUM = [
  { pos: 'second', av: 'RP', bg: '#3a2520', fg: '#e0603a', name: 'r.pace', score: '4,210' },
  { pos: 'first', av: 'MK', bg: 'var(--accent)', fg: 'var(--accent-ink)', name: 'minh_k', score: '5,840' },
  { pos: 'third', av: 'JL', bg: '#16302a', fg: '#3ddc97', name: 'jess.lifts', score: '3,670' },
];

const ROWS: Row[] = [
  { rk: 4, av: 'AN', avBg: '#241f3a', avFg: '#9b8cff', name: 'ana.n', meta: '6 sessions · run + lift', score: 3120, delta: 'up', d: '+2 ↑' },
  { rk: 5, av: 'DT', avBg: '#1e2c3a', avFg: '#7eb6e8', name: 'duc.tri', meta: '5 sessions · triathlon', score: 2880, delta: 'same', d: '— same' },
  { rk: 6, av: 'HN', avBg: '#3a2a16', avFg: '#e0a23a', name: 'hung.nx', meta: '4 sessions · strength', score: 2540, delta: 'down', d: '−1 ↓' },
  { rk: 7, av: 'SK', avBg: '#2a2a2a', avFg: '#bbb', name: 'sam.k', meta: '4 sessions · hybrid', score: 2310, delta: 'up', d: '+1 ↑' },
  { rk: 8, av: 'LO', avBg: '#2a2a2a', avFg: '#bbb', name: 'leo.runs', meta: '3 sessions · run', score: 2090, delta: 'down', d: '−2 ↓' },
];

const SCOPES = ['Following', 'City', 'Global'];

export function RankScreen() {
  const { state } = useWeapon();
  const rankOpen = useUIStore((s) => s.rankOpen);
  const setRankOpen = useUIStore((s) => s.setRankOpen);
  const [scope, setScope] = useState('Following');

  const name = state?.profile?.name || 'Athlete';
  const handle = name.toLowerCase().replace(/\s+/g, '.');
  const initials = name.trim().slice(0, 2).toUpperCase();

  return (
    <section className={`rankscreen${rankOpen ? ' on' : ''}`} aria-hidden={!rankOpen}>
      <div className="rank-top">
        <div className="brand-logo" aria-label="Rank">
          <span className="em-part">RAN</span>
          <span className="em-g">K</span>
        </div>
        <button className="cp-x" type="button" onClick={() => setRankOpen(false)} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <div className="rank-body">
        <div className="rank-hd">Weekly edge</div>
        <div className="rank-sub">Jun 16 – 22 · <b>4 days left</b></div>

        <div className="rank-chips">
          {SCOPES.map((s) => (
            <button key={s} className={`chip${scope === s ? ' on' : ''}`} onClick={() => setScope(s)}>{s}</button>
          ))}
        </div>

        <div className="podium">
          {PODIUM.map((p) => (
            <div key={p.name} className={`pod ${p.pos}`}>
              {p.pos === 'first' && <div className="star">★</div>}
              <div className="pav" style={{ background: p.bg, color: p.fg }}>{p.av}</div>
              <div className="pn">{p.name}</div>
              <div className="ps" style={{ color: p.fg === 'var(--accent-ink)' ? 'var(--accent)' : p.fg }}>{p.score}</div>
              <div className="pr">{p.pos === 'first' ? '1st' : p.pos === 'second' ? '2nd' : '3rd'}</div>
              <div className="plat" />
            </div>
          ))}
        </div>

        <div className="rank-list-lab">Ranks 4 – 8</div>
        {ROWS.map((r) => (
          <div key={r.rk} className="rrow">
            <div className="rk">{r.rk}</div>
            <div className="rav" style={{ background: r.avBg, color: r.avFg }}>{r.av}</div>
            <div className="rmid"><div className="rname">{r.name}</div><div className="rmeta">{r.meta}</div></div>
            <div><div className="rsc">{r.score.toLocaleString()}</div><div className={`rdelta ${r.delta}`}>{r.d}</div></div>
          </div>
        ))}

        <div className="youcard">
          <div className="rk">9</div>
          <div className="ylab">YOU</div>
          <div className="rmid"><div className="rname">{handle}</div><div className="rmeta">{initials} · 3 sessions · 1,920 pts</div></div>
          <div><div className="yedge">Your edge</div><div className="rdelta up">+3 ↑</div></div>
        </div>
      </div>
    </section>
  );
}
