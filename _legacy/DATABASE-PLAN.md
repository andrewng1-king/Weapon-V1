# Weapon V1 — Database Plan

A step-by-step plan to take Weapon from a single-browser `localStorage` app to a
multi-user, social, cloud-backed strength tracker. Structured GSD-style (vision →
requirements → roadmap → state) but written as a checklist you run yourself.

---

## 0. Recommendation (you asked me to pick the stack)

**Use Supabase.** For a multi-user/social app this is the right call over Firebase or a
custom server:

- **Postgres (relational).** Social features are joins — followers, feeds, leaderboards,
  "who liked this." Relational handles those cleanly; a NoSQL store (Firestore) forces you
  to denormalize and hand-maintain counters.
- **Row Level Security.** Multi-user means one person's data must never leak to another. RLS
  enforces that *in the database*, so a client bug can't expose private workouts. This is the
  single biggest reason to pick it.
- **Auth built in.** Email + Google/Apple sign-in, no server to run.
- **Realtime + REST + views.** Live feed updates, and the leaderboard/feed are just SQL views.
- **Static-site friendly.** Weapon is a static SPA today; Supabase is called straight from the
  browser with the anon key. No backend to deploy.

Firebase would also work but pushes you toward NoSQL and manual aggregation. A custom
Node+Postgres backend gives the most control but is the most to build and operate — only worth
it later if you outgrow Supabase.

---

## 1. PROJECT — the vision

Weapon is a strength/endurance tracker. Today every user is an island: data lives in one JSON
blob (`gymtracker_v3`) in one browser. The goal is a **social training app**: accounts, data that
syncs across devices, profiles you can follow, an activity feed of friends' workouts, kudos,
comments, and per-exercise leaderboards — without losing anyone's existing local history.

## 2. REQUIREMENTS — scope

**In scope (v1 of the database):**
- Accounts (email + at least one OAuth provider).
- Cloud storage of workouts/logs, synced across devices.
- One-time migration of existing `localStorage` data on first login.
- Custom exercises per user, on top of the shared 30-exercise preset catalogue.
- Follow / unfollow, per-workout visibility (private / followers / public).
- Activity feed, kudos (likes), comments.
- Per-exercise leaderboard by estimated 1RM (Epley).
- Personal records auto-tracked.

**Explicitly out of scope for now (decide later):**
- Endurance-mode social parity (schema supports it; UI/feed tuned for strength first).
- Push notifications, direct messaging, groups/teams.
- Coaching / program-sharing.
- Offline write queue with conflict resolution (v1 falls back to local-only when logged out).

**Open decisions** (flagged so they don't silently get guessed) — see §6.

## 3. ROADMAP — phases

Each phase is shippable on its own.

| Phase | Goal | Output |
|-------|------|--------|
| **P1 Provision** | Supabase project exists, schema loaded | running DB |
| **P2 Auth** | users can sign up / in, profile auto-created | login works |
| **P3 Migration** | existing local data lands in the cloud | no data lost |
| **P4 Sync** | workouts read/write to cloud, multi-device | core app on DB |
| **P5 Social** | follow, feed, kudos, comments | social loop |
| **P6 Leaderboard** | PRs + ranked boards | competition |

## 4. STATE — what's built vs. what's next

**Built in this folder (`/database`):**
- `00_schema.sql` — tables, enums, indexes, generated `e1rm` column.
- `01_rls.sql` — Row Level Security for every table + `can_view_workout` / `is_following` helpers.
- `02_seed_exercises.sql` — the 30 preset exercises, pulled verbatim from `app.js`.
- `03_triggers_functions.sql` — auto-create profile on signup; maintain personal records.
- `04_views.sql` — `v_feed`, `v_leaderboard`, `v_profile_stats`.
- `sync.js` — client scaffold: auth, one-time migration, pull/push, social helpers.

**Not built yet:** the front-end auth screen, feed UI, and wiring `sync.js` into `app.js`'s
`addLog`/`renderAll`. Those are P4–P6 UI work.

## 5. STEP-BY-STEP — do this in order

### Phase 1 — Provision the database
1. Create a Supabase account → **New project**. Pick a region near your users; save the DB password.
2. In the dashboard open **SQL Editor**.
3. Paste and run, in this exact order:
   `00_schema.sql` → `01_rls.sql` → `02_seed_exercises.sql` → `03_triggers_functions.sql` → `04_views.sql`.
4. Open **Table Editor** and confirm `exercises` has 30 rows and the other tables exist.

### Phase 2 — Auth
5. **Authentication → Providers**: enable Email. Optionally enable Google/Apple (needs OAuth keys).
6. **Project Settings → API**: copy the **Project URL** and **anon public key**.
7. In `database/sync.js`, replace `SB_URL` and `SB_ANON` with those values.
8. Add to `index.html`, before `</body>`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="database/sync.js"></script>
   ```
9. Build a minimal sign-up / sign-in form that calls `WeaponSync.signUpWithEmail()` /
   `signInWithEmail()`. Sign up a test user; confirm a row appears in `profiles`.

### Phase 3 — Migration
10. While logged in as the test user (with existing local data in that browser), the
    `onSignedIn` hook runs `migrateLocalToCloud` once. Confirm your old workouts now appear in
    the `workouts` / `workout_logs` tables.
11. Verify the `weapon_migrated` flag was set so it won't run twice.

### Phase 4 — Sync the core app
12. In `app.js`, after a set is recorded (inside the existing `addLog`/save path), call
    `WeaponSync.pushLog(log)`.
13. On load when logged in, `pullCloudIntoApp()` already refreshes `db`. Add a `renderAll()`
    function (or point the hook at your existing render entry) so the UI repaints.
14. Test cross-device: log in on a second browser, confirm the same history loads.

### Phase 5 — Social
15. Add a "find people" screen using `profiles` (search by username) and `WeaponSync.followUser`.
16. Build the feed from `WeaponSync.getFeed()` (the `v_feed` view): avatar, volume, kudos,
    comments, `liked_by_me`.
17. Wire kudos (`likeWorkout`) and a comment box (`workout_comments`).
18. Add a visibility selector on each workout (private / followers / public).

### Phase 6 — Leaderboard
19. PRs populate automatically via the trigger. Build a board per exercise from
    `WeaponSync.getBoard(exerciseId)` (the `v_leaderboard` view) and show the user's own rank.

### Verification (every phase)
- After each SQL file, re-run it — all files are idempotent, so a second run should error-free no-op.
- Test RLS with two accounts: account B must **not** see account A's `private` workouts, and must
  see `followers` workouts only after following.

## 6. Things I need from you (open decisions)

These change the build; I left sensible defaults in the code but you should confirm:

1. **Default workout visibility** — I set new workouts to `followers`. Want `private` by default instead?
2. **Username source** — sign-up currently takes a username in metadata; otherwise it auto-generates `user_xxxx`. Do you want a "pick your handle" step in the UI?
3. **OAuth providers** — email only for v1, or also Google/Apple now?
4. **Endurance social** — show endurance sessions in the feed/leaderboard too, or strength-only to start?
5. **Where should this live** — these files are in `Weapon V1/database/`. Your CLAUDE.md says deliverables go in `OUTPUTS/<project>/`, but that folder isn't mounted in this session. Tell me if you want them moved.

---

### A note on GSD itself
GSD installs as slash commands in your local Claude Code config, which this session can't reach,
so I couldn't *run* `/gsd-new-project`. This document mirrors what it would produce (PROJECT /
REQUIREMENTS / ROADMAP / STATE). If you install GSD locally (`npx @opengsd/get-shit-done-redux`),
you can paste sections 1–4 above into its generated `.planning/*.md` files — but read the trust
caveats in `GSD-GUIDE.md` first.
