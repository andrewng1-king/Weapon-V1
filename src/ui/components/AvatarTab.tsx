'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWeapon, useUIStore, useCoverAdjust } from '@/hooks';
import {
  levelInfo,
  rankFor,
  xpToReach,
  MAXLVL,
  STR_RANKS,
  END_AXES,
  allSportLogs,
} from '@/domain/ranks';
import { avStats, achList, groupCounts } from '@/domain/metrics';
import { fmtK, fmtVol } from '@/domain/format';
import { categoriesFor } from '@/domain/sports';
import { ACCENT_SET } from '@/domain/accents';
import { Chart } from './Chart';
import { drawRadar } from '@/ui/lib/charts';
import { showToast } from './Toast';
import { CountUp } from './CountUp';

/** Mirror legacy `db.mode === 'endurance'` using the current sport selector. */
function isEnduranceSport(sport: string | undefined): boolean {
  return !!sport && sport !== 'gym';
}

/** Initials from a profile name, falling back to 'WX' (legacy parity). */
function initialsOf(name: string | undefined): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'WX';
  const parts = trimmed.split(/\s+/);
  return (parts.map((p) => p[0] || '').join('').slice(0, 2).toUpperCase()) || 'WX';
}

export function AvatarTab() {
  const { state, setDevMode, setAccent, saveProfile, uploadMedia, markSeenLevel } = useWeapon();
  const setModal = useUIStore((s) => s.setModal);

  // ---- nullable, state-derived values (computed even when state is null) ---
  const sport = state?.sport;
  const bucket = state ? state.sports[state.sport] : null;
  const li = state ? levelInfo(allSportLogs(state)) : null;
  const devLvl = state?.dev.on ? state.dev.lvl : undefined;
  const effectiveLvl = devLvl ?? li?.lvl ?? 1;
  const isEndure = isEnduranceSport(sport);
  const profile = state?.profile;

  // ---- always-called hooks (kept above any early return) ------------------
  const [ringPulse, setRingPulse] = useState(false);
  const [xpW, setXpW] = useState(0);
  const [radarScale, setRadarScale] = useState(0);
  const photoInput = useRef<HTMLInputElement | null>(null);

  // Initial ring-pulse on mount (legacy: 800ms in, 460ms held).
  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
    if (reduce) return;
    const t1 = window.setTimeout(() => {
      setRingPulse(true);
      window.setTimeout(() => setRingPulse(false), 460);
    }, 800);
    return () => window.clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (!bucket || !li) return;
    if ((bucket.seenLevel ?? 0) < li.lvl) markSeenLevel(li.lvl);
  }, [li?.lvl, bucket?.seenLevel, markSeenLevel, bucket, li]);

  // XP bar fills from 0 on mount and animates whenever progress changes.
  useEffect(() => {
    if (!li) return;
    const id = requestAnimationFrame(() => setXpW(li.pct));
    return () => cancelAnimationFrame(id);
  }, [li?.pct, li]);

  // Radar dataset — strength uses real per-group counts; endurance shows the
  // fixed END_AXES skeleton (placeholder until run logging lands).
  const cats = state ? categoriesFor(state.sport) : [];
  const realCounts = useMemo(
    () => (state && bucket ? groupCounts(bucket.logs, state.sport, bucket.custom) : {}),
    [state, bucket],
  );
  const radarLabels = isEndure
    ? END_AXES
    : (cats.length ? cats : Object.keys(realCounts));
  const radarCounts = useMemo(() => {
    if (!isEndure) return realCounts;
    const out: Record<string, number> = {};
    END_AXES.forEach((a) => { out[a] = 0; });
    return out;
  }, [isEndure, realCounts]);
  const radarKey = JSON.stringify(radarCounts);

  // animRadar — port of legacy 560ms ease-out-cubic scale (0 → 1) on mount
  // and whenever the radar dataset changes. Honors prefers-reduced-motion.
  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
    if (reduce) { setRadarScale(1); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 560);
      const e = 1 - Math.pow(1 - k, 3);
      setRadarScale(e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [radarKey]);

  // Cover repositioning gesture (long-press 420ms + drag).
  const { coverRef, position: coverPos, adjusting } = useCoverAdjust(
    profile?.cover,
    profile?.coverPos,
    (pos) => {
      saveProfile({ coverPos: pos });
      showToast('Cover position saved');
    },
  );

  // ---- guard / render ------------------------------------------------------
  if (!state || !bucket || !li || !profile) return null;

  const profileName = profile.name || 'You';
  const isEmptyId = !profile.name && !profile.job && !profile.bio
    && !profile.spotify && !profile.height && !profile.photo && !profile.cover;
  const rk = rankFor(effectiveLvl);
  const stats = avStats(bucket.logs, state.sport, bucket.custom, effectiveLvl);
  const achievements = achList(stats);
  const gotCount = achievements.filter((a) => a.got).length;

  async function handlePhotoChange(file: File | null) {
    if (!file) return;
    try {
      const url = await uploadMedia('photo', file);
      saveProfile({ photo: url });
      showToast('Photo updated');
    } catch {
      showToast('Upload failed');
    }
  }

  return (
    <main>
      <div className="p-titlebox">
        <div className="ptb-eyebrow">Profile</div>
        <div className="ptb-name">{profileName}</div>
        <div className="ptb-rank">
          <small>
            {isEndure ? `Level ${effectiveLvl}` : `Level ${effectiveLvl} · ${rk.name}`}
          </small>
        </div>
      </div>

      {/* ID card -------------------------------------------------------------- */}
      {isEmptyId ? (
        <div className="idcard">
          <button type="button" className="idc-setup" onClick={() => setModal('settings')}>
            + Set up your WEAPON ID
          </button>
        </div>
      ) : (
        <div className="idcard">
          <button
            type="button"
            className="idc-settings"
            onClick={() => setModal('settings')}
            aria-label="Profile & settings"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20.5c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5v.5H4z" />
            </svg>
          </button>
          <div
            ref={coverRef}
            className={`idc-cover${profile.cover ? '' : ' nofill'}${adjusting ? ' adjusting' : ''}`}
            style={profile.cover ? {
              backgroundImage: `url(${profile.cover})`,
              backgroundPosition: coverPos,
            } : undefined}
          />
          <div className="idc-body">
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handlePhotoChange(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <div
              className="idc-avatar"
              onClick={() => photoInput.current?.click()}
              title="Change photo"
            >
              <div className="av-img">
                {profile.photo
                  ? <img src={profile.photo} alt="" />
                  : initialsOf(profile.name)}
              </div>
              <span className="av-edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
            </div>
            <div className="idc-name">{profile.name || 'Unnamed Athlete'}</div>
            <div className="idc-rank">{profile.job || rk.name}</div>
            {profile.bio && <div className="idc-bio">{profile.bio}</div>}
            <div className="idc-stats2">
              <div><b>{fmtK(stats.sessions)}</b><span>Days lifted</span></div>
              <div><b>{fmtVol(stats.vol)}</b><span>Volume kg</span></div>
              <div><b>{stats.streak}</b><span>Day streak</span></div>
            </div>
            {profile.spotify && (
              <div className="idc-spotify">
                <iframe
                  src={`https://open.spotify.com/embed/track/${profile.spotify}`}
                  allow="encrypted-media"
                  title="Spotify"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero / level ring + rank ------------------------------------------- */}
      <div className="card av-hero">
        <div className={`ring${ringPulse ? ' lvpulse' : ''}`}>
          <svg width="96" height="96">
            <circle cx="48" cy="48" r="42" stroke="var(--track)" strokeWidth="5" fill="none" />
            <circle
              cx="48" cy="48" r="42"
              stroke="var(--accent)" strokeWidth="5" fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - li.pct)}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)',
              }}
            />
          </svg>
          <div className="lv">
            <span className="n">{effectiveLvl}</span>
            <span className="t">Level</span>
          </div>
        </div>
        <div className="heroinfo">
          <div className="label" style={{ marginBottom: 6 }}>
            Rank
            <button
              type="button"
              className="ranks-btn"
              style={{ float: 'right', marginTop: -4 }}
              onClick={() => setModal('ranks')}
              aria-label="All ranks"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
              </svg>
            </button>
          </div>
          {!isEndure && <div className="rank-name">{rk.name}</div>}
          <div className="rank-next">
            {isEndure
              ? 'Endurance mode — run tracking coming soon'
              : (rk.next
                ? `${fmtK(Math.max(0, xpToReach(rk.nextLvl) - li.xp))} XP to ${rk.next}`
                : 'Immortal — max rank reached')}
          </div>
          <div className="xpbar">
            <div className="xpfill" style={{ width: `${(xpW * 100).toFixed(1)}%` }} />
          </div>
          <div className="xptext">
            {li.lvl < MAXLVL ? `${li.into} / ${li.need} XP · ${li.xp} total` : `Max level · ${li.xp} XP`}
          </div>
        </div>
      </div>

      {/* Per-tab stat row (animates) ---------------------------------------- */}
      <div className="p2-stats">
        <div className="p2-metric">
          <div className="p2-mlab">Streak</div>
          <div className="p2-mval"><CountUp value={stats.streak} /><small> d</small></div>
        </div>
        <div className="p2-metric">
          <div className="p2-mlab">Sessions</div>
          <div className="p2-mval"><CountUp value={stats.sessions} /></div>
        </div>
        <div className="p2-metric">
          <div className="p2-mlab">Volume</div>
          <div className="p2-mval"><CountUp value={stats.vol} format={fmtVol} /><small> kg</small></div>
        </div>
      </div>

      {/* Radar -------------------------------------------------------------- */}
      <div className="card">
        <h2>Strength radar</h2>
        <div className="hint">
          {isEndure
            ? 'Endurance profile — log runs to build it'
            : 'Sets trained per muscle group — all time'}
        </div>
        <Chart
          height={260}
          draw={(ctx, w, h) => drawRadar(ctx, w, h, radarLabels, radarCounts, radarScale)}
          deps={[radarKey, radarScale]}
        />
      </div>

      {/* Appearance --------------------------------------------------------- */}
      <div className="card">
        <h2>Appearance</h2>
        <div className="hint">Pick a theme — it recolors the whole app.</div>
        <div className="p2-aprow">
          <span className="p2-aplab">Theme</span>
          <div className="p2-acset">
            {ACCENT_SET.map((a, i) => (
              <span
                key={a.hex}
                className={`p2-acsw${state.dev.color === i ? ' on' : ''}`}
                style={{ background: a.hex }}
                title={a.name}
                onClick={() => setAccent(i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Achievements ------------------------------------------------------- */}
      <div className="card">
        <h2 className="p2-h2row">
          Achievements <span className="p2-achsum">{gotCount} / {achievements.length}</span>
        </h2>
        <div className="hint">Milestones from your real training. Tap one for detail.</div>
        <div className="p2-achgrid">
          {achievements.map((a) => (
            <button
              key={a.nm}
              type="button"
              className={`p2-ach${a.got ? ' got' : ''}`}
              onClick={() =>
                showToast(a.got
                  ? `${a.nm} — earned`
                  : `${a.nm} — ${Math.round((a.p || 0) * 100)}% there`)
              }
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: a.ic }} />
              <span className="nm">{a.nm}</span>
              {!a.got && (
                <span className="pr">
                  <i style={{ width: `${Math.round((a.p || 0) * 100)}%` }} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Dev mode ----------------------------------------------------------- */}
      <div
        className={`dev-switch${state.dev.on ? ' on' : ''}`}
        onClick={() => setDevMode(!state.dev.on)}
      >
        <div>
          <div className="ds-label">Dev mode</div>
          <div className="ds-sub">Preview rank levels</div>
        </div>
        <div className="toggle" />
      </div>

      {state.dev.on && (
        <div className="card" id="devPanel">
          <h2>Dev controls</h2>
          <div className="dev-row">
            <label>Rank level</label>
            <div className="dev-slider">
              <input
                type="range"
                min={1}
                max={MAXLVL}
                step={1}
                value={state.dev.lvl}
                onChange={(e) => setDevMode(true, +e.target.value)}
              />
              <span className="dv">
                Lv {state.dev.lvl} · {STR_RANKS[Math.min(state.dev.lvl, MAXLVL) - 1]}
              </span>
            </div>
          </div>
          <button type="button" className="dev-reset" onClick={() => setDevMode(false)}>
            Reset preview
          </button>
        </div>
      )}
    </main>
  );
}
