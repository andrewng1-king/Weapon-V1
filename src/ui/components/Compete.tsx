'use client';

import { useEffect } from 'react';
import { useWeapon } from '@/hooks';
import { useUIStore, type CompeteTab } from '@/hooks/uiStore';
import { weaponScore } from '@/domain/weaponScore';

const CP_TABS: [CompeteTab, string][] = [
  ['score', 'Score'],
  ['throwdown', 'Throwdown'],
  ['board', 'Board'],
  ['challenges', 'Challenges'],
  ['crews', 'Crews'],
  ['feed', 'Feed'],
];

const TITLES: Record<CompeteTab, string> = {
  score: 'Weapon Score',
  throwdown: 'Throwdown',
  board: 'Leaderboard',
  challenges: 'Challenges',
  crews: 'Crews',
  feed: 'Feed',
};

/**
 * Compete hub overlay — port of legacy `#competeScreen`.
 *
 * Phase 6 ports the shell + Score tab content (uses `weaponScore`, already
 * wired in Phase 3). Throwdown / Board / Challenges / Crews / Feed are
 * stubbed with empty-state cards — full content is a follow-up phase since
 * each tab in legacy carries its own state + mock-data + sub-modals.
 */
export function Compete() {
  const { state } = useWeapon();
  const compete = useUIStore((s) => s.compete);
  const setCompeteTab = useUIStore((s) => s.setCompeteTab);
  const closeCompete = useUIStore((s) => s.closeCompete);

  // Lock body scroll while open (legacy: `document.body.style.overflow='hidden'`).
  useEffect(() => {
    if (!compete.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [compete.open]);

  if (!state) return null;
  const w = weaponScore(state);

  return (
    <section className={`compete${compete.open ? ' open' : ''}`} aria-hidden={!compete.open}>
      <div className="cp-head">
        <h2>{TITLES[compete.tab]}</h2>
        <button type="button" className="cp-x" onClick={closeCompete} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="cp-seg">
        {CP_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={compete.tab === id ? 'on' : ''}
            onClick={() => setCompeteTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cp-body">
        {compete.tab === 'score' ? (
          <ScorePanel
            total={w.total}
            strength={w.strength}
            engine={w.engine}
            parts={w.parts}
            note={w.note}
          />
        ) : (
          <ComingSoon tab={compete.tab} />
        )}
      </div>
    </section>
  );
}

interface ScorePanelProps {
  total: number;
  strength: number | null;
  engine: number | null;
  parts: { name: string; score: number; detail: string }[];
  note: string;
}

function ScorePanel({ total, strength, engine, parts, note }: ScorePanelProps) {
  const R = 72;
  const C = 2 * Math.PI * R;
  const off = C * (1 - total / 100);

  return (
    <>
      <div className="ws-hero">
        <div className="ws-ring">
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle cx="84" cy="84" r={R} fill="none" stroke="var(--track)" strokeWidth="12" />
            <circle
              cx="84" cy="84" r={R}
              fill="none" stroke="var(--accent)" strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C.toFixed(1)}
              strokeDashoffset={off.toFixed(1)}
            />
          </svg>
          <div className="ws-val">
            <div className="ws-num">{total}</div>
            <div className="ws-cap">Weapon Score</div>
          </div>
        </div>
        <div className="ws-split">
          <div><b>{strength != null ? strength : '—'}</b><span>Strength</span></div>
          <div><b>{engine != null ? engine : '—'}</b><span>Engine</span></div>
        </div>
      </div>

      <div className="cp-card">
        <h3>How it&apos;s built</h3>
        <div className="cp-sub">
          Transparent v1 — each effort scored 0–100 vs a reference standard, then averaged per modality.
        </div>
        {parts.length > 0 ? (
          parts.map((p) => (
            <div key={p.name} className="ws-part">
              <div className="wp-name">
                {p.name}
                <div className="lb-meta">{p.detail}</div>
              </div>
              <div className="wp-bar"><i style={{ width: `${p.score}%` }} /></div>
              <div className="wp-sc">{p.score}</div>
            </div>
          ))
        ) : (
          <div className="cp-empty">No qualifying efforts yet.</div>
        )}
        {note && <div className="cp-note">{note}</div>}
      </div>
    </>
  );
}

function ComingSoon({ tab }: { tab: CompeteTab }) {
  const blurbs: Record<CompeteTab, string> = {
    score: '',
    throwdown: 'The Weapon Throwdown — a fixed benchmark workout. Log attempts and watch your PB drop.',
    board: 'Global, city, and following leaderboards. Filter by division, age, and sex.',
    challenges: 'Time-boxed mini-competitions between throwdowns. Join one and climb its mini-board.',
    crews: 'Train with friends. Share scores and call each other out.',
    feed: 'Recent attempts and PRs from people you follow.',
  };
  return (
    <div className="cp-card">
      <h3>{TITLES[tab]}</h3>
      <div className="cp-sub">{blurbs[tab]}</div>
      <div className="cp-empty">Coming soon — local-first MVP in progress.</div>
    </div>
  );
}
