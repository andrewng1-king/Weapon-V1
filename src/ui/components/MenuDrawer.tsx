'use client';

import { useWeapon, useUIStore } from '@/hooks';
import { useUserPicker } from '@/hooks/useUserPicker';
import { useState } from 'react';
import { showToast } from './Toast';

export function MenuDrawer() {
  const { state, setTheme, setUnit, setLayout, setSetsPerEntry } = useWeapon();
  const { users, selectUser, addUser, userId } = useUserPicker();
  const { menuOpen, setMenuOpen, setModal } = useUIStore();
  const [newName, setNewName] = useState('');

  return (
    <div className={`mm-bg${menuOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
      <div className="mm-panel">
        <div className="mm-greet">{state.profile.name || 'Hey'}</div>

        <button type="button" className="mm-item" onClick={() => setTheme(state.theme === 'dark' ? 'light' : 'dark')}>
          Theme
          <div className={`mm-toggle${state.theme === 'dark' ? ' on' : ''}`}><i /></div>
          <span className="mm-tag">{state.theme}</span>
        </button>

        <button type="button" className="mm-item" onClick={() => setUnit(state.unit === 'kg' ? 'lb' : 'kg')}>
          Units
          <span className="mm-tag">{state.unit}</span>
        </button>

        <button type="button" className="mm-item" onClick={() => setLayout(state.layout === 'comfortable' ? 'dense' : 'comfortable')}>
          Layout
          <span className="mm-tag">{state.layout}</span>
        </button>

        <button type="button" className="mm-item" onClick={() => {
          const n = state.setsPerEntry >= 5 ? 1 : state.setsPerEntry + 1;
          setSetsPerEntry(n);
          showToast(`Sets per log: ${n}`);
        }}>
          Sets / log
          <span className="mm-tag">{state.setsPerEntry}</span>
        </button>

        <button type="button" className="mm-item" onClick={() => { setModal('planner'); setMenuOpen(false); }}>
          Planner <span className="mm-tag">Soon</span>
        </button>

        <button type="button" className="mm-item" onClick={() => { setModal('settings'); setMenuOpen(false); }}>
          Settings
        </button>

        <button type="button" className="mm-item" onClick={() => { setModal('calendar'); setMenuOpen(false); }}>
          History calendar
        </button>

        <div className="mm-usersec">
          <div className="mm-seclabel">Users (session only)</div>
          <div className="wpn-users">
            {users.map((u) => (
              <button key={u.id} type="button" className={u.id === userId ? 'is-current' : ''} onClick={() => { selectUser(u.id); setMenuOpen(false); }}>
                {u.display_name || u.username}
              </button>
            ))}
          </div>
          <div className="wpn-add">
            <input placeholder="New user" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button type="button" onClick={() => { if (newName.trim()) { addUser(newName.trim()); setNewName(''); } }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
