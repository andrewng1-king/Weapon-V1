'use client';

import { useWeapon, useUIStore } from '@/hooks';

/**
 * Header — port of legacy `<header>` block.
 *
 * Layout mirrors `_legacy/index.html` line 678:
 *   [menu] [brand-logo (cycle)] [seg: Strength | Endure]
 *
 * Multi-sport state is still in the data model (Phase 0 nợ); the
 * Strength/Endure toggle simply binds to `setSport('gym' | 'run')`,
 * mirroring legacy `setMode` while keeping the existing schema intact.
 * `useThemeSync` reads the resulting sport and writes `body[data-mode]`
 * so CSS that targets the legacy attribute keeps working.
 */
export function Header() {
  const { state, toggleLogo, setSport } = useWeapon();
  const setMenuOpen = useUIStore((s) => s.setMenuOpen);
  if (!state) return null;

  const isStrength = state.sport === 'gym';

  const bolt = (
    <svg viewBox="0 0 28 44" aria-hidden="true">
      <path fill="currentColor" d="M17.5 0 1.5 26.5H11L8.5 44 26.5 16H16.5L21.5 0Z" />
    </svg>
  );

  return (
    <header>
      <button className="hdr-menu" onClick={() => setMenuOpen(true)} aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <div className="brand-wrap">
        <div className="brand-logo" onClick={toggleLogo} role="button" tabIndex={0} aria-label="Switch logo">
          {state.logo === 'athlete' ? (
            <>
              <span className="bl-part">ATH</span>
              <span className="bl-bolt">{bolt}</span>
              <span className="bl-part">LETE</span>
            </>
          ) : (
            <>
              <span className="bl-part">WEA</span>
              <span className="bl-bolt">{bolt}</span>
              <span className="bl-part">ON</span>
            </>
          )}
        </div>
      </div>
      <div className="seg" id="modeToggle" role="tablist" aria-label="Mode">
        <button
          type="button"
          role="tab"
          aria-selected={isStrength}
          className={isStrength ? 'on' : ''}
          onClick={() => setSport('gym')}
        >
          Strength
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isStrength}
          className={!isStrength ? 'on' : ''}
          onClick={() => setSport('run')}
        >
          Endure
        </button>
      </div>
    </header>
  );
}
