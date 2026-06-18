'use client';

import { useWeapon } from '@/hooks';
import { levelInfo, rankFor, xpToReach, MAXLVL, STR_RANKS } from '@/domain/ranks';
import { avStats, achList, groupCounts } from '@/domain/metrics';
import { fmtK, fmtVol } from '@/domain/format';
import { GROUPS } from '@/domain/catalogue';
import { Chart } from './Chart';
import { drawRadar } from '@/ui/lib/charts';
import { useUIStore } from '@/hooks/uiStore';

export function AvatarTab() {
  const { state, setDevMode, setAccent } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);

  if (!state) return null;
  const bucket = state[state.mode];
  const devLvl = state.dev.on ? state.dev.lvl : undefined;
  const li = levelInfo(bucket.logs);
  const effectiveLvl = devLvl ?? li.lvl;
  const rk = rankFor(effectiveLvl);
  const stats = avStats(bucket.logs, effectiveLvl);
  const achievements = achList(stats);
  const gotCount = achievements.filter((a) => a.got).length;
  const counts = groupCounts(bucket.logs);
  const profileName = state.profile.name || 'You';

  return (
    <main>
      <div className="p-titlebox">
        <div className="ptb-eyebrow">Profile</div>
        <div className="ptb-name">{profileName}</div>
        <div className="ptb-rank"><small>Level {effectiveLvl} · {rk.name}</small></div>
      </div>

      <div className="idcard">
        <button className="idc-settings" onClick={() => setModal('settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15 1.65 1.65 0 003.09 14H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6 1.65 1.65 0 0010.08 3.09V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
        </button>
        {state.profile.cover ? (
          <div className="idc-cover" style={{ backgroundImage: `url(${state.profile.cover})` }} />
        ) : (
          <div className="idc-cover nofill" />
        )}
        <div className="idc-body">
          <div className="idc-avatar">
            <div className="av-img">
              {state.profile.photo ? <img src={state.profile.photo} alt="" /> : profileName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="idc-name">{profileName}</div>
          <div className="idc-rank">{rk.name}</div>
          {state.profile.bio && <div className="idc-bio">{state.profile.bio}</div>}
          <div className="idc-stats2">
            <div><b>{stats.sessions}</b><span>Sessions</span></div>
            <div><b>{fmtVol(stats.vol)}</b><span>Volume</span></div>
            <div><b>{stats.streak}</b><span>Streak</span></div>
          </div>
          {state.profile.spotify && (
            <div className="idc-spotify">
              <iframe src={`https://open.spotify.com/embed/track/${state.profile.spotify}`} allow="encrypted-media" />
            </div>
          )}
        </div>
      </div>

      <div className="card av-hero">
        <div className="ring">
          <svg width="96" height="96">
            <circle cx="48" cy="48" r="42" stroke="var(--track)" strokeWidth="5" fill="none" />
            <circle cx="48" cy="48" r="42" stroke="var(--accent)" strokeWidth="5" fill="none"
              strokeLinecap="round" strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - li.pct)}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }} />
          </svg>
          <div className="lv"><span className="n">{effectiveLvl}</span><span className="t">Level</span></div>
        </div>
        <div className="heroinfo">
          <div className="label" style={{ marginBottom: 6 }}>
            Rank
            <button className="ranks-btn" style={{ float: 'right', marginTop: -4 }} onClick={() => setModal('ranks')} aria-label="All ranks">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></svg>
            </button>
          </div>
          <div className="rank-name">{rk.name}</div>
          <div className="rank-next">
            {rk.next ? `${fmtK(Math.max(0, xpToReach(rk.nextLvl) - li.xp))} XP to ${rk.next}` : 'Immortal — max rank reached'}
          </div>
          <div className="xpbar"><div className="xpfill" style={{ width: `${(li.pct * 100).toFixed(1)}%` }} /></div>
          <div className="xptext">{li.lvl < MAXLVL ? `${li.into} / ${li.need} XP · ${li.xp} total` : `Max level · ${li.xp} XP`}</div>
        </div>
      </div>

      <div className="p2-stats">
        <div className="p2-metric"><div className="p2-mlab">Streak</div><div className="p2-mval">{stats.streak}<small> d</small></div></div>
        <div className="p2-metric"><div className="p2-mlab">Sessions</div><div className="p2-mval">{stats.sessions}</div></div>
        <div className="p2-metric"><div className="p2-mlab">Volume</div><div className="p2-mval">{fmtVol(stats.vol)}<small> kg</small></div></div>
      </div>

      <div className="card">
        <h2>Strength radar</h2>
        <div className="hint">Sets trained per muscle group — all time</div>
        <Chart height={260} draw={(ctx, w, h) => drawRadar(ctx, w, h, GROUPS, counts)} deps={[counts]} />
      </div>

      <div className="card">
        <h2>Appearance</h2>
        <div className="hint">Pick a theme — it recolors the whole app.</div>
        <div className="p2-aprow">
          <span className="p2-aplab">Theme</span>
          <div className="p2-acset">
            <span className={`p2-acsw${state.dev.color === 0 ? ' on' : ''}`} style={{ background: '#c2a878' }} onClick={() => setAccent(0)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="p2-h2row">Achievements <span className="p2-achsum">{gotCount} / {achievements.length}</span></h2>
        <div className="hint">Milestones from your real training. Tap one for detail.</div>
        <div className="p2-achgrid">
          {achievements.map((a) => (
            <div key={a.nm} className={`p2-ach${a.got ? ' got' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: a.ic }} />
              <span className="nm">{a.nm}</span>
              {!a.got && <span className="pr"><i style={{ width: `${Math.round(a.p * 100)}%` }} /></span>}
            </div>
          ))}
        </div>
      </div>

      <div className={`dev-switch${state.dev.on ? ' on' : ''}`} onClick={() => setDevMode(!state.dev.on)}>
        <div><div className="ds-label">Dev mode</div><div className="ds-sub">Preview rank levels</div></div>
        <div className="toggle" />
      </div>

      {state.dev.on && (
        <div className="card" id="devPanel">
          <div className="dev-row">
            <label>Preview level</label>
            <div className="dev-slider">
              <input type="range" min={1} max={MAXLVL} value={state.dev.lvl} onChange={(e) => setDevMode(true, +e.target.value)} />
              <div className="dv">Lv {state.dev.lvl} · {STR_RANKS[Math.min(state.dev.lvl, MAXLVL) - 1]}</div>
            </div>
          </div>
          <button className="dev-reset" onClick={() => setDevMode(false)}>Reset to real level</button>
        </div>
      )}
    </main>
  );
}
