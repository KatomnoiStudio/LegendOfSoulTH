# MEMORY.md — Project State & History Journal

> **Operator / Human User**: `HetCreep`  
> **Repository**: `LegendofSoulTH/GameTurnBase`  
> **Default Branch**: `master`  
> **Last Updated**: 2026-08-06T00:05:00+07:00 by `Claude Code (HetCreep Agent)` — merge of concurrent work from `Claude Sonnet 5 (Claude Code Agent)` session (commits `6157f89`, `0a66592`)  
> **RULES_VERSION: 1** (see `.agents/rules/rules-freshness-check.md`)

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

---

## 🎯 Current Status (สถานะปัจจุบัน)

- **Repo Status**: 🟢 Clean & Synced (`origin/master`) — working tree matches `HEAD` after merge, no pending changes
- **CI Pipelines**: 🟢 Passing (Typecheck 0 errors, Lint 0 errors, Test 5/5, Build clean) — re-verified after merge
- **Security & Protection**: 🛡️ 100% Enabled & Monitored (CodeQL + Dependabot + Secret Scanning + Gitleaks + NPM Audit)
- **Deployment**: Configured for GitHub Pages (`/GameTurnBase/`)
- **Remote check**: `git remote -v` on this machine correctly points `origin` at `https://github.com/LegendofSoulTH/GameTurnBase.git` — the "remote mismatch" flagged in the prior concurrent session's notes was local to that machine/clone (remote URLs are per-clone git config, never part of repo content) and doesn't apply here; no action needed on this machine.
- **Player accounts/currency**: functional locally (see Past Summary item 6) but entirely client-side — no real backend, no payment gateway. Do not treat as production-ready for real money or cross-device play.
- **Open/next work**: no quest system, no real drop table, no shop UI beyond `GemShopModal`, no battle system. Project's own `LICENSE` file still undecided (see item 8).
- **RULES_VERSION last synced: 1** (`.agents/rules/rules-freshness-check.md`)
- **Ring**: this machine is Ring 0 (`.agents/ring0.local` present, gitignored). Any other clone is Ring 1 by default — see `.agents/rules/ring0-authority.md`.

---

## 📌 Agent Rules & Memory Mandates (กฎเหล็ก Agents)

- Every agent working on this workspace MUST inspect `MEMORY.md` before starting tasks.
- Every agent MUST update `MEMORY.md` upon completing major tasks, stamping with timestamp and identity (`HetCreep` operator).
- Every agent MUST run the freshness check (`AGENTS.md` §0) before any edit — compare `RULES_VERSION` here vs `AGENTS.md`'s header.
- Ring 1 agents (any machine without `.agents/ring0.local`) treat `AGENTS.md` + `.agents/rules/**` as binding — code conforms to rules, never the reverse. Full policy: `.agents/rules/ring0-authority.md`.
