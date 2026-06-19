'use client';

import { useWeapon, useUIStore } from '@/hooks';

export function Header() {
  const { state } = useWeapon();
  const setMenuOpen = useUIStore((s) => s.setMenuOpen);
  if (!state) return null;

  return (
    <header>
      <button className="hdr-menu" onClick={() => setMenuOpen(true)} aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <div className="brand-wrap">
        <div className="brand-logo" aria-label="EDGR">
          <span className="em-part">ED</span>
          <span className="em-g">G</span>
          <span className="em-part">R</span>
        </div>
      </div>
    </header>
  );
}
