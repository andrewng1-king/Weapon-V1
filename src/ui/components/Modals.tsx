'use client';

import { useState, useEffect } from 'react';
import { useWeapon, useUIStore } from '@/hooks';
import { GROUPS, MAXLVL, STR_RANKS } from '@/domain';
import type { Group } from '@/domain/types';

export function Modals() {
  const { state, addCustomExercise, saveProfile, setBw } = useWeapon();
  const { modal, setModal } = useUIStore();
  const group = useUIStore((s) => s.group);

  const [exName, setExName] = useState('');
  const [exTarget, setExTarget] = useState('');

  const [pName, setPName] = useState('');
  const [pJob, setPJob] = useState('');
  const [pBio, setPBio] = useState('');
  const [pBw, setPBw] = useState('');
  const [pSpotify, setPSpotify] = useState('');

  if (!state) return null;

  function handleAddExercise() {
    if (!exName.trim()) return;
    addCustomExercise({ n: exName.trim(), g: group, t: exTarget.trim(), start: 0 });
    setExName(''); setExTarget(''); setModal(null);
  }

  function handleSaveProfile() {
    saveProfile({ name: pName || undefined, job: pJob || undefined, bio: pBio || undefined, spotify: pSpotify || undefined });
    if (pBw) setBw(+pBw);
    setModal(null);
  }

  useEffect(() => {
    if (modal === 'settings') {
      setPName(state?.profile.name ?? '');
      setPJob(state?.profile.job ?? '');
      setPBio(state?.profile.bio ?? '');
      setPBw(String(state?.bw ?? 75));
      setPSpotify(state?.profile.spotify ?? '');
    }
  }, [modal]);

  return (
    <>
      {/* Add Exercise Modal */}
      {modal === 'addExercise' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>Add exercise to {group}</h3>
            <label>Name</label>
            <input value={exName} onChange={(e) => setExName(e.target.value)} placeholder="e.g. Incline Fly" />
            <label>Target muscles</label>
            <input value={exTarget} onChange={(e) => setExTarget(e.target.value)} placeholder="e.g. Upper chest" />
            <div className="mrow">
              <button className="m-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="m-save" onClick={handleAddExercise}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {modal === 'settings' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>Profile settings</h3>
            <div className="set-section">
              <label>Name</label>
              <input value={pName} onChange={(e) => setPName(e.target.value)} />
              <label>Title / Job</label>
              <input value={pJob} onChange={(e) => setPJob(e.target.value)} />
              <label>Bodyweight (kg)</label>
              <input type="number" value={pBw} onChange={(e) => setPBw(e.target.value)} />
              <label>Bio</label>
              <input value={pBio} onChange={(e) => setPBio(e.target.value)} />
              <label>Spotify Track ID</label>
              <input value={pSpotify} onChange={(e) => setPSpotify(e.target.value)} placeholder="e.g. 3n3Ppam7vgaVa1iaRUc9Lp" />
            </div>
            <div className="mrow">
              <button className="m-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="m-save" onClick={handleSaveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Ranks Modal */}
      {modal === 'ranks' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>All ranks</h3>
            <div className="ranks-list">
              {STR_RANKS.map((name, i) => {
                const lvl = i + 1;
                const isCur = lvl === (state.dev.on ? state.dev.lvl : undefined);
                return (
                  <div key={name} className={`rank-line${isCur ? ' cur' : ''}`}>
                    <span className="rl-lv">{lvl}</span>
                    <span className="rl-name">{name}</span>
                    {isCur && <span className="rl-tag">YOU</span>}
                  </div>
                );
              })}
            </div>
            <div className="mrow"><button className="m-cancel" onClick={() => setModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Planner Placeholder */}
      {modal === 'planner' && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="planner-soon">
              <div className="planner-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg></div>
              <div className="planner-title">Workout planner</div>
              <div className="planner-sub">Plan your training week. Coming soon.</div>
            </div>
            <div className="mrow"><button className="m-cancel" onClick={() => setModal(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
