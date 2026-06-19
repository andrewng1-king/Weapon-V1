'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { SPORTS } from '@/domain/sports';
import { SPORT_IDS, type SportId } from '@/domain/types';

const ICONS: Record<SportId, ReactNode> = {
  gym: <path d="M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13" />,
  run: (
    <>
      <circle cx="13" cy="4.5" r="2" />
      <path d="M6 21l3.5-6 3-2.5 1.5 4 3 3M9.5 12.5 8 8l5-1.5 3 3 3 .5" />
    </>
  ),
  calisthenics: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M5 8h14M12 6.5V14m0 0-4 7m4-7 4 7" />
    </>
  ),
  hyrox: <path d="M3 7h4l2 10 3-14 3 14 2-10h4" />,
  swimming: (
    <>
      <circle cx="7" cy="8" r="1.8" />
      <path d="M4 17c2 0 2 1.5 4 1.5S12 17 14 17s2 1.5 4 1.5 2-1.5 2-1.5M10 13l4-3 3 2M9.5 10.5 13 7" />
    </>
  ),
  boxing: (
    <>
      <path d="M9 5h5a4 4 0 0 1 4 4v2a3 3 0 0 1-3 3H9zM9 5 6.5 7.5A3 3 0 0 0 5.5 9.7V13a2 2 0 0 0 2 2H9M9 5v10" />
    </>
  ),
  bodyweight: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 6.5v6m0 0-4 8m4-8 4 8M6 9l6 1 6-1" />
    </>
  ),
  trail: <path d="M3 18h18M6 18l4-8 3 4 2-3 3 7M9.5 11.5 11 9" />,
  trekking: <path d="M3 19h18M7 19l5-13 3 7 2-2 2 8M11 8l1.5-2.5" />,
};

export function SportBar({ sport, onChange }: { sport: SportId; onChange: (s: SportId) => void }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const active = bar.querySelector('.sport-chip.on');
    active?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [sport]);

  return (
    <div ref={barRef} className="sportbar" role="tablist" aria-label="Sport">
      {SPORT_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={sport === id}
          className={`sport-chip${sport === id ? ' on' : ''}`}
          onClick={() => onChange(id)}
        >
          <svg
            className="vortex"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONS[id]}
          </svg>
          <span>{SPORTS[id].name}</span>
        </button>
      ))}
    </div>
  );
}
