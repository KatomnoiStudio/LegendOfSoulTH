# Legend of Soul-TH

[![Build, Typecheck and Lint](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/ci.yml/badge.svg)](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/deploy.yml/badge.svg)](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/deploy.yml)
[![CodeQL Analysis](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/codeql.yml/badge.svg)](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/codeql.yml)
[![Security & Secret Scan](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/security-scan.yml/badge.svg)](https://github.com/KatomnoiStudio/LegendOfSoulTH/actions/workflows/security-scan.yml)

**Live**: https://katomnoistudio.github.io/LegendOfSoulTH/ · **2.5D Hero Collection Action RPG**, React 19 + TypeScript + Vite, realtime combat, three.js/R3F lobby, Supabase backend.

> **This file is for agents and contributors, not players.** Players never read a repo README. If you're an AI agent (Claude Code, Codex/GPT, VS Code's native agent, Cursor Agent, or anything else) picking up work here, **read [`AGENTS.md`](AGENTS.md) first — it is the binding law, this file is orientation.** `AGENTS.md` → `.agents/rules/*.md` (the actual rule bodies) → [`docs/MASTER_BLUEPRINT_v3.0.md`](docs/MASTER_BLUEPRINT_v3.0.md) (locked product decisions) → [`AGENT_BLUEPRINT.md`](AGENT_BLUEPRINT.md) (per-system index) → `docs/agent-blueprint/NN-*.md` (28 per-system work contracts) → [`TASKS.md`](TASKS.md) (ownership/claim ledger) → [`MEMORY.md`](MEMORY.md) (chronological decision log). That chain is the actual source of truth; treat any claim below that contradicts it as this file being stale, not the other way around.

## What's actually shipped (as of this file's last audit pass)

Real-time 2.5D combat (multi-hero, skill/ultimate kits, elite/boss tiers, 10-stage Chapter 1 with 7 stage-type variations), a Supabase backend (Auth + Postgres + RLS + RPCs, not a mock), a server-authoritative Gacha system live in production, Star Ascension and Progression systems, World Chat, friend lookup, and a private-room PvP **prototype** gated behind a feature flag pending its Edge Function deploy. 24 of 28 tracked systems are graduated; see `TASKS.md`'s Main Systems table for the real, current per-system status — do not trust a stale mental model of "what this game has" carried over from an old session.

## Setup (new dev / new agent)

```bash
git clone https://github.com/KatomnoiStudio/LegendOfSoulTH.git
cd LegendOfSoulTH
npm install
cp .env.local.example .env.local   # then fill in real values — see below and the file's own comments
npm run dev                        # http://localhost:5173
```

`.env.local` values come from the Supabase project dashboard (**Settings → API**) — ask HetCreep for a Supabase team-member invite rather than having a key pasted in chat, then copy it yourself from the dashboard. `.env.local` is gitignored (`*.local` pattern) — **never commit it.**

The anon key is not a secret in the traditional sense (it's designed to ship inside the client bundle — real security is the RLS policies in `supabase/migrations/`), but it still needs to come from the dashboard so HetCreep controls who has access.

Missing env vars throw immediately at module load (`src/lib/supabaseClient.ts`) — `npm run dev` will fail loudly, not silently misbehave.

`.env.local.example` also documents the exact Google OAuth Redirect URLs that must be whitelisted in the Supabase dashboard for login to work at all — a mismatch there causes a real, previously-shipped bug (session token stranded in the URL; see `MEMORY.md` item 172).

## Commands

```bash
npm install        # install dependencies (once)
npm run dev         # dev server -> http://localhost:5173
npm run typecheck   # tsc -b (+ the Deno Edge Function under supabase/functions/, if present)
npm run lint        # oxlint --deny-warnings
npm run test         # Vitest
npm run test:edge   # Deno test on the pvp-authority Edge Function
npm run build       # typecheck + production build -> dist/
npm run preview     # serve the production build locally
npm run ci          # typecheck + lint + test + test:edge + build + bundle-size gate — must be green before any commit
npm run audit       # npm audit --audit-level=high (same check security-scan.yml runs daily)

npm run build:models   # generate character GLB files into public/models/
npm run build:images   # convert assets/raw/ source PNGs -> compressed WebP in public/
```

A pre-commit hook (husky + lint-staged) runs oxlint on staged files automatically — don't bypass it with `--no-verify`.

## Release process

The site does **not** deploy on every push — only when the game version changes.

```bash
# 1. Set the same <x.y.z> version in both authoritative files:
#    src/game/gameInfo.ts  ->  version: '<x.y.z>'
#    package.json          ->  "version": "<x.y.z>"
# 2. Sync generated lockfile metadata: npm install --package-lock-only --ignore-scripts
# 3. Add a "## [x.y.z]" heading to CHANGELOG.md (the GitHub Release body is drawn from this)
# 4. Push -> the deploy gate compares the version to the prior commit; a real bump triggers
#    build + deploy + a GitHub Release with an attached SBOM, automatically.
```

A push with no version bump exits early at the cheap `gate` job — no full build wasted. To deploy without bumping, use **Run workflow** on the `Deploy to GitHub Pages` Action manually.

**A version bump IS a deploy on this repo — do not bump in the same breath as merging work whose database migrations are unapplied.** Apply the migration (or gate the feature behind a flag) first, then bump. This has broken production once already (`MEMORY.md` item 176) — two player-facing buttons shipped live pointing at RPCs that didn't exist yet.

## Governance & further reading

| Doc                                                                         | What it's for                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`AGENTS.md`](AGENTS.md)                                                    | Binding law for any agent working this repo — read this first, not this README |
| [`.agents/rules/`](.agents/rules)                                           | The actual rule bodies AGENTS.md's numbered list points at                     |
| [`docs/MASTER_BLUEPRINT_v3.0.md`](docs/MASTER_BLUEPRINT_v3.0.md)            | Locked product decisions — the design "why"                                    |
| [`AGENT_BLUEPRINT.md`](AGENT_BLUEPRINT.md)                                  | Per-system index into the 28 work contracts under `docs/agent-blueprint/`      |
| [`TASKS.md`](TASKS.md)                                                      | Live ownership/claim ledger — the real current status of every system          |
| [`MEMORY.md`](MEMORY.md)                                                    | Chronological decision log — why something is the way it is                    |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                                        | PR process, branch hygiene                                                     |
| [`SECURITY.md`](SECURITY.md)                                                | Vulnerability reporting, current trust-boundary scope                          |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) · [`CHANGELOG.md`](CHANGELOG.md) | Standard                                                                       |

## 3D lobby scene

- **Fixed 2.5D oblique camera** — the player can't rotate it freely; it only drifts slightly with the mouse and pulls back automatically on narrow screens (`CameraRig` in `LobbyScene.tsx`).
- **WebGPU first, automatic WebGL2 fallback** — `LobbyScene.tsx`'s `<Canvas gl={...}>` checks `navigator.gpu` + `renderer.init()` before committing; any failure falls back to `WebGLRenderer` cleanly. Check the console for `[LobbyScene] WebGPU init failed...` if you see a black screen or visual corruption on a WebGPU-capable browser.
- **dpr adapts to real display refresh rate** (`useDeviceRefreshRate`) — ≥120Hz displays cap dpr at 1.5 instead of 2, since render cost scales with `width × height × dpr² × refresh rate` and a high-refresh display has less time budget per frame.

## Character GLB models (rigged + Idle)

```bash
npm run build:models
```

Writes one file per character into `public/models/`, self-verifying the output.

| File               | Character                       | Tris | Bones | Size   |
| ------------------ | ------------------------------- | ---- | ----- | ------ |
| `monkey-king.glb`  | Golden staff, tail, headband    | 734  | 23    | 134 KB |
| `pig-warrior.glb`  | Nine-tooth rake, pig ears/snout | 688  | 20    | 124 KB |
| `pilgrim-monk.glb` | Monk robes, ringed staff        | 936  | 20    | 160 KB |

All three share one skeleton layout and bone-naming scheme (different proportions only), so animation can move across characters later:

```
Root › Hips › Spine › Chest › Neck › Head
              ├ Shoulder_L/R › UpperArm › LowerArm › Hand
              ├ UpperLeg_L/R › LowerLeg › Foot
              └ Tail_1..3          (Monkey King only)
```

Weapons are vertex-bound directly to the `Hand_R` bone — no separate weapon node needed. Each model has one `Idle` `AnimationClip` (2.4s), built from `sin` waves at an integer cycle count per loop (first frame always equals the last — the build script checks this automatically). Tune per-character strength via `buildIdleClip(rig, { breathe, sway, tail, weightShift, phase })`.

Edit shape/proportions in [`tools/lib/characters.mjs`](tools/lib/characters.mjs); edit rig/skin/Idle pose in [`tools/lib/rig.mjs`](tools/lib/rig.mjs). Models use flat-shaded vertex colors, no textures — geometry-baked, so the low-poly look survives any loader.

## 2D art pipeline (sprites/backgrounds/icons) — WebP

Vite copies `public/` files verbatim at build time without touching them, so source exports from art tools are usually far larger than what the game actually displays. Every in-game image exists in two places:

- **`assets/raw/`** — original PNGs, git-tracked, **not deployed** (outside `public/`).
- **`public/{characters,ui,backgrounds}/`** — the WebP output `build:images` generates, committed to git (unlike `public/models/*.glb`, which is gitignored since nothing in `src/` currently loads it — different reason for each: one isn't committed because it isn't used, the other is committed because it's used in the game every day).

```bash
npm run build:images   # assets/raw/**/*.png -> public/**/*.webp via sharp
```

Skips paths already in `public/` whose `assets/raw/` source hasn't changed (mtime-compared) — `--force` reconverts everything.

**Adding new art**: drop the source PNG in `assets/raw/<characters|ui|backgrounds>/...`, run `npm run build:images`. Game code always references the path through [`publicUrl()`](src/lib/publicUrl.ts) (see [`src/game/walkKits.ts`](src/game/walkKits.ts)/[`spriteSequences.ts`](src/game/spriteSequences.ts)) — end the reference in **`.webp`**, not `.png`.

Source files nothing in code references (concept art, mid-edit working files) go in `assets/archive/`, not `assets/raw/`, so `build:images` doesn't process them into an unused `public/` file.

## Asset-prep scripts (Python, one-off)

`scripts/*.py` (9 files) prepare/lay out original sprite sheets before they enter the pipeline above — not run in CI or any `npm run build*` (Node-only). Needs Python 3 + deps installed separately:

```bash
pip install -r scripts/requirements.txt   # Pillow, numpy, scipy
python scripts/<script-name>.py
```

**Known manual gap**: `split_wukong_walk_sheets.py` writes `.png` output directly to `public/characters/walk/`, but the WebP pipeline above only converts `assets/raw/ → public/`, never touches pre-existing `.png` files there. Always run `build:images` afterward (or convert by hand) and delete the leftover `.png` before committing, or both extensions end up sitting in `public/` with nobody noticing.

## Structure

Folder + must-know-file level, not a full file index — that goes stale faster than anyone updates it. ⭐ = read before touching anything nearby.

```
src/
├─ App.tsx                    entry route: Title → Auth → NameModal → Lobby
├─ index.css                  every design token (color/spacing/motion) + reset
│
├─ pages/                     TitlePage (pre-login) · LobbyPage (layout + modal state)
│
├─ game/                      pure game logic, no React
│  ├─ realtimeBattle/         ⭐ the real combat system — runtime, fixed-tick loop, damage,
│  │                          hitboxes, combos, lunge, skills, enemy AI, stage config (near-total test coverage)
│  ├─ pvp/                    private-room PvP prototype — authority engine, reconciler, room repo
│  ├─ gacha/                  Gacha config/engine — NOTE: the live pull path is a Postgres RPC
│  │                          (`perform_gacha_pull`), not this module; see docs/agent-blueprint/23-gacha-system.md
│  ├─ progression/            Hero Level, Skill Level, Star Ascension, Talent/Awakening
│  ├─ heroes/                 per-hero attack chains, kits, stat scaling
│  ├─ adventure/              lobby-floor walking logic (WukongAdventure)
│  ├─ dialogue/ npc/ exploration/ flow/
│  │                          exploration mode — code is intact but has no entry point in the
│  │                          shipped game right now (deliberate, not a bug — see MEMORY.md)
│  ├─ characters.ts           ⭐ roster registry + IP policy + getCombatPower()
│  ├─ gameInfo.ts             ⭐ game name/version — **this number gates deploys**, see Release process
│  ├─ featureFlags.ts         ⭐ flags gating shipped-but-not-fully-live features (e.g. PvP backend)
│  └─ items.ts team.ts collection.ts frames.ts uid.ts
│
├─ hooks/
│  ├─ useAuth.ts              ⭐ the whole app's player-account state; every screen goes through this
│  ├─ useRealtimeBattle.ts    binds the combat runtime into React
│  ├─ usePvPRoom.ts           binds the PvP authority engine into React
│  ├─ useGameFlow.ts useExploration.ts useDialogue.ts
│  │                          paired with the exploration mode above — also no entry point yet
│  ├─ usePerformanceQuality.ts useDeviceRefreshRate.ts   adapt render quality to real FPS/Hz
│  ├─ useDeployWatcher.ts     detects a newer build is live (pairs with UpdateBanner)
│  └─ useModalA11y.ts         focus trap + focus return for every modal
│
├─ data/
│  ├─ accountRepository.supabase.ts   ⭐ the live backend — Supabase Auth+Postgres+RLS+RPC.
│  │                                  Every RPC name/param here is contract with a real migration
│  │                                  under supabase/migrations/ — a typo only fails at runtime.
│  ├─ accountRepository.ts    the original localStorage backend — kept as a dormant fallback,
│  │                          same exported function shape as the Supabase one on purpose
│  └─ mockPlayer.ts           MOCK_BADGES still used by LobbyPage
│
├─ lib/
│  ├─ errors/                 ⭐ codes.ts (error code registry) + reportError.ts — the only
│  │                          place allowed to call console.*; every catch routes through this
│  ├─ supabaseClient.ts       ⭐ the one Supabase client for the whole app — do not call
│  │                          createClient() anywhere else. PKCE flow, not implicit — see its own comments.
│  ├─ audio/                  AudioEngine (raw Web Audio, no library) + sound file registry
│  ├─ storage.ts              localStorage wrapper that never throws
│  ├─ saveFile.ts             save-file download — used by both Settings and the crash screen
│  ├─ publicUrl.ts            joins an asset path with the Vite base path (deploys under a subpath)
│  ├─ globalErrorHandlers.ts  catches errors outside React's render tree (R3F's useFrame skips ErrorBoundary)
│  └─ format.ts a11ySettings.ts performanceSettings.ts authUi.ts
│
├─ components/
│  ├─ GameViewport/           outermost frame every page lives inside
│  ├─ LobbyScene/              ⭐ the lobby's <Canvas> — WebGPU-first with WebGL2 fallback, context-loss handling
│  ├─ BattleScene/             ⭐ the whole combat room — canvas, HUD, joystick, attack/dodge/skill buttons,
│  │                           enemy health bars, damage numbers
│  ├─ LobbyBattleSession/     entry point from the lobby's battle button (the live path)
│  ├─ PvPRoom/                 private-room PvP modal — gated by src/game/featureFlags.ts
│  ├─ GachaModal/              live Gacha pull UI, wired to the server RPC
│  ├─ AdventureScene/          walkable lobby-floor character (2D/DOM, not WebGL)
│  ├─ ExplorationScene/ ExplorationControls/ DialogueBox/ BattleTransition/ GameExplorationSession/
│  │                            exploration mode — no entry point currently (see game/ above)
│  ├─ ErrorBoundary/ ErrorCodeTag/ Toast/ LoadingScreen/ UpdateBanner/
│  │                            player-facing status/error surfaces
│  ├─ AuthModal/ NameModal/ SettingsModal/ ProfileModal/ ItemsModal/
│  │  CurrencyShopModal/ AddFriendModal/ CharacterRoster/ CharacterPanel/
│  ├─ TopBar/ SideActions/ MainNavigation/ StartAdventure/ WorldChat/
│  └─ icons/GameIcons.tsx     all hand-drawn SVG icons
│
└─ types/player.ts            Player and related types
```

## Replacing a placeholder model with real 3D art

Current models are built from three.js primitives (boxes/cylinders/cones) specifically so they're easy to swap:

1. Drop the `.glb` at `public/models/<id>.glb`
2. Set `modelUrl: '/models/<id>.glb'` on the character's entry in `ROSTER`
3. Install `@react-three/drei` and replace `<PlaceholderRig>` in
   [`CharacterModel.tsx`](src/components/LobbyScene/CharacterModel.tsx) with `useGLTF` + `useAnimations`

The surrounding rig (slot positioning, click hitbox, selection ring, hover effects) is reusable as-is.

## Player accounts, currency, and the backend

The live backend is **Supabase** (Auth + Postgres + RLS + RPCs) via [`src/data/accountRepository.supabase.ts`](src/data/accountRepository.supabase.ts) — this has been true for months, not a future plan. A parallel localStorage-only implementation ([`accountRepository.ts`](src/data/accountRepository.ts)) still exists, exporting the exact same function shape, kept as a dormant fallback seam rather than deleted.

Every screen reads/writes player state (`player`, gold/gems, session) through [`src/hooks/useAuth.ts`](src/hooks/useAuth.ts) only — `App.tsx` owns `useAuth()` and passes `player` + callbacks down as props. No screen talks to `accountRepository`/Supabase directly outside that path, with the narrow exception of a few components importing _static config constants_ directly (`PASSWORD_MIN_LENGTH` in `AuthModal`, `GOLD_PACKAGES`/`GEM_PACKAGES` in `CurrencyShopModal`) — not player state, so bypassing `useAuth` for those specifically is fine.

**Currency and RPC rules (enforced at the Postgres layer, not just in TypeScript — see `supabase/migrations/`):**

- Gold: `earnGold(uid, 'quest' | 'drop' | 'battle' | ..., amount)` — the RPC's `source` allowlist is enforced server-side; a client can't invent a new source string and have it accepted.
- Gems: `topUpGems(uid, packageId)` (real-money purchase; payment gateway is not wired, treated as always-succeeding for now — **do not use for real transactions**) or `redeemCoupon(uid, code)`.
- No function sets currency directly — every grant is recorded in `currency_transactions` for audit and coupon-replay prevention.
- Gacha pulls, character grants, and item grants all go through their own `SECURITY DEFINER` RPCs with the same discipline: server-derived identity from the JWT, atomic debit, idempotency via a client-supplied request ID.

## IP policy

- Every model, icon, and image in this project is original — no external assets.
- Characters drawn from myth/history (Hanuman, Lu Bu, etc.) are public domain — **the designs themselves are original artwork.**
- No copyrighted character designs appear directly; where that constraint matters it's reinterpreted as an original character instead (e.g. "Astra Vale — Cosmic Force Warrior").
- Full detail lives in the header comment of [`src/game/characters.ts`](src/game/characters.ts).

## Notes

- The 3D scene is a separate, lazily-loaded chunk (HUD ~85 kB gzip, scene ~235 kB gzip).
- Respects `prefers-reduced-motion` (disables animation and camera drift).
- Respects mobile safe-area insets; breakpoints at 720px / 900px.

## GitHub repository settings (for whoever administers the org)

1. **Pages** (`Settings → Pages`): Source = **GitHub Actions**
2. **Branch protection** (`Settings → Branches`) on `master`:
   - Require a pull request before merging
   - Require status checks to pass (`Continuous Integration`)
   - Require branches to be up to date before merging
3. **Code security and analysis** (`Settings → Code security and analysis`): Dependabot alerts, Dependabot security updates, secret scanning, and CodeQL analysis all enabled.
