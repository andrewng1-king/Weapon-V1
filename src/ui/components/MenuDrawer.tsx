'use client';

import { useState } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { useUserPicker } from '@/hooks/useUserPicker';

/**
 * Menu drawer — port of legacy `#mainMenuBg` block.
 *
 * Items match `_legacy/index.html` line 974-998:
 *   Appearance · Layout density · Workout planner · Settings · History calendar
 *
 * Refactor-only items removed (not in legacy): Units (kg/lb) toggle and
 * Sets per log stepper.
 */
export function MenuDrawer() {
  const { state, setTheme, setLayout } = useWeapon();
  const { users, selectUser, addUser, userId } = useUserPicker();
  const { menuOpen, setMenuOpen, setModal } = useUIStore();
  const [newName, setNewName] = useState('');
  if (!state) return null;

  const themeOn = state.theme === 'dark';
  const layoutOn = state.layout === 'comfortable';
  const firstName = (state.profile.name || '').trim().split(/\s+/)[0] || 'Athlete';

  return (
    <div className={`mm-bg${menuOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
      <div className="mm-panel">
        <div className="mm-greet">Hi, {firstName}!</div>

        <button type="button" className="mm-item" onClick={() => setTheme(themeOn ? 'light' : 'dark')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7" />
          </svg>
          <span>Appearance</span>
          <span className={`mm-toggle${themeOn ? ' on' : ''}`} aria-hidden="true"><i /></span>
          <span className="mm-tag">{themeOn ? 'Dark' : 'Light'}</span>
        </button>

        <button type="button" className="mm-item" onClick={() => setLayout(layoutOn ? 'dense' : 'comfortable')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4" width="17" height="6" rx="1.5" />
            <rect x="3.5" y="14" width="17" height="6" rx="1.5" />
          </svg>
          <span>Layout density</span>
          <span className={`mm-toggle${layoutOn ? ' on' : ''}`} aria-hidden="true"><i /></span>
          <span className="mm-tag">{layoutOn ? 'Comfortable' : 'Dense'}</span>
        </button>

        <button type="button" className="mm-item" onClick={() => { setMenuOpen(false); setModal('planner'); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
            <path d="M3.5 9h17M8 3v3M16 3v3M7.5 13h4M7.5 16.5h7" />
          </svg>
          <span>Workout planner</span>
          <span className="mm-tag">Soon</span>
        </button>

        <button type="button" className="mm-item" onClick={() => { setMenuOpen(false); setModal('settings'); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
          </svg>
          <span>Settings</span>
        </button>

        <button type="button" className="mm-item" onClick={() => { setMenuOpen(false); setModal('calendar'); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" />
          </svg>
          <span>History calendar</span>
        </button>

        <div className="mm-usersec">
          <div className="mm-seclabel">Switch user</div>
          <div className="wpn-users">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className={u.id === userId ? 'is-current' : ''}
                onClick={() => { selectUser(u.id); setMenuOpen(false); }}
              >
                {u.display_name || u.username}
              </button>
            ))}
          </div>
          <div className="wpn-add">
            <input
              placeholder="New user"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="button"
              onClick={() => { if (newName.trim()) { addUser(newName.trim()); setNewName(''); } }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
