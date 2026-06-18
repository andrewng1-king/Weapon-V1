'use client';

import { useWeapon, useUIStore } from '@/hooks';
import { useUserPicker } from '@/hooks/useUserPicker';
import { useState } from 'react';

export function MenuDrawer() {
  const { state, setTheme } = useWeapon();
  const { users, selectUser, addUser, userId } = useUserPicker();
  const { menuOpen, setMenuOpen, setModal } = useUIStore();
  const [newName, setNewName] = useState('');

  if (!state) return null;

  return (
    <div className={`mm-bg${menuOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
      <div className="mm-panel">
        <div className="mm-greet">{state.profile.name || 'Hey'}</div>

        <button className="mm-item" onClick={() => { setTheme(state.theme === 'dark' ? 'light' : 'dark'); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v1M12 20v1M4.22 4.22l.71.71M18.36 18.36l.71.71M1 12h1M20 12h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71" /><circle cx="12" cy="12" r="5" /></svg>
          Theme
          <div className={`mm-toggle${state.theme === 'dark' ? ' on' : ''}`}><i /></div>
          <span className="mm-tag">{state.theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        <button className="mm-item" onClick={() => { setModal('planner'); setMenuOpen(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
          Planner
          <span className="mm-tag">Soon</span>
        </button>

        <button className="mm-item" onClick={() => { setModal('settings'); setMenuOpen(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33" /></svg>
          Settings
        </button>

        <button className="mm-item" onClick={() => { setModal('calendar'); setMenuOpen(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
          History calendar
        </button>

        <div className="mm-usersec">
          <div className="mm-seclabel">Users</div>
          <div className="wpn-users">
            {users.map((u) => (
              <button key={u.id} className={u.id === userId ? 'is-current' : ''} onClick={() => { selectUser(u.id); setMenuOpen(false); }}>
                {u.display_name || u.username}
              </button>
            ))}
          </div>
          <div className="wpn-add">
            <input placeholder="New user" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button onClick={() => { if (newName.trim()) { addUser(newName.trim()); setNewName(''); } }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
