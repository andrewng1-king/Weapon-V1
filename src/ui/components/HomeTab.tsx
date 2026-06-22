'use client';

import { useEffect, useState } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { weaponScore } from '@/domain/weaponScore';
import { showToast } from './Toast';

type TileKey = 'train' | 'run' | 'challenge' | 'social';

export function HomeTab() {
  const { state, setSport } = useWeapon();
  const setTab = useUIStore((s) => s.setTab);
  const openCompete = useUIStore((s) => s.openCompete);

  // Greeting depends on `new Date()` — compute after mount to avoid SSR mismatch.
  const [greet, setGreet] = useState('');
  useEffect(() => {
    const hr = new Date().getHours();
    setGreet(
      hr < 5 ? 'Still up'
        : hr < 12 ? 'Good morning'
          : hr < 18 ? 'Good afternoon'
            : 'Good evening',
    );
  }, []);

  const name = state.profile?.name || 'You';
  const w = weaponScore(state);
  const sub = w.strength != null && w.engine != null
    ? `STR ${w.strength} · ENG ${w.engine}`
    : w.note;

  function goTile(key: TileKey) {
    if (key === 'train') {
      setSport('gym');
      setTab('workout');
    } else if (key === 'run') {
      setSport('run');
      setTab('workout');
    } else {
      showToast('Coming soon');
    }
  }

  return (
    <main>
      <div className="home-greet">{greet ? `${greet}, ${name}` : ''}</div>

      <button
        type="button"
        className="home-compete"
        onClick={() => openCompete('score')}
      >
        <div className="hc-score">{w.total}</div>
        <div className="hc-mid">
          <div className="hc-lab">Weapon Score</div>
          <div className="hc-name">Compete &amp; Throwdown</div>
          <div className="hc-sub">{sub}</div>
        </div>
        <div className="hc-go">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </button>

      <div className="home-tiles">
        <HomeTile keyId="train" label="Train" img="/images/train.jpg" onSelect={goTile} />
        <HomeTile keyId="run" label="Run" img="/images/run.jpg" onSelect={goTile} />
        <HomeTile keyId="challenge" label="Challenge" img="/images/challenge.jpg" onSelect={goTile} />
        <HomeTile keyId="social" label="Social" img="/images/social.jpg" onSelect={goTile} />
      </div>
    </main>
  );
}

interface HomeTileProps {
  keyId: TileKey;
  label: string;
  img: string;
  onSelect: (key: TileKey) => void;
}

function HomeTile({ keyId, label, img, onSelect }: HomeTileProps) {
  return (
    <button type="button" className="home-tile" onClick={() => onSelect(keyId)}>
      <span className="ht-img" style={{ backgroundImage: `url('${img}')` }} />
      <span className="ht-cap"><span>{label}</span></span>
    </button>
  );
}
