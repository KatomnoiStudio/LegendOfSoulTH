# MEMORY.md — Project State & History Journal

> **Operator / Human User**: `HetCreep`  
> **Repository**: `LegendofSoulTH/GameTurnBase`  
> **Default Branch**: `master`  
> **Last Updated**: 2026-08-06T02:20:00+07:00 by `Claude Code (HetCreep Agent)`  
> **RULES_VERSION: 4** (see `.agents/rules/rules-freshness-check.md`)

---

## 👤 Identity & System Context

- **System Owner / Developer**: `HetCreep`
- **Project Name**: GameTurnBase (Turn-based 2.5D RPG Lobby & Game Engine)
- **Primary Tech Stack**: React 19, TypeScript (Strict Mode), Vite 8, Three.js / React Three Fiber, Phaser 4, Oxlint

---

## 📜 Past Summary (สรุปอดีต)

1. **Lobby Scene & 2.5D Graphics Engine**:
   - Built 2.5D isometric fixed-camera lobby with `CameraRig`, 3 character standing slots (`left`, `center`, `right`).
   - Created procedural 3D GLB character models (`monkey-king.glb`, `pig-warrior.glb`, `pilgrim-monk.glb`) via `tools/build-models.mjs`.
   - Added `WukongAdventure` exploration mode with tile movement, directional sprites, and dust particle effects.
   - Built full HUD, character roster modal, profile modal, audio settings, and toast notifications system.

2. **Continuous Integration (CI/CD) & Automation Setup**:
   - Installed `.github/workflows/ci.yml` (Build, Typecheck, Lint on push/PR).
   - Installed `.github/workflows/deploy.yml` (Automatic GitHub Pages deployment).
   - Installed `.github/workflows/codeql.yml` (CodeQL Security Analysis).
   - Installed `.github/dependabot.yml` (Weekly npm and GitHub Actions updates).
   - Added Issue Templates (`bug_report.yml`, `feature_request.yml`) and `PULL_REQUEST_TEMPLATE.md`.

3. **Strict Settings & Branch Consolidation**:
   - Updated `tsconfig.app.json` with `"strict": true`, `"noImplicitReturns": true`, `"noFallthroughCasesInSwitch": true`.
   - Updated `.oxlintrc.json` with recommended rulesets and disabled `react-in-jsx-scope` for React 19 automatic JSX transform.
   - Set Vite `base: '/GameTurnBase/'` for GitHub Pages.
   - Consolidated repository to a single branch: `master`.
   - Merged initial Dependabot PRs #1 through #7.

4. **GitHub Security Enforcement (Enabled by HetCreep)**:
   - Full GitHub Security suite enabled at `https://github.com/LegendofSoulTH/GameTurnBase/security`.
   - Active: Dependabot Alerts, Automated Security Updates, Secret Scanning, and CodeQL Vulnerability Analysis.

5. **Automated Security Workflows**:
   - Added `.github/workflows/security-scan.yml` (Gitleaks secret leak detection + daily NPM audit).
   - Added `"audit": "npm audit --audit-level=high"` script to `package.json`.

6. **Player Accounts + Gold/Gem Currency System** (commit `c019bb7`, merged via `0ff3f92`; refined further in `6157f89`/`0a66592`):
   - Built `src/data/accountRepository.ts` as the "database" (localStorage-backed, no server yet).
     Stores accounts (uid/email/password hash+salt), each with a `player: Player` and a
     `transactions: CurrencyTransaction[]` audit ledger.
   - **Hard rule enforced at the API layer**: gold can ONLY be credited via
     `earnGold(uid, 'quest' | 'drop', amount)`; gems can ONLY be credited via
     `topUpGems(uid, packageId)` or `redeemCoupon(uid, code)`. No generic setGold/setGem exists
     anywhere — every credit is logged with its source for auditability and coupon-reuse checks.
   - `useAuth.ts` is the single hook every screen talks to (`register/login/logout/updatePlayer/
     earnGold/topUpGems/redeemCoupon`) — no component calls `accountRepository` or `localStorage`
     directly.
   - `TopBar` gem "+" opens `GemShopModal` (3 static package tiers, **no real payment gateway
     wired — always succeeds, demo only**). The earlier demo gold "collect drop" button was
     removed from `TopBar` (`0a66592`) — no real quest/drop system exists yet to back it, so it
     was pulled rather than left as a fake action.
   - `SettingsModal`'s previously non-functional "คูปอง" tab now actually calls `redeemCoupon`.
     Seeded test code: `WELCOME2026` → 50 gems, one redemption per account.
   - `src/hooks/usePlayer.ts` confirmed **dead code** — `App.tsx` uses `useAuth` exclusively;
     `usePlayer` is leftover mock-hook scaffolding, not part of the live data path.
   - `README.md` rewritten to match current reality (was claiming "no login/backend" — false).
   - `vite.config.ts` `base` is now conditional on `command` (`'/GameTurnBase/'` only when
     `command === 'build'`, `'/'` in dev) — dev server was 404ing every `public/` asset
     (icons, character art, `.glb` files) because it was serving under `/GameTurnBase/` too.

7. **ECC Coding Rules Installed** (2026-08-05):
   - Pulled `rules/common`, `rules/typescript`, `rules/react`, `rules/web` (27 files) from [affaan-m/ECC](https://github.com/affaan-m/ECC) into `.agents/rules/ecc/` (project-level, cross-tool home — not `.claude/`, since VS Code/Copilot reads `AGENTS.md` natively but has no notion of `.claude/`).
   - Skipped language sets not used by this stack (golang, python, vue, angular, php, etc).
   - Referenced from `AGENTS.md` rule 5.

8. **CoalMine gold-standard AUDIT + FILL** (2026-08-05), Full run, 11 dimensions, ~25% overall (not inflated):
   - Worst: Testing/CI 0% (no framework/tests at all), Observability 5% (no error boundary/crash reporting), Governance 13% (ECC MIT copyright notice was missing — active license-term gap), Performance 15%, Compatibility 15%, Error handling 15%.
   - Best: Security 55% (scanning infra genuinely solid — Gitleaks/CodeQL/Dependabot all wired), DX/Docs 45%, Maintainability 44% (docs describe hooks that were never wired to `.claude/settings.json`).
   - **FILL applied**: `.agents/rules/ecc/LICENSE` (MIT notice, closes the governance gap) · `.agents/rules/ecc/README.md` (layer precedence, including sibling-layer rule not in upstream) · `.agents/rules/ecc/PROJECT-OVERRIDES.md` (documents where imported rules assume pnpm/eslint/prettier/stylelint/process.env/agents that don't exist here — this repo uses npm + oxlint only, Vite `import.meta.env`) · `.agents/rules/ecc/react/performance.md` (new — R3F/Phaser/GLB-compression, not in upstream) · `.agents/rules/ecc/web/observability.md` (new — error boundary/crash reporting/WebGL context-loss/error-handling convention) · `.agents/rules/ecc/web/compatibility.md` (new — WebGL capability check/browser floor/mobile).
   - **Open item — needs a human decision, not auto-filled**: this project (`LegendofSoulTH/GameTurnBase`) has no `LICENSE` file of its own. Distinct from the `.agents/rules/ecc/LICENSE` above (that one covers only the vendored ECC rule text). Ask HetCreep.
   - **ADOPT**: done — ruleset treated as binding this session.
   - **CONFORM applied** (all 11 violations, user approved "ทั้งหมด"): every fix checkpointed with `npm run typecheck && npm run lint && npm run test && npm run build` passing green before moving to the next.
     - `src/components/ErrorBoundary/ErrorBoundary.tsx` (new) + `src/lib/globalErrorHandlers.ts` (new), wired into `src/main.tsx` — global crash net (React render errors + `window.error`/`unhandledrejection`).
     - `src/components/LobbyScene/LobbyScene.tsx` — WebGL2 availability check before `<Canvas>` mount, `webglcontextlost`/`webglcontextrestored` handling.
     - `src/lib/storage.ts`, `src/pages/TitlePage.tsx`, `src/components/ProfileModal/ProfileModal.tsx` — silent catches now `console.error`/`console.warn`/`console.debug` before falling back.
     - `.github/workflows/{ci,deploy,codeql,security-scan}.yml` — all `uses:` pinned to full commit SHA (verified live via `gh api`, tag comment kept for readability); `deploy.yml` build job now runs `npm run lint` too (was build-only, so lint failures could ship); `deploy.yml` job-level `permissions` split (build: `contents:read,pages:write`; deploy: `pages:write,id-token:write` — was workflow-level, broader than needed).
     - **Vitest installed** (`vitest ^4.1.10` + `jsdom ^30.0.1`, config merged into `vite.config.ts`), `npm run test` script, wired into `npm run ci` and `.github/workflows/ci.yml`. First real test: `src/lib/format.test.ts` (5 tests, passing) — proves the framework works end-to-end; does **not** claim coverage of game logic, that's still a backlog item.
     - `package.json` — added `browserslist` (evergreen Chrome/Firefox/Safari/Edge, last 2 versions).
   - **Deliberately skipped** (flagged, not silently dropped):
     - GLB Draco/Meshopt compression in `tools/build-models.mjs` — needs a matching client-side decoder change in the model loader too; no way to verify visually (no browser test), risk of silently breaking character rendering was judged too high to auto-apply blind.
     - `.claude/settings.json` PostToolUse lint hook — blocked by the Claude Code auto-mode classifier (self-modifying its own hook config); needs explicit user approval to write.

9. **Ring System + Rules Freshness Check installed** (2026-08-05):
   - `.agents/rules/ring0-authority.md` (new) — Ring 0 = HetCreep's own machine (marker: gitignored `.agents/ring0.local`, matches existing `*.local` glob, never reaches GitHub — verified via `git check-ignore`). Ring 1 = every other clone; must conform code to Ring-0-declared rules, never edit the rules to fit the code, must flag disagreement instead of silently overriding.
   - `.agents/rules/rules-freshness-check.md` (new) — cheap two-number tripwire (`AGENTS.md` `RULES_VERSION` vs this file's `RULES_VERSION last synced:`) so a new rule landing mid-project doesn't silently go unread by an agent running on stale context. Mismatch forces a full re-read of `AGENTS.md` + `.agents/rules/**`, not a skim.
   - `AGENTS.md` — added `RULES_VERSION: 1` header, a new "§0 Before anything else" section, and mandate #6 pointing to the Ring policy.
   - `.gitignore` — added explicit `.claude/coalhearth/` and `.claude/coalwash/` entries (tool-internal session state; was already untracked, this is defense-in-depth so a future `git add -A` can't catch them).
   - **Explicit limitation, stated to HetCreep**: this is agent-instruction-level governance (markdown a compliant agent reads and follows), not a cryptographic access control. It cannot stop a non-compliant tool or a human editing files by hand — its job is to keep every rule-reading agent (Claude Code, Copilot, etc.) aligned on whose call is authoritative, not to enforce it at the OS/git level.

10. **Merged concurrent session work + pushed to `origin/master`** (2026-08-06): items 6 (this machine's clone was behind) and items 7–9 (this session's own work) landed in parallel on two machines. Merged by hand (`vite.config.ts`: kept both the `command`-conditional `base` fix and the new `test` block; `MEMORY.md`: renumbered/interleaved both timelines; `ProfileModal.tsx` auto-merged clean — the earlier session's edits and this session's `console.warn`-before-swallow fix touched non-overlapping lines). Full verify (`typecheck && lint && test && build`) re-run green after the merge before push.
   - **Deploy fixed too**: GitHub Pages had never been enabled on the repo (`configure-pages` 404'd on every deploy run, unrelated to code) — enabled via `gh api POST /repos/.../pages build_type=workflow`. A second concurrent push landed mid-deploy (`ead2fca`, another gold top-up button) and merged automatically with this session's push; the resulting run (`1a5d7d7`) deployed successfully — https://legendofsoulth.github.io/GameTurnBase/ live.

11. **Pre-Push Sync Law codified** (2026-08-06), `RULES_VERSION` → 2:
    - `.agents/rules/pre-push-sync-law.md` (new) — turns the procedure from item 10 into a binding rule for every machine (Ring 0 included, since this is code hygiene not an authority question): `fetch` → check ahead/behind → merge if behind → resolve conflicts **by hand, preserving both sides' work** (never blind `--ours`/`--theirs`, never silently drop the other side's committed changes) → full `typecheck && lint && test && build` green → only then push.
    - `AGENTS.md` — mandate #7 added, `RULES_VERSION` bumped 1→2.

12. **CI cleanup + broken images fixed live** (2026-08-06):
    - **Gitleaks license paywall**: `gitleaks/gitleaks-action@v2` requires a paid `GITLEAKS_LICENSE` for org-owned repos (this repo is under `LegendofSoulTH`) — every run had been failing on this since the action was first added, unrelated to any code. Fixed by running the free/OSS `gitleaks` CLI directly (`.github/workflows/security-scan.yml`: download `v8.30.1` linux_x64, checksum-verified, `gitleaks detect`) instead of the Action wrapper. Confirmed green.
    - `.coalmine.json` (new, project-level) — `scanExcludePaths` keeps rot-canary's auto-scan budget off pure docs (`**/*.md`, `.agents/rules/**`) and `.github/**`.
    - **`paths-ignore` added to `ci.yml`/`codeql.yml`/`deploy.yml`** (docs/rules/`.coalmine.json` changes no longer burn a build+typecheck+lint+test+deploy cycle) — deliberately **not** added to `security-scan.yml`, since gitleaks needs to scan docs too (a secret pasted into a `.md` file is still a leak).
    - **Broken images fixed (live, user-reported via screenshot)**: `url('/ui/...')` in CSS and `<img src="/ui/...">` in JSX resolve against the domain root, not the app base — fine in dev (`base: '/'`) but 404 once built for GitHub Pages (`base: '/GameTurnBase/'`). Every background/icon image on the deployed site was broken. Added `src/lib/publicUrl.ts` (prefixes with `import.meta.env.BASE_URL`, the Vite-documented fix) and applied it at all 12 call sites across `WukongAdventure`, `LobbyScene`, `StartAdventure`, `TopBar`, `TitlePage`, `SideActions` (CSS backgrounds via inline `--custom-property` style props, `<img>` tags directly). Verified against the live deployed bundle (`GameTurnBase` prefix + path segments both present) after redeploy.
    - Full verify (`typecheck && lint && test && build`) green before every push in this batch, per the Pre-Push Sync Law above. rot-canary QUICK on the touched files: no CONFIRMED findings.

13. **Ring 0 fixed for cloud agents** (2026-08-06), `RULES_VERSION` → 3, `.agents/rules/ring0-authority.md` rewritten:
    - **Gap found by HetCreep**: the original version gated Ring 0 (and the "HetCreep's live instruction always wins" clause) on `.agents/ring0.local` alone — a gitignored local-only file. A cloud/hosted agent session (GitHub Copilot coding agent, Claude Code cloud, etc.) is an ephemeral clone that never has that file, so it would've read as Ring 1 even when HetCreep was the one directly driving it.
    - **Fix**: Ring 0 is now determined by *either* signal — the local marker (fast path for a persistent machine) *or* git identity (`git config user.name`/`user.email`, or the authenticated actor via `gh api user`) matching HetCreep. Git identity travels with a cloud session authenticated under HetCreep's own account, the local file doesn't.
    - **Also decoupled**: "HetCreep's live instruction always wins" no longer requires the Ring-0 marker specifically — it fires whenever the live human in the session is confirmed as HetCreep by either signal, or by the platform's own session context. Ring marker vs. live-instruction-override were conflated before; they're separate concerns now.

14. **ponytail-audit cleanup + README refresh + AuthModal Esc** (2026-08-06):
    - Repo-wide over-engineering scan (ponytail-audit): removed `phaser` dependency (^4.2.1, 116MB, zero imports anywhere in `src/` or the build output — game runs on R3F only) and dead `src/hooks/usePlayer.ts` (+ its only consumer `MOCK_PLAYER` in `mockPlayer.ts`, `MOCK_BADGES` kept). Bundle size byte-identical before/after — confirms phaser was never actually bundled.
    - `README.md` brought back in sync: removed stale `usePlayer.ts` references, fixed the gold "+" description (demo "collect drop" button was removed earlier — both gold and gem "+" now open `GemShopModal`), added live site link + `security-scan` badge + missing npm scripts (`typecheck`/`test`/`ci`) + new files (`ErrorBoundary`, `publicUrl`, `globalErrorHandlers`), corrected bundle-size numbers, added a pointer to `AGENTS.md`/`MEMORY.md`.
    - `AuthModal.tsx`: Esc previously did nothing (modal is intentionally non-dismissible — must have an account before entering the game, per the file's own header comment). Per HetCreep's direction, kept that design but made Esc do something instead of being dead input: it now toggles the register/login tab.
    - Full verify green + rot-canary QUICK clean on every change in this batch.

15. **Battle/exploration/dialogue/NPC system merged from `nustanakritwithai/Hih#11`** (2026-08-06):
    - **Source**: external PR (447 files, +15,113/-0) from a *different, unrelated* repo (not a fork of this one — confirmed via `gh api`) built by a Cursor background agent for `nustanakritwithai/Hih`, claiming integration with "latest `LegendofSoulTH/GameTurnBase`". Treated as untrusted third-party code per `.agents/rules/ring0-authority.md` Ring 1 obligations — investigated before touching anything, nothing merged blind.
    - **Investigation found the true diff was tiny**: 330 of 447 files were pre-existing image assets already in this repo; ~100 code files were mostly the PR's *older* snapshot of files we'd already fixed this session (CRLF-vs-LF made `diff` initially misreport ~1200-line rewrites that were actually ~10-line real differences — always `diff --strip-trailing-cr` when comparing against a non-Windows checkout). After normalizing: 40 genuinely new files, 22 files with real (small) differences, 5 files where PR was strictly behind our session's own fixes (kept ours, e.g. `usePlayer.ts` resurrected as dead code — deleted again).
    - **Pulled in as new**: `game/battle/*` (engine/ai/formulas/skills/stages/combatants), `game/dialogue/*`, `game/exploration/*`, `game/npc/*`, `game/flow/GameFlowController.ts`, components `BattleScene`/`BattleTransition`/`DialogueBox`/`ExplorationControls`/`ExplorationScene`/`GameExplorationSession`, hooks `useBattle`/`useDialogue`/`useExploration`/`useGameFlow`, `lib/authUi.ts` (remember-last-email).
    - **Reconciled by hand** (not blind overwrite): `types/player.ts` (+`PlayerProgress`/`BattleRecord`/`EMPTY_PROGRESS`), `accountRepository.ts` (+`normalizePlayer()` backfill for pre-existing accounts), `LobbyPage.tsx` (swapped full-screen `WukongAdventure` "trial" mode for `GameExplorationSession` on the battle button; **deliberately dropped** the PR's `onEarnGold`/demo-gold-drop wiring — confirmed via grep that the new battle system never calls `earnGold`, only mutates `progress`, so reintroducing it would have resurrected the exact demo button kaoshock123 removed), `MainNavigation.tsx` (+`onOpenBattle`), `ProfileModal.tsx`+css (real battle-history list + a genuine bug fix: character count now reads `player.ownedCharacters.length` instead of the global `ROSTER.length`), `AuthModal.tsx` (remember-last-email UX — kept our Esc-tab-switch fix, improved on the PR's own logic by defaulting to the login tab only when a last-used email actually exists).
    - **Second `publicUrl` sweep — found the same subpath-404 bug in more places**: `game/walkKits.ts`, `game/characters.ts`, `game/spriteSequences.ts`, `components/LobbyScene/CharacterModel.tsx` (all **pre-existing**, not from the PR — missed in the original sweep because the paths live in data/config objects, not literal JSX `src=`/CSS `url()`) plus the new `game/npc/npcs.ts`, `game/battle/stages.ts`, `game/exploration/maps.ts`, `DialogueBox.tsx`, `ExplorationScene.tsx`. All fixed with `publicUrl()`.
    - **Verified in-browser** (dev server): full flow Title → Register → NameModal → Lobby → "ต่อสู้" opens `GameExplorationSession` (map + NPCs + movement controls render, exit returns cleanly to Lobby) → no console errors. `.claude/launch.json` added for future `preview_start`-based dev-server checks.
    - Full verify (`typecheck && lint && test && build`) green; bundle now 129 modules (was 95).
    - Second merge round with `kaoshock123`'s concurrent items-system commit (`5bd7685`): resolved a duplicate `normalizePlayer()` (both sides independently added a same-named function at different line numbers — auto-merge didn't flag it as a conflict since the lines didn't textually overlap, but it was a real duplicate-declaration bug); merged so it backfills both `progress` and `inventory`. Also resolved `MainNavigation.tsx`/`LobbyPage.tsx` conflicts (`onOpenBattle` + `onOpenItems` coexist). Full verify green, pushed.

16. **False-positive bug investigation + commit-granularity law** (2026-08-06), `RULES_VERSION` → 4:
    - **HetCreep reported**: registered account not persisting on production ("cache data หาย"). Investigated by scripting the live site — found what looked like a real repro (form stuck, no localStorage write) using raw `dispatchEvent(new Event('input'))` to fill the form. Root cause of *that* symptom: React 19's controlled inputs don't reliably pick up state from a raw synthetic `Event('input')` in this browser-automation context — the DOM value visually changed but React's internal `email`/`password` state stayed empty, so submission correctly (silently, from my test's perspective) failed client-side validation.
    - **Re-tested with the proper tool** (`form_input`, which sets values in a React-compatible way): registration succeeded, `los:db:v1`/`los:session:v1`/`los:last-email` all written, **survived a full page reload**, correctly resumed to the name-entry step. **No app bug found** — production register/session persistence works correctly as verified. If HetCreep still sees the symptom, need repro specifics (private/incognito mode? different browser/tab? extension blocking storage?) — the app-side investigation is exhausted without a reproducible defect.
    - **HetCreep also asked**: is `kaoshock123`'s agent actually reading `MEMORY.md`/`AGENTS.md`? Checked git history: `AGENTS.md` (with `RULES_VERSION`/mandates) became an ancestor of their tree at merge `1a5d7d7` (23:22) — confirmed via `git merge-base --is-ancestor`. Their next 4 commits (`f8f87c5` through `5bd7685`, spanning ~1 hour) never touched `MEMORY.md` despite mandate #1/#2. **Not a rule-design flaw** — `ring0-authority.md` already states this is markdown convention, not a technical control; it simply confirms their tooling isn't reading/following `AGENTS.md`, which we can observe but not fix from this side.
    - **New rule**: `.agents/rules/commit-granularity-law.md` — one completed task = one commit (don't split a finished task across partial "wip"/"fix typo" commits; don't squash unrelated tasks together either; merge commits are exempt).
    - **Letterbox decision reversed**: HetCreep re-decided — remove the fixed-1600×900 letterbox scaling (`GameViewport`) in favor of fluid full-width layout. Flagged as a substantial redesign (every component built assuming the fixed stage), scoped as separate follow-up work, not done in this same turn.

17. **`SECURITY.md` added** (2026-08-06): GitHub private vulnerability reporting was already enabled on the repo (confirmed via `gh api .../private-vulnerability-reporting`) — just needed the policy doc for the Security tab to show it. Written from scratch for this project's actual shape (client-only, no backend, GitHub Pages) rather than adapted from `.agents/rules/ecc/`'s upstream template (that one is scoped to the ECC npm package/tooling ecosystem, wrong fit). Explicitly lists the documented, intentional limitations (client-editable localStorage, demo-only PBKDF2 auth, no real payment gateway) as **out of scope** so they don't get filed as vulnerabilities against a known, disclosed design.

18. **`.coalmine.json` fix + GitHub Marketplace picks** (2026-08-06):
    - Fixed `.coalmine.json`: commit `ad259e5` (authored by HetCreep, message said "restore .github to ignore list") had actually *removed* `.github/workflows/**`/`.github/**` from `scanExcludePaths`. Put them back.
    - Researched GitHub Marketplace for genuinely useful, low-friction additions (not blanket-installing everything): picked **Dependency Review** (official `actions/dependency-review-action`, blocks PRs adding high-severity-vuln deps, PR-comment summary) and **Harden-Runner** (`step-security/harden-runner`, `egress-policy: audit` — logs network egress on every job, non-blocking for now; relevant given the Hih#11 external-code merge earlier this session) — added to all 4 workflows, SHA-pinned per this repo's existing convention.
    - **bundle-stats**: HetCreep didn't want to sign up for an external baseline service (relative-ci.io) — implemented a **zero-signup** version instead: a `Report bundle size` step in `ci.yml` that writes `du -h` output to `$GITHUB_STEP_SUMMARY` on every run. No PR diff-comment, but zero new accounts and the trend is visible in Actions run history.
    - **Sentry / remote error tracking**: explicitly **not** added. Every real option (Sentry, Rollbar, Airbrake, Honeybadger) requires a third-party account by definition (remote visibility needs a remote endpoint) — verified via marketplace research, Rollbar's free tier (5,000 events/mo) is the lowest-friction if HetCreep wants to revisit later. **Declined outright**: auto-filing GitHub Issues from client-side JS as a Sentry substitute — would require embedding a repo-write GitHub token in the public bundle, a real secret-exposure vulnerability, not something to build regardless of how many times asked.

19. **`.coalmine.json` untracked from git entirely** (2026-08-06): after two rounds of flip-flopping the `.github/` entry inside it, HetCreep clarified the real objection was the *whole file* being on GitHub at all — it's a personal rot-canary tuning knob, not a team-shared contract (unlike `.oxlintrc.json`/`tsconfig.json`, which genuinely need to be identical for every contributor). `git rm --cached .coalmine.json` + added to `.gitignore` (same pattern as `.claude/coalhearth/`/`.claude/coalwash/`). File still exists locally on this machine and still works — just no longer tracked/pushed. **Consequence for other machines/Ring 1**: rot-canary now falls back to whatever `~/.claude/.coalmine.json` (home-level) or CoalMine's own defaults say for scan-exclusion scope — this project no longer ships a shared override. If a future session wants the doc-exclusion behavior team-wide again, it needs to be re-added deliberately (not by accident via `git add -A`).

---

## 🎯 Current Status (สถานะปัจจุบัน)

- **Repo Status**: 🟢 Clean & Synced (`origin/master` @ `b93b025`)
- **CI Pipelines**: 🟢 All green (Build/Typecheck/Lint, CodeQL, Security & Secret Scan, Deploy) — Gitleaks license-paywall failure fixed (item 12)
- **Security & Protection**: 🛡️ 100% Enabled & Monitored (CodeQL + Dependabot + Secret Scanning + Gitleaks + NPM Audit)
- **Deployment**: 🟢 Live on GitHub Pages — https://legendofsoulth.github.io/GameTurnBase/
- **Remote check**: `git remote -v` on this machine correctly points `origin` at `https://github.com/LegendofSoulTH/GameTurnBase.git` — the "remote mismatch" flagged in the prior concurrent session's notes was local to that machine/clone (remote URLs are per-clone git config, never part of repo content) and doesn't apply here; no action needed on this machine.
- **Player accounts/currency**: functional locally (see Past Summary item 6) but entirely client-side — no real backend, no payment gateway. Do not treat as production-ready for real money or cross-device play.
- **Open/next work**: no quest system, no real drop table, no shop UI beyond `GemShopModal`, no battle system. Project's own `LICENSE` file still undecided (see item 8).
- **RULES_VERSION last synced: 4** (`.agents/rules/rules-freshness-check.md`)
- **Ring**: this machine is Ring 0 (`.agents/ring0.local` present, gitignored). Any other clone is Ring 1 by default — see `.agents/rules/ring0-authority.md`.
- **Pre-push sync**: `.agents/rules/pre-push-sync-law.md` — binding on every machine before every push.

---

## 📌 Agent Rules & Memory Mandates (กฎเหล็ก Agents)

- Every agent working on this workspace MUST inspect `MEMORY.md` before starting tasks.
- Every agent MUST update `MEMORY.md` upon completing major tasks, stamping with timestamp and identity (`HetCreep` operator).
- Every agent MUST run the freshness check (`AGENTS.md` §0) before any edit — compare `RULES_VERSION` here vs `AGENTS.md`'s header.
- Ring 1 agents (any machine without `.agents/ring0.local`) treat `AGENTS.md` + `.agents/rules/**` as binding — code conforms to rules, never the reverse. Full policy: `.agents/rules/ring0-authority.md`.
