'use client';

import { SPORTS } from '@/domain/sports';
import { SPORT_IDS, type SportId } from '@/domain/types';

const ICONS: Record<SportId, string> = {
  gym: 'M2 9v6M5.5 7v10M18.5 7v10M22 9v6M5.5 12h13',
  run: 'M6 21l3.5-6 3-2.5 1.5 4 3 3',
  calisthenics: 'M5 8h14M12 6.5V14m0 0-4 7m4-7 4 7',
  hyrox: 'M3 7h4l2 10 3-14 3 14 2-10h4',
  swimming: 'M4 17c2 0 2 1.5 4 1.5S12 17 14 17s2 1.5 4 1.5',
  boxing: 'M9 5h5a4 4 0 0 1 4 4v2a3 3 0 0 1-3 3H9z',
  bodyweight: 'M12 6.5v6m0 0-4 8m4-8 4 8',
  trail: 'M3 18h18M6 18l4-8 3 4 2-3 3 7',
  trekking: 'M3 19h18M7 19l5-13 3 7 2-2 2 8',
};

export function SportBar({ sport, onChange }: { sport: SportId; onChange: (s: SportId) => void }) {
  return (
    <div className="sport-bar" role="tablist" aria-label="Sport">
      {SPORT_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={sport === id}
          className={`sport-chip${sport === id ? ' on' : ''}`}
          onClick={() => onChange(id)}
        >
          <svg className="vortex" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONS[id]} />
          </svg>
          {SPORTS[id].name}
        </button>
      ))}
    </div>
  );
}
