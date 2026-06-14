# Get Shit Done (GSD) — What it is and how to use it

> Reference only. Nothing has been installed. Read the **Heads-up** section before running anything.

## What GSD is

GSD is a **spec-driven development system for AI coding CLIs** — Claude Code, and also Codex,
Cursor, Gemini CLI, OpenCode, Copilot, Windsurf, and others. It is **not** a library or framework
you add to a website's source code. It installs a set of **slash commands and background agents**
into your AI tool's config directory (e.g. `~/.claude/skills/gsd-*/`).

Its job is to fight **context rot** — the way an AI's answers get worse as its context window fills
up. GSD does this two ways:

- **Fresh subagent contexts.** Research, planning, and execution each run in their own clean
  200k-token context instead of one ever-growing conversation. Your main window stays light.
- **Structured memory files** that survive between sessions: `PROJECT.md` (vision),
  `REQUIREMENTS.md` (scope), `ROADMAP.md` (direction), `STATE.md` (current position + decisions),
  `CONTEXT.md` (per-phase decisions). Every new session reloads these and knows where things stand.

## The six-command loop

You run these *inside your AI coding CLI*, not in a normal terminal:

| Step | Command | What it does |
|------|---------|--------------|
| 1. Init | `/gsd-new-project` (or `/gsd-map-codebase` first if code already exists) | Questions → research → requirements → roadmap |
| 2. Discuss | `/gsd-discuss-phase 1` | Capture your decisions (layouts, APIs, errors) before planning |
| 3. Plan | `/gsd-plan-phase 1` | Research + plan + verify, looped until plans pass |
| 4. Execute | `/gsd-execute-phase 1` | Runs plans in parallel waves; each task = its own commit |
| 5. Verify | `/gsd-verify-work 1` | Acceptance testing; broken work gets a diagnosed fix plan |
| 6. Ship | `/gsd-ship 1` → `/gsd-complete-milestone` → `/gsd-new-milestone` | PR, archive, next milestone |

Config lives in `.planning/config.json` (set during `/gsd-new-project` or via `/gsd-settings`).
Key dials: `mode` (`interactive` vs `yolo`), model profiles (`quality`/`balanced`/`budget`),
and `parallelization.enabled`.

## How to install it (run these yourself)

GSD must be installed on **your** machine, by **you**, in a real terminal — it writes to your
Claude Code config on Windows, which this Cowork session cannot reach.

```bash
# 1. From inside this project folder ("Weapon V1") in a terminal:
npx @opengsd/get-shit-done-redux@latest

# The installer asks:
#   - which runtime (pick Claude Code)
#   - global vs local install (local = just this project)

# 2. Restart Claude Code so the new slash commands load.

# 3. Because this folder already has code, run this first inside Claude Code:
/gsd-map-codebase
#    then:
/gsd-new-project
```

Optional smaller install: add `--profile=core` for just the six core-loop commands.
Full docs: https://github.com/open-gsd/get-shit-done-redux (see `docs/USER-GUIDE.md`).

## Heads-up before you install (please read)

1. **The repo you linked is dead.** `gsd-build/get-shit-done` shows "GSD Has Moved." It points to
   `open-gsd/gsd-core`, which redirects again to `open-gsd/get-shit-done-redux`. Three hops.

2. **Trust history.** The successor's own README says development moved after *"trust and ownership
   concerns… including a meme-coin rug-pull incident publicly associated with that ecosystem."*
   The package runs with `--dangerously-skip-permissions` by design. Decide if you're comfortable
   running an auto-approving agent toolchain from this lineage before installing. Pin a version and
   review the source if in doubt.

3. **"Weapon V1" is a static web app**, not a git repo (`index.html`, `app.js`, `styles.css`,
   `_frames/`). GSD assumes a buildable, version-controlled code project. Consider running
   `git init` here first, and confirm GSD's phase-based workflow actually fits a single-page site
   before committing to it.

## Quick verdict

GSD is well-regarded for keeping AI coding sessions organized on real software projects. For a
small static site it may be heavier than you need. Worth a try if you plan to keep building this
into something larger — but install deliberately given the ownership history above.
